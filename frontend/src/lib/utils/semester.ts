import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";

/**
 * Academic terms.
 *
 * A term is identified by one canonical key, `<session>-<semester>`, e.g.
 * "2025/2026-first". It is derived from the university's current
 * academic_session row (the only live source of the current term), and it is
 * the value stored in student_enrollment.semester, course_instructor.semester
 * and class_schedule.semester (normalized by migration 0042).
 *
 * The current term is per university: there is no platform-wide "current
 * semester", and nothing here guesses one from the date.
 */

export type SemesterName = "first" | "second";

export const TERM_KEY_PATTERN = /^\d{4}\/\d{4}-(first|second)$/;

export function termKey(sessionName: string, semester: string): string {
  return `${sessionName}-${semester}`;
}

export function isTermKey(value: string): boolean {
  return TERM_KEY_PATTERN.test(value);
}

/**
 * The university's current term key, or null when the university has no
 * current academic session (callers show "no active term", never a guess).
 */
export async function getCurrentSemester(
  universityId: string | null | undefined,
): Promise<string | null> {
  const term = await getCurrentAcademicTerm(universityId);
  return term?.key ?? null;
}

/** Current term details for a university, or null without a current session. */
export async function getCurrentAcademicTerm(
  universityId: string | null | undefined,
): Promise<{
  key: string;
  sessionName: string;
  semester: SemesterName;
  /** "2025-2026" — the format stored in student_enrollment.academic_year */
  academicYear: string;
} | null> {
  if (!universityId) return null;
  const session =
    await pgAcademicRepository.getActiveAcademicSession(universityId);
  if (!session) return null;
  return {
    key: termKey(session.sessionName, session.currentSemester),
    sessionName: session.sessionName,
    semester: session.currentSemester as SemesterName,
    academicYear: session.sessionName.replace("/", "-"),
  };
}

/** "2025/2026-first" → "First Semester 2025/2026"; other values unchanged. */
export function formatSemester(value: string): string {
  const match = value.match(/^(\d{4}\/\d{4})-(first|second)$/);
  if (!match) return value;
  const name = match[2] === "first" ? "First" : "Second";
  return `${name} Semester ${match[1]}`;
}

/**
 * Normalize a semester submitted by an admin form into a term key.
 * Accepts a full key ("2025/2026-first"), or "first"/"second" qualified by
 * `academicYear` ("2025-2026" or "2025/2026") or else the university's
 * current session. Returns null when it can't be resolved (callers → 400).
 */
export async function resolveTermKey(
  input: string,
  opts: { universityId: string; academicYear?: string | null },
): Promise<string | null> {
  const value = input.trim().toLowerCase();
  if (isTermKey(value)) return value;
  if (value !== "first" && value !== "second") return null;

  const year = opts.academicYear?.trim().replace("-", "/");
  if (year && /^\d{4}\/\d{4}$/.test(year)) return termKey(year, value);

  const term = await getCurrentAcademicTerm(opts.universityId);
  return term ? termKey(term.sessionName, value) : null;
}
