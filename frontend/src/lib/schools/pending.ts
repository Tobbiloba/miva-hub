import "server-only";

import { sendEmail } from "@/lib/email/smtp-service";
import { buildSchoolAddedEmail } from "@/lib/email/templates/school-pending";
import { and, asc, eq, inArray, isNull, like, or, sql } from "drizzle-orm";
import { pgDb } from "lib/db/pg/db.pg";
import {
  SchoolRequestSchema,
  UniversitySchema,
  UserSchema,
} from "lib/db/pg/schema.pg";
import logger from "logger";

/**
 * Students whose school isn't on Askly yet. They sign up with a school email
 * (no university on their account) and a school_request row records which
 * school they're from. A super admin later links the request to a
 * university, which attaches every waiting student from that email domain.
 */

export type PendingSchool = { schoolName: string; emailDomain: string };

/** The student's school request while it's still waiting, else null */
export async function getPendingSchool(
  userId: string,
): Promise<PendingSchool | null> {
  const [row] = await pgDb
    .select({
      schoolName: SchoolRequestSchema.schoolName,
      emailDomain: SchoolRequestSchema.emailDomain,
    })
    .from(SchoolRequestSchema)
    .where(
      and(
        eq(SchoolRequestSchema.userId, userId),
        eq(SchoolRequestSchema.status, "pending"),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function createSchoolRequest(input: {
  userId: string;
  schoolName: string;
  emailDomain: string;
}) {
  await pgDb
    .insert(SchoolRequestSchema)
    .values(input)
    .onConflictDoNothing({ target: SchoolRequestSchema.userId });
}

export type SchoolRequestGroup = {
  emailDomain: string;
  /** The names students typed, most common first */
  schoolNames: string[];
  students: number;
  firstAt: Date;
  lastAt: Date;
  /** An active university already claiming this domain (or its parent) */
  suggested: { id: string; name: string } | null;
};

/** Waiting requests grouped by email domain, most-requested first */
export async function listPendingSchoolRequests(): Promise<
  SchoolRequestGroup[]
> {
  const rows = await pgDb
    .select({
      emailDomain: SchoolRequestSchema.emailDomain,
      schoolName: SchoolRequestSchema.schoolName,
      createdAt: SchoolRequestSchema.createdAt,
    })
    .from(SchoolRequestSchema)
    .where(eq(SchoolRequestSchema.status, "pending"))
    .orderBy(asc(SchoolRequestSchema.createdAt));

  const active = await pgDb
    .select({
      id: UniversitySchema.id,
      name: UniversitySchema.name,
      emailDomains: UniversitySchema.emailDomains,
    })
    .from(UniversitySchema)
    .where(eq(UniversitySchema.status, "active"));

  const groups = new Map<string, { names: Map<string, number>; at: Date[] }>();
  for (const r of rows) {
    const g = groups.get(r.emailDomain) ?? {
      names: new Map<string, number>(),
      at: [] as Date[],
    };
    const name = r.schoolName.trim();
    g.names.set(name, (g.names.get(name) ?? 0) + 1);
    g.at.push(r.createdAt);
    groups.set(r.emailDomain, g);
  }

  return [...groups.entries()]
    .map(([emailDomain, g]) => {
      const owner = active.find((u) =>
        u.emailDomains.some((d) => domainBelongsTo(emailDomain, d)),
      );
      return {
        emailDomain,
        schoolNames: [...g.names.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([n]) => n),
        students: g.at.length,
        firstAt: g.at[0],
        lastAt: g.at[g.at.length - 1],
        suggested: owner ? { id: owner.id, name: owner.name } : null,
      };
    })
    .sort((a, b) => b.students - a.students || +b.lastAt - +a.lastAt);
}

/** student.unilag.edu.ng belongs to unilag.edu.ng */
export function domainBelongsTo(domain: string, claimed: string): boolean {
  const d = domain.toLowerCase();
  const c = claimed.toLowerCase();
  return d === c || d.endsWith(`.${c}`);
}

/**
 * Attach every waiting student from these email domains (or their
 * subdomains) to an ACTIVE
 * university and email them. Only students who still have no university are
 * touched. Returns how many were linked.
 */
export async function linkSchoolRequests(input: {
  universityId: string;
  emailDomains: string[];
}): Promise<number> {
  const [university] = await pgDb
    .select({ id: UniversitySchema.id, name: UniversitySchema.name })
    .from(UniversitySchema)
    .where(
      and(
        eq(UniversitySchema.id, input.universityId),
        eq(UniversitySchema.status, "active"),
      ),
    );
  if (!university || input.emailDomains.length === 0) return 0;

  const linked = await pgDb.transaction(async (tx) => {
    const waiting = await tx
      .select({
        requestId: SchoolRequestSchema.id,
        userId: UserSchema.id,
        email: UserSchema.email,
        name: UserSchema.name,
      })
      .from(SchoolRequestSchema)
      .innerJoin(UserSchema, eq(UserSchema.id, SchoolRequestSchema.userId))
      .where(
        and(
          eq(SchoolRequestSchema.status, "pending"),
          // the domain itself or any subdomain of it (student.x.edu.ng)
          or(
            ...input.emailDomains.flatMap((d) => [
              eq(SchoolRequestSchema.emailDomain, d.toLowerCase()),
              like(SchoolRequestSchema.emailDomain, `%.${d.toLowerCase()}`),
            ]),
          ),
          isNull(UserSchema.universityId),
          eq(UserSchema.role, "student"),
        ),
      );
    if (waiting.length === 0) return [];

    await tx
      .update(UserSchema)
      .set({ universityId: university.id, updatedAt: new Date() })
      .where(
        and(
          inArray(
            UserSchema.id,
            waiting.map((w) => w.userId),
          ),
          isNull(UserSchema.universityId),
        ),
      );
    await tx
      .update(SchoolRequestSchema)
      .set({
        status: "linked",
        universityId: university.id,
        linkedAt: sql`now()`,
      })
      .where(
        inArray(
          SchoolRequestSchema.id,
          waiting.map((w) => w.requestId),
        ),
      );
    return waiting;
  });

  // Best-effort: a failed email never undoes the link
  await Promise.allSettled(
    linked.map((s) => {
      const { subject, html, text } = buildSchoolAddedEmail({
        firstName: s.name.trim().split(/\s+/)[0] || "there",
        universityName: university.name,
      });
      return sendEmail({ to: s.email, subject, html, text }).catch((e) =>
        logger.warn("[schools] couldn't send the school-added email", e),
      );
    }),
  );
  return linked.length;
}
