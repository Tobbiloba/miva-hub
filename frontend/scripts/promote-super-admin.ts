/**
 * Promote a user to platform super_admin (cross-tenant operator).
 *
 * Usage: pnpm tsx scripts/promote-super-admin.ts user@example.com
 *
 * super_admins belong to no university, so universityId is cleared.
 */
import "load-env";
import { eq } from "drizzle-orm";

async function main() {
  const email = process.argv[2]?.toLowerCase().trim();
  if (!email) {
    console.error("Usage: pnpm tsx scripts/promote-super-admin.ts <email>");
    process.exit(1);
  }

  const { pgDb } = await import("lib/db/pg/db.pg");
  const { UserSchema } = await import("lib/db/pg/schema.pg");

  const [updated] = await pgDb
    .update(UserSchema)
    .set({ role: "super_admin", universityId: null, updatedAt: new Date() })
    .where(eq(UserSchema.email, email))
    .returning({ id: UserSchema.id, email: UserSchema.email });

  if (!updated) {
    console.error(`No user found with email ${email}`);
    process.exit(1);
  }

  console.log(`✅ ${updated.email} (${updated.id}) is now super_admin`);
  process.exit(0);
}

main();
