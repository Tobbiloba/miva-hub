import { auth } from "@/lib/auth/server";
import { pgDb } from "@/lib/db/pg/db.pg";
import { pgUniversityRepository } from "@/lib/db/pg/repositories/university-repository.pg";
import { UniversitySchema, UserSchema } from "@/lib/db/pg/schema.pg";
import { checkRateLimit } from "@/lib/rate-limit";
import { emailDomain } from "@/lib/tenant";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const DOMAIN_REGEX =
  /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

const registerUniversitySchema = z.object({
  universityName: z
    .string()
    .min(3, "University name is too short")
    .max(120, "University name is too long"),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(
      /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/,
      "Slug must be lowercase letters, numbers and hyphens",
    ),
  emailDomains: z
    .array(
      z
        .string()
        .trim()
        .toLowerCase()
        .regex(DOMAIN_REGEX, "Invalid email domain (e.g. school.edu.ng)"),
    )
    .min(1, "At least one email domain is required")
    .max(5, "At most 5 email domains"),
  supportEmail: z.string().email("Invalid support email"),
  adminName: z.string().min(2, "Admin name is required").max(100),
  adminEmail: z.string().email("Invalid admin email"),
  adminPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128),
  termsAccepted: z
    .boolean()
    .refine((v) => v === true, "You must accept the Terms of Service"),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limit: university registration is a heavyweight public endpoint
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    const rate = checkRateLimit(`uni-register:${ip}`, 5, 3600);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later." },
        { status: 429 },
      );
    }

    const body = await request.json();
    const data = registerUniversitySchema.parse(body);

    const domains = [...new Set(data.emailDomains)];

    // The admin's email must be on one of the claimed domains — this is
    // the first line of proof that the registrant controls the institution.
    const adminDomain = emailDomain(data.adminEmail);
    if (!adminDomain || !domains.includes(adminDomain)) {
      return NextResponse.json(
        {
          error:
            "Your admin email must use one of the university email domains you are registering",
        },
        { status: 400 },
      );
    }

    // Slug must be unique
    const existingSlug = await pgUniversityRepository.findBySlug(data.slug);
    if (existingSlug) {
      return NextResponse.json(
        { error: `The URL identifier "${data.slug}" is already taken` },
        { status: 409 },
      );
    }

    // Domains must not be claimed by another university (any status)
    const claimed = await pgUniversityRepository.findClaimedDomain(domains);
    if (claimed) {
      return NextResponse.json(
        {
          error: `The email domain "${claimed}" is already registered to another university. Contact support if you believe this is an error.`,
        },
        { status: 409 },
      );
    }

    // Admin email must not belong to an existing user
    const [existingUser] = await pgDb
      .select({ id: UserSchema.id })
      .from(UserSchema)
      .where(eq(UserSchema.email, data.adminEmail.toLowerCase().trim()))
      .limit(1);
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this admin email already exists" },
        { status: 409 },
      );
    }

    // 1. Create the university in "pending" status — domain-based student
    // signup stays closed until a super admin approves it.
    const university = await pgUniversityRepository.create({
      name: data.universityName.trim(),
      slug: data.slug,
      emailDomains: domains,
      supportEmail: data.supportEmail.toLowerCase().trim(),
      status: "pending",
    });

    // 2. Create the admin account via better-auth. If this fails, roll
    // back the university row so the slug/domains aren't orphaned.
    let signUpResponse: Awaited<ReturnType<typeof auth.api.signUpEmail>>;
    try {
      signUpResponse = await auth.api.signUpEmail({
        body: {
          email: data.adminEmail.toLowerCase().trim(),
          name: data.adminName.trim(),
          password: data.adminPassword,
          callbackURL: "/admin",
        },
        headers: request.headers,
      });
    } catch (signUpError) {
      await pgDb
        .delete(UniversitySchema)
        .where(eq(UniversitySchema.id, university.id))
        .catch(() => {});
      throw signUpError;
    }

    if (!signUpResponse?.user) {
      await pgDb
        .delete(UniversitySchema)
        .where(eq(UniversitySchema.id, university.id))
        .catch(() => {});
      return NextResponse.json(
        { error: "Failed to create admin account" },
        { status: 500 },
      );
    }

    // 3. Promote to admin and attach to the new tenant
    await pgDb
      .update(UserSchema)
      .set({
        role: "admin",
        universityId: university.id,
        termsAcceptedAt: new Date(),
      })
      .where(eq(UserSchema.id, signUpResponse.user.id));

    console.log("[University Register] New university pending approval:", {
      universityId: university.id,
      slug: university.slug,
      domains,
      adminEmail: data.adminEmail,
    });

    return NextResponse.json(
      {
        success: true,
        university: {
          id: university.id,
          name: university.name,
          slug: university.slug,
          status: university.status,
        },
        message:
          "Your university has been registered and is pending approval. We'll notify you once it's activated.",
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("[University Register] Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: error.issues[0]?.message || "Validation failed",
          details: error.issues,
        },
        { status: 400 },
      );
    }

    if (error.message?.includes("User already exists")) {
      return NextResponse.json(
        { error: "An account with this admin email already exists" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 },
    );
  }
}
