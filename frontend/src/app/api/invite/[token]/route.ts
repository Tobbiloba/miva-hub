import { auth } from "@/lib/auth/server";
import { pgDb } from "@/lib/db/pg/db.pg";
import {
  DepartmentSchema,
  FacultyInviteSchema,
  FacultySchema,
  UniversitySchema,
  UserSchema,
} from "@/lib/db/pg/schema.pg";
import { checkRateLimit } from "@/lib/rate-limit";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

async function loadInvite(token: string) {
  const [row] = await pgDb
    .select({
      invite: FacultyInviteSchema,
      university: UniversitySchema,
      department: DepartmentSchema,
    })
    .from(FacultyInviteSchema)
    .innerJoin(
      UniversitySchema,
      eq(FacultyInviteSchema.universityId, UniversitySchema.id),
    )
    .leftJoin(
      DepartmentSchema,
      eq(FacultyInviteSchema.departmentId, DepartmentSchema.id),
    )
    .where(eq(FacultyInviteSchema.token, token))
    .limit(1);
  return row;
}

async function validateInvite(token: string) {
  const row = await loadInvite(token);
  if (!row) return { error: "Invalid or unknown invitation", status: 404 };

  const { invite, university } = row;
  if (invite.status !== "pending") {
    return {
      error:
        invite.status === "accepted"
          ? "This invitation has already been used"
          : "This invitation is no longer valid",
      status: 410,
    };
  }
  if (invite.expiresAt < new Date()) {
    await pgDb
      .update(FacultyInviteSchema)
      .set({ status: "expired", updatedAt: new Date() })
      .where(eq(FacultyInviteSchema.id, invite.id));
    return { error: "This invitation has expired", status: 410 };
  }
  if (university.status === "suspended") {
    return {
      error: "This university is currently suspended on Askly",
      status: 403,
    };
  }
  return { row };
}

/** GET /api/invite/[token] — public invite preview for the accept page. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    if (!checkRateLimit(`invite-view:${ip}`, 20, 60).allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { token } = await params;
    const result = await validateInvite(token);
    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    const { invite, university, department } = result.row;
    return NextResponse.json({
      invite: {
        email: invite.email,
        name: invite.name,
        position: invite.position,
        department: department?.name || null,
        universityName: university.name,
        expiresAt: invite.expiresAt,
      },
    });
  } catch (error) {
    console.error("[Invite] GET Error:", error);
    return NextResponse.json(
      { error: "Failed to load invitation" },
      { status: 500 },
    );
  }
}

const acceptSchema = z.object({
  name: z.string().min(2, "Enter your full name").max(100),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128),
});

/** POST /api/invite/[token] — accept the invite and create the faculty account. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    if (!checkRateLimit(`invite-accept:${ip}`, 10, 3600).allowed) {
      return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
    }

    const { token } = await params;
    const body = await request.json();
    const data = acceptSchema.parse(body);

    const result = await validateInvite(token);
    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }
    const { invite } = result.row;

    // 1. Create the account via better-auth (signs the user in)
    const signUpResponse = await auth.api.signUpEmail({
      body: {
        email: invite.email,
        name: data.name.trim(),
        password: data.password,
        callbackURL: "/",
      },
      headers: request.headers,
    });
    if (!signUpResponse?.user) {
      return NextResponse.json(
        { error: "Failed to create account" },
        { status: 500 },
      );
    }
    const userId = signUpResponse.user.id;

    // 2. Promote to faculty within the invite's tenant
    await pgDb
      .update(UserSchema)
      .set({
        role: "faculty",
        universityId: invite.universityId,
        termsAcceptedAt: new Date(),
      })
      .where(eq(UserSchema.id, userId));

    // 3. Create the faculty profile (employee ID generated; editable later)
    const employeeId = `FAC-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(-4).toUpperCase()}`;
    await pgDb.insert(FacultySchema).values({
      userId,
      employeeId,
      departmentId: invite.departmentId,
      position: invite.position,
      isActive: true,
    });

    // 4. Mark the invite as used
    await pgDb
      .update(FacultyInviteSchema)
      .set({
        status: "accepted",
        acceptedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(FacultyInviteSchema.id, invite.id));

    return NextResponse.json({ success: true, ...signUpResponse });
  } catch (error: any) {
    console.error("[Invite] POST Error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Validation failed" },
        { status: 400 },
      );
    }
    if (error.message?.includes("User already exists")) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Failed to accept invitation" },
      { status: 500 },
    );
  }
}
