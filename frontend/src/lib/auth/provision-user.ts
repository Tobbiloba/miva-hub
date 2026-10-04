import "server-only";
import { pgDb } from "lib/db/pg/db.pg";
import { UserSchema } from "lib/db/pg/schema.pg";
import { eq } from "drizzle-orm";
import { auth } from "./server";
import { withSignupAssignment } from "./signup-context";
import type { SignupAssignment } from "./signup-policy";

/** Profile columns a caller may set; tenant/role/trial come from the policy. */
export type ProvisionProfile = Omit<
  Partial<typeof UserSchema.$inferInsert>,
  | "id"
  | "email"
  | "name"
  | "password"
  | "emailVerified"
  | "universityId"
  | "role"
  | "trialStartedAt"
  | "trialEndsAt"
>;

/**
 * Create an email/password user server-side (admin-created accounts) through
 * better-auth's internal adapter: its configured password hasher, the
 * `credential` account row sign-in verifies against, and the user-create hook
 * that assigns tenant/role/trial. No verification email is sent.
 *
 * Returns the full user row (callers strip `password` before responding).
 */
export async function createCredentialUser(params: {
  email: string;
  name: string;
  password: string;
  assignment: SignupAssignment;
  /** Admin-created accounts are pre-verified (no verification email flow). */
  emailVerified?: boolean;
  profile?: ProvisionProfile;
}): Promise<typeof UserSchema.$inferSelect> {
  const ctx = await auth.$context;
  const passwordHash = await ctx.password.hash(params.password);

  const created = await withSignupAssignment(params.assignment, () =>
    ctx.internalAdapter.createUser({
      email: params.email.toLowerCase().trim(),
      name: params.name.trim(),
      emailVerified: params.emailVerified ?? true,
    }),
  );
  if (!created) throw new Error("Failed to create user");

  // better-auth's drizzle adapter runs without a transaction; undo the user
  // row if the rest fails so we never leave an account that cannot sign in.
  try {
    await ctx.internalAdapter.linkAccount({
      userId: created.id,
      providerId: "credential",
      accountId: created.id,
      password: passwordHash,
    });

    const profile = params.profile ?? {};
    const [row] =
      Object.keys(profile).length > 0
        ? await pgDb
            .update(UserSchema)
            .set({ ...profile, updatedAt: new Date() })
            .where(eq(UserSchema.id, created.id))
            .returning()
        : await pgDb
            .select()
            .from(UserSchema)
            .where(eq(UserSchema.id, created.id))
            .limit(1);
    return row;
  } catch (error) {
    await ctx.internalAdapter.deleteUser(created.id).catch(() => {});
    throw error;
  }
}
