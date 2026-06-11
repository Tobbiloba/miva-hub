import { randomBytes } from "node:crypto";
import { requireAdmin } from "@/lib/auth/admin";
import { pgDb } from "@/lib/db/pg/db.pg";
import { FacultyInviteSchema, UserSchema } from "@/lib/db/pg/schema.pg";
import { sendEmail } from "@/lib/email/smtp-service";
import { emailMatchesUniversity, getUserUniversity } from "@/lib/tenant";
import { and, desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4001";
const INVITE_TTL_DAYS = 7;

const createInviteSchema = z.object({
  email: z.string().email("Invalid email format"),
  name: z.string().max(100).optional(),
  position: z.enum([
    "professor",
    "associate_professor",
    "assistant_professor",
    "lecturer",
    "instructor",
    "visiting_professor",
  ]),
  departmentId: z.string().uuid("Invalid department ID"),
});

export async function GET() {
  try {
    const adminAccess = await requireAdmin();
    if (adminAccess instanceof NextResponse) return adminAccess;

    const university = await getUserUniversity(adminAccess.user.id);
    if (!university) {
      return NextResponse.json(
        { success: false, error: "No university associated with your account" },
        { status: 403 },
      );
    }

    const invites = await pgDb
      .select()
      .from(FacultyInviteSchema)
      .where(eq(FacultyInviteSchema.universityId, university.id))
      .orderBy(desc(FacultyInviteSchema.createdAt));

    return NextResponse.json({ success: true, data: invites });
  } catch (error) {
    console.error("[Faculty Invites] GET Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch invites" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminAccess = await requireAdmin();
    if (adminAccess instanceof NextResponse) return adminAccess;

    const body = await request.json();
    const data = createInviteSchema.parse(body);
    const email = data.email.toLowerCase().trim();

    const university = await getUserUniversity(adminAccess.user.id);
    if (!university) {
      return NextResponse.json(
        { success: false, error: "No university associated with your account" },
        { status: 403 },
      );
    }
    if (!emailMatchesUniversity(email, university)) {
      return NextResponse.json(
        {
          success: false,
          error: `Email must use one of your university's domains: ${university.emailDomains.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // No existing account with this email
    const [existingUser] = await pgDb
      .select({ id: UserSchema.id })
      .from(UserSchema)
      .where(eq(UserSchema.email, email))
      .limit(1);
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "A user with this email already exists" },
        { status: 409 },
      );
    }

    // No duplicate pending invite
    const [existingInvite] = await pgDb
      .select({ id: FacultyInviteSchema.id })
      .from(FacultyInviteSchema)
      .where(
        and(
          eq(FacultyInviteSchema.universityId, university.id),
          eq(FacultyInviteSchema.email, email),
          eq(FacultyInviteSchema.status, "pending"),
        ),
      )
      .limit(1);
    if (existingInvite) {
      return NextResponse.json(
        {
          success: false,
          error: "A pending invite already exists for this email",
        },
        { status: 409 },
      );
    }

    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(
      Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000,
    );

    const [invite] = await pgDb
      .insert(FacultyInviteSchema)
      .values({
        universityId: university.id,
        email,
        name: data.name?.trim() || null,
        position: data.position,
        departmentId: data.departmentId,
        token,
        invitedBy: adminAccess.user.id,
        status: "pending",
        expiresAt,
      })
      .returning();

    // Send the invite email (best-effort — the link is also returned so
    // the admin can share it manually if delivery fails)
    const inviteUrl = `${BASE_URL}/invite/${token}`;
    let emailSent = false;
    try {
      const greeting = data.name ? `Hi ${data.name.trim()},` : "Hello,";
      await sendEmail({
        to: email,
        subject: `You're invited to join ${university.name} on Askly`,
        html: `
          <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
            <h2>Join ${university.name} on Askly</h2>
            <p>${greeting}</p>
            <p>You've been invited to join <strong>${university.name}</strong> on Askly as faculty. Click the button below to set up your account.</p>
            <p style="margin: 24px 0;">
              <a href="${inviteUrl}" style="background: #2563eb; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none;">Accept invitation</a>
            </p>
            <p style="color: #666; font-size: 14px;">This invitation expires in ${INVITE_TTL_DAYS} days. If the button doesn't work, copy this link:<br/>${inviteUrl}</p>
          </div>
        `,
        text: `${greeting}\n\nYou've been invited to join ${university.name} on Askly as faculty.\n\nAccept your invitation: ${inviteUrl}\n\nThis invitation expires in ${INVITE_TTL_DAYS} days.`,
      });
      emailSent = true;
    } catch (emailError) {
      console.error("[Faculty Invites] Email send failed:", emailError);
    }

    return NextResponse.json(
      {
        success: true,
        data: { ...invite, inviteUrl, emailSent },
        message: emailSent
          ? `Invitation sent to ${email}`
          : `Invite created, but the email could not be sent — share the link manually`,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[Faculty Invites] POST Error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: error.issues },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to create invite" },
      { status: 500 },
    );
  }
}
