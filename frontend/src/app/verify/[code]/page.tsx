import { eq } from "drizzle-orm";
import { Award, BadgeCheck, CircleSlash, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";

import { pgDb } from "lib/db/pg/db.pg";
import {
  CourseSchema,
  MicroCredentialSchema,
  UniversitySchema,
  UserSchema,
} from "lib/db/pg/schema.pg";

export const metadata: Metadata = {
  title: "Credential Verification — Askly",
};

const LEVEL_STYLES: Record<string, string> = {
  distinction: "bg-amber-100 text-amber-900 border-amber-300",
  proficient: "bg-emerald-100 text-emerald-900 border-emerald-300",
  developing: "bg-sky-100 text-sky-900 border-sky-300",
};

function LevelBadge({ level }: { level: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-3 py-0.5 text-sm font-medium capitalize ${
        LEVEL_STYLES[level] ?? "bg-muted"
      }`}
    >
      <Award className="h-3.5 w-3.5" />
      {level}
    </span>
  );
}

/**
 * Public credential verification page. No auth: the 128-bit verification
 * code in the URL is the capability — unguessable, non-enumerable.
 */
export default async function VerifyPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  const [row] = /^[a-f0-9]{16,64}$/i.test(code)
    ? await pgDb
        .select({
          title: MicroCredentialSchema.title,
          summary: MicroCredentialSchema.summary,
          overallLevel: MicroCredentialSchema.overallLevel,
          competencies: MicroCredentialSchema.competencies,
          evidenceSummary: MicroCredentialSchema.evidenceSummary,
          status: MicroCredentialSchema.status,
          model: MicroCredentialSchema.model,
          issuedAt: MicroCredentialSchema.issuedAt,
          studentName: UserSchema.name,
          courseCode: CourseSchema.courseCode,
          courseTitle: CourseSchema.title,
          universityName: UniversitySchema.name,
        })
        .from(MicroCredentialSchema)
        .innerJoin(
          UserSchema,
          eq(MicroCredentialSchema.studentId, UserSchema.id),
        )
        .innerJoin(
          CourseSchema,
          eq(MicroCredentialSchema.courseId, CourseSchema.id),
        )
        .leftJoin(
          UniversitySchema,
          eq(CourseSchema.universityId, UniversitySchema.id),
        )
        .where(eq(MicroCredentialSchema.verificationCode, code))
        .limit(1)
    : [];

  if (!row || row.status === "revoked") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
        <div className="max-w-md w-full rounded-xl border bg-background p-8 text-center space-y-3">
          <CircleSlash className="h-10 w-10 mx-auto text-destructive" />
          <h1 className="text-xl font-semibold">
            {row?.status === "revoked"
              ? "Credential revoked"
              : "Credential not found"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {row?.status === "revoked"
              ? "This credential has been revoked by the issuing institution."
              : "No credential matches this verification code. Check the link and try again."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-muted/30 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="rounded-xl border bg-background p-8 space-y-5">
          <div className="flex items-center gap-2 text-emerald-700">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-sm font-medium">
              Verified authentic — issued on Askly
            </span>
          </div>

          <div>
            <h1 className="text-2xl font-bold">{row.title}</h1>
            <p className="text-muted-foreground">
              Awarded to{" "}
              <span className="font-medium text-foreground">
                {row.studentName}
              </span>
              {row.universityName ? ` · ${row.universityName}` : ""}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <LevelBadge level={row.overallLevel} />
            <span className="text-sm text-muted-foreground">
              Issued{" "}
              {new Date(row.issuedAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>

          <p className="text-sm leading-relaxed">{row.summary}</p>
        </div>

        <div className="rounded-xl border bg-background p-8 space-y-4">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <BadgeCheck className="h-4 w-4 text-primary" /> Assessed
            competencies
          </h2>
          <ul className="space-y-3">
            {row.competencies.map((c) => (
              <li key={c.name} className="rounded-lg border p-3 space-y-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-sm font-medium">{c.name}</span>
                  <LevelBadge level={c.level} />
                </div>
                <p className="text-sm text-muted-foreground">{c.evidence}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border bg-background p-8 space-y-2">
          <h2 className="text-base font-semibold">Evidence basis</h2>
          <p className="text-sm text-muted-foreground">{row.evidenceSummary}</p>
          <p className="text-xs text-muted-foreground pt-2">
            Competency levels were AI-assessed ({row.model}) strictly from the
            graded evidence above, with the full assessment recorded in
            Askly&apos;s AI decision ledger for audit.
          </p>
        </div>
      </div>
    </main>
  );
}
