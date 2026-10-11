/**
 * Askly Capture — talking to Askly's API with the extension's bearer token.
 * Shared by the background worker and the offscreen crawler.
 */

export const DEFAULT_API_URL = "https://askly-miva.vercel.app";
// The token is only ever sent to these origins (must mirror host_permissions).
export const ALLOWED_API_ORIGINS = [DEFAULT_API_URL, "http://localhost:4001"];

const MAX_PDF_BYTES = 50 * 1024 * 1024;

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
  if (source.protocol !== "https:" || source.hostname !== "lms-assets.miva.university") {
    throw new Error("Only LMS-hosted PDFs can be captured");
  }
  const pdfRes = await fetch(source.toString(), { credentials: "include" });
  if (!pdfRes.ok) {
    throw new Error(`Couldn't download the PDF from the LMS (HTTP ${pdfRes.status})`);
  }
  const blob = await pdfRes.blob();
  if (blob.size === 0) throw new Error("The PDF is empty");
  if (blob.size > MAX_PDF_BYTES) throw new Error("PDF is larger than 50 MB");
  const signature = new Uint8Array(await blob.slice(0, 5).arrayBuffer());
  if (String.fromCharCode(...signature) !== "%PDF-") {
    throw new Error("The LMS didn't return a PDF file");
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
