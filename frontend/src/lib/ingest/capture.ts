import { randomUUID } from "node:crypto";
import { z } from "zod";

/**
 * Validation + policy for lesson captures sent by the Askly Capture extension.
 * Pure functions (no DB) so the rules are unit-testable.
 */

// Hosts the server may download capture files from. Anything else is refused
// before any request is made (prevents SSRF via a crafted pdf_url).
const DEFAULT_PDF_HOSTS = ["lms-assets.miva.university", "lms.miva.university"];

export function allowedPdfHosts(): string[] {
  const fromEnv = process.env.INGEST_ALLOWED_PDF_HOSTS?.split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  return fromEnv?.length ? fromEnv : DEFAULT_PDF_HOSTS;
}

export function isAllowedPdfUrl(
  raw: string,
  hosts: string[] = allowedPdfHosts(),
): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  if (url.username || url.password) return false;
  if (url.port && url.port !== "443") return false;
  return hosts.includes(url.hostname.toLowerCase());
}

/** Reduce a client-supplied filename to a safe single path segment ending in .pdf. */
export function sanitizePdfFilename(
  raw: string | null | undefined,
  fallbackSlug: string,
): string {
  const base = (raw ?? "").split(/[\\/]/).pop() ?? "";
  const cleaned = base
    .replace(/\.pdf$/i, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 100);
  return `${cleaned || fallbackSlug || "document"}.pdf`;
}

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "lesson"
  );
}

// The LMS asset CDN refuses server-side downloads (403), so the extension
// fetches PDFs with the student's own LMS session and uploads them straight
// to S3 under a key bound to that user.
export const MAX_CAPTURE_PDF_BYTES = 50 * 1024 * 1024;
const UPLOAD_PREFIX = "uploads/capture";

export function newCaptureUploadKey(userId: string, filename: string): string {
  return `${UPLOAD_PREFIX}/${userId}/${randomUUID()}/${sanitizePdfFilename(filename, "document")}`;
}

/** Does this upload key belong to `userId` (and match the issued shape)? */
export function isOwnCaptureUploadKey(key: string, userId: string): boolean {
  const escaped = userId.replace(/[^0-9a-f-]/gi, "");
  return new RegExp(
    `^${UPLOAD_PREFIX}/${escaped}/[0-9a-f-]{36}/[A-Za-z0-9._-]{1,104}\\.pdf$`,
  ).test(key);
}

/** Escape LIKE wildcards so user text matches literally. */
export function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (c) => `\\${c}`);
}

const shortText = (max: number) => z.string().trim().max(max);

export const LessonCaptureSchema = z
  .object({
    source_url: z.string().url().max(2000),
    course_code: z
      .string()
      .trim()
      .min(2)
      .max(20)
      .regex(/^[A-Za-z]{2,6}\s?\d{2,4}[A-Za-z]?$/, "Invalid course code"),
    week_number: z.number().int().min(0).max(60).nullish(),
    lesson_title: shortText(300).min(1),
    session_label: shortText(100).nullish(),
    content_type: z.enum(["video", "pdf", "quiz", "assignment_external"]),
    vimeo_video_id: z
      .string()
      .regex(/^\d{1,15}$/)
      .nullish(),
    vimeo_hash: z
      .string()
      .regex(/^[a-f0-9]{1,40}$/i)
      .nullish(),
    pdf_url: z.string().max(2000).nullish(),
    upload_key: z.string().max(300).nullish(),
    pdf_filename: shortText(255).nullish(),
    quiz_questions: z
      .array(
        z.object({
          text: shortText(5000),
          options: z.array(shortText(1000)).max(20).optional(),
        }),
      )
      .max(200)
      .nullish(),
    quiz_instructions: shortText(10_000).nullish(),
    quiz_metadata: z.record(z.string(), shortText(500)).nullish(),
    assignment_instructions: shortText(10_000).nullish(),
    assignment_requirements: shortText(10_000).nullish(),
    assignment_metadata: z
      .record(z.string(), z.union([shortText(500), z.number()]))
      .nullish(),
  })
  .superRefine((v, ctx) => {
    if (v.content_type === "video" && !v.vimeo_video_id) {
      ctx.addIssue({
        code: "custom",
        message: "vimeo_video_id is required for video content",
      });
    }
    if (v.content_type === "pdf" && !v.upload_key) {
      if (!v.pdf_url) {
        ctx.addIssue({
          code: "custom",
          message: "upload_key or pdf_url is required for PDF content",
        });
      } else if (!isAllowedPdfUrl(v.pdf_url)) {
        ctx.addIssue({
          code: "custom",
          message: "pdf_url must be an https link on the LMS asset host",
        });
      }
    }
  });

export type LessonCapture = z.infer<typeof LessonCaptureSchema>;

/**
 * May a student's private capture be offered to the shared course corpus?
 * Pages that carry the student's own work or results stay private:
 * assignment pages (submission status, grades) and quiz attempt/review pages
 * (their answers and scores). Lesson videos, PDFs and quiz intro pages are
 * course content and may be shared after moderation.
 */
export function isShareableCapture(
  contentType: LessonCapture["content_type"],
  sourceUrl: string,
): boolean {
  if (contentType === "assignment_external") return false;
  if (contentType === "quiz") {
    try {
      return new URL(sourceUrl).pathname.endsWith("/mod/quiz/view.php");
    } catch {
      return false;
    }
  }
  return true;
}
