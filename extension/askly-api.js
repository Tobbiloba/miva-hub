/**
 * Askly Capture — talking to Askly's API with the extension's bearer token.
 * Shared by the background worker and the offscreen crawler.
 */

export const DEFAULT_API_URL = "https://askly-miva.vercel.app";
// The token is only ever sent to these origins (must mirror host_permissions).
export const ALLOWED_API_ORIGINS = [DEFAULT_API_URL, "http://localhost:4001"];

const MAX_PDF_BYTES = 50 * 1024 * 1024;
const DRIVE_HOST = "drive.usercontent.google.com";

/** A Google Drive file the student's browser isn't signed in to open. */
export class DriveSignInNeeded extends Error {
  constructor() {
    super("Sign in to Google in Chrome with your school account to capture course files on Google Drive.");
  }
}

/** The link is fine but it isn't a PDF (e.g. a slide deck on Drive). */
export class NotAPdf extends Error {}

/**
 * Download a course file in the student's browser. Google Drive files are
 * restricted to the school's Google accounts, so they use the student's own
 * Google login; when it can't open the file, Drive redirects to sign-in.
 */
async function downloadCourseFile(source) {
  if (source.hostname !== DRIVE_HOST) {
    const res = await fetch(source.toString(), { credentials: "include" });
    if (!res.ok) throw new Error(`Couldn't download the PDF from the LMS (HTTP ${res.status})`);
    return res.blob();
  }
  // Chrome may hold several Google accounts; the school one isn't always first
  for (const authuser of [0, 1, 2, 3]) {
    const url = new URL(source);
    url.searchParams.set("authuser", String(authuser));
    const res = await fetch(url.toString(), { credentials: "include", redirect: "manual" });
    if (res.type === "opaqueredirect" || res.status === 401 || res.status === 403) continue;
    if (!res.ok) throw new Error(`Couldn't download the file from Google Drive (HTTP ${res.status})`);
    if ((res.headers.get("content-type") || "").includes("text/html")) {
      throw new NotAPdf("Google Drive didn't return a file");
    }
    return res.blob();
  }
  throw new DriveSignInNeeded();
}

export class ApiError extends Error {
  constructor(message, status, body, retryAfterSec = null) {
    super(message);
    this.status = status;
    this.body = body || {};
    this.retryAfterSec = retryAfterSec;
  }
}

/** JSON request to Askly; throws ApiError with the server's own message. */
export async function api(ctx, path, init = {}) {
  const res = await fetch(`${ctx.apiUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ctx.token}`,
      ...(init.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      res.status === 401
        ? "Your Askly connection expired. Connect the extension again."
        : body.error || body.message || `Askly answered ${res.status}`;
    const retryAfter = Number(res.headers.get("Retry-After"));
    throw new ApiError(message, res.status, body, Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null);
  }
  return body;
}

/**
 * The LMS asset CDN refuses Askly's servers, so PDFs are downloaded here,
 * in the student's browser, and uploaded to Askly's storage through a
 * presigned URL. Returns the upload_key for the capture.
 */
export async function uploadLmsPdf(ctx, { pdfUrl, filename, courseCode, viaSync }) {
  const source = new URL(pdfUrl);
  if (
    source.protocol !== "https:" ||
    !["lms-assets.miva.university", DRIVE_HOST].includes(source.hostname)
  ) {
    throw new Error("Only course files from the LMS or Google Drive can be captured");
  }
  const blob = await downloadCourseFile(source);
  if (blob.size === 0) throw new Error("The PDF is empty");
  if (blob.size > MAX_PDF_BYTES) throw new Error("PDF is larger than 50 MB");
  const signature = new Uint8Array(await blob.slice(0, 5).arrayBuffer());
  if (String.fromCharCode(...signature) !== "%PDF-") {
    throw new NotAPdf("That file isn't a PDF");
  }

  const { upload_url, upload_key, headers } = await api(ctx, "/api/ingest/upload-url", {
    method: "POST",
    body: JSON.stringify({
      course_code: courseCode,
      filename: filename || "document.pdf",
      size: blob.size,
      via_sync: !!viaSync,
    }),
  });
  const put = await fetch(upload_url, { method: "PUT", headers, body: blob });
  if (!put.ok) throw new Error(`Upload to Askly storage failed (HTTP ${put.status})`);
  return upload_key;
}

/**
 * Send one lesson to Askly. `lesson` uses the capture API's field names plus
 * `page_type` (video | pdf | quiz | assignment_external | page).
 */
export async function submitCapture(ctx, lesson, { viaSync = false } = {}) {
  const body = {
    source_url: lesson.source_url,
    course_code: lesson.course_code,
    week_number: lesson.week_number ?? null,
    lesson_title: lesson.lesson_title,
    session_label: lesson.session_label || null,
    content_type: lesson.page_type,
    via_sync: viaSync,
  };
  if (lesson.page_type === "video") {
    body.vimeo_video_id = lesson.vimeo_video_id;
    body.vimeo_hash = lesson.vimeo_hash;
  } else if (lesson.page_type === "pdf") {
    body.upload_key = await uploadLmsPdf(ctx, {
      pdfUrl: lesson.pdf_url,
      filename: lesson.pdf_filename,
      courseCode: lesson.course_code,
      viaSync,
    });
    body.pdf_filename = lesson.pdf_filename;
  } else if (lesson.page_type === "quiz") {
    body.quiz_questions = lesson.quiz_questions?.length ? lesson.quiz_questions : null;
    body.quiz_instructions = lesson.quiz_instructions;
    body.quiz_metadata = lesson.quiz_metadata;
  } else if (lesson.page_type === "assignment_external") {
    body.assignment_instructions = lesson.assignment_instructions;
    body.assignment_requirements = lesson.assignment_requirements;
    body.assignment_metadata = lesson.assignment_metadata;
  } else if (lesson.page_type === "page") {
    body.page_text = lesson.page_text;
  }
  return api(ctx, "/api/ingest/lesson", { method: "POST", body: JSON.stringify(body) });
}
