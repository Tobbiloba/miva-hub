/**
 * Askly Capture — Background Service Worker
 * Handles extension-token storage, API communication, and job tracking.
 */

// ── Storage helpers ─────────────────────────────────────────────

const DEFAULT_API_URL = "https://askly-miva.vercel.app";
// The token is only ever sent to these origins (must mirror host_permissions).
// A custom API URL outside this list is ignored, so a mistyped or malicious
// setting can't exfiltrate the token.
const ALLOWED_API_ORIGINS = [DEFAULT_API_URL, "http://localhost:4001"];

async function getApiUrl() {
  const { askly_api_url } = await chrome.storage.local.get("askly_api_url");
  try {
    const origin = new URL(askly_api_url).origin;
    if (ALLOWED_API_ORIGINS.includes(origin)) return origin;
  } catch {
    // unset or invalid → default
  }
  return DEFAULT_API_URL;
}

async function getAuthHeaders() {
  const { askly_session } = await chrome.storage.local.get("askly_session");
  if (!askly_session?.token) {
    throw new Error("Not logged in");
  }
  if (
    askly_session.expiresAt &&
    Date.parse(askly_session.expiresAt) <= Date.now()
  ) {
    await chrome.storage.local.remove(["askly_session"]);
    throw new Error("Session expired — please log in again");
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${askly_session.token}`,
  };
}

async function readError(res) {
  const err = await res.json().catch(() => ({ error: res.statusText }));
  if (res.status === 401) {
    // Token revoked or expired server-side
    await chrome.storage.local.remove(["askly_session"]);
    return "Your Askly login expired — please log in again";
  }
  return err.error || err.message || `HTTP ${res.status}`;
}

// ── PDF upload ──────────────────────────────────────────────────

const MAX_PDF_BYTES = 50 * 1024 * 1024;

/**
 * The LMS asset CDN only serves files to a logged-in student, so Askly's
 * server can't download them. Fetch the PDF here with the student's own LMS
 * session, upload it straight to S3 via a presigned URL, and return the
 * upload_key for the capture.
 */
async function uploadLmsPdf(metadata, apiUrl, headers) {
  const source = new URL(metadata.pdf_url);
  if (source.protocol !== "https:" || source.hostname !== "lms-assets.miva.university") {
    throw new Error("Only LMS-hosted PDFs can be captured");
  }

  const pdfRes = await fetch(source.toString(), { credentials: "include" });
  if (!pdfRes.ok) {
    throw new Error(
      `Couldn't download the PDF from the LMS (HTTP ${pdfRes.status}). Make sure you're logged in to the LMS.`
    );
  }
  const blob = await pdfRes.blob();
  if (blob.size === 0) throw new Error("The PDF is empty");
  if (blob.size > MAX_PDF_BYTES) throw new Error("PDF is larger than 50 MB");
  const signature = new Uint8Array(await blob.slice(0, 5).arrayBuffer());
  if (String.fromCharCode(...signature) !== "%PDF-") {
    throw new Error("The LMS didn't return a PDF file");
  }

  const urlRes = await fetch(`${apiUrl}/api/ingest/upload-url`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      course_code: metadata.course_code,
      filename: metadata.pdf_filename || "document.pdf",
      size: blob.size,
    }),
  });
  if (!urlRes.ok) throw new Error(await readError(urlRes));
  const { upload_url, upload_key, headers: uploadHeaders } = await urlRes.json();

  const putRes = await fetch(upload_url, {
    method: "PUT",
    headers: uploadHeaders,
    body: blob,
  });
  if (!putRes.ok) {
    throw new Error(`Upload to Askly storage failed (HTTP ${putRes.status})`);
  }
  return upload_key;
}

// ── API methods ─────────────────────────────────────────────────

async function submitLesson(metadata) {
  const apiUrl = await getApiUrl();
  const headers = await getAuthHeaders();

  const body = {
    source_url: metadata.source_url,
    course_code: metadata.course_code,
    week_number: metadata.week_number,
    lesson_title: metadata.lesson_title,
    session_label: metadata.session_label,
    content_type: metadata.page_type, // 'video', 'pdf', 'quiz', or 'assignment_external'
  };

  if (metadata.page_type === "video") {
    body.vimeo_video_id = metadata.vimeo_video_id;
    body.vimeo_hash = metadata.vimeo_hash;
  } else if (metadata.page_type === "pdf") {
    body.upload_key = await uploadLmsPdf(metadata, apiUrl, headers);
    body.pdf_filename = metadata.pdf_filename;
  } else if (metadata.page_type === "quiz") {
    body.quiz_questions = metadata.quiz_questions;
    body.quiz_instructions = metadata.quiz_instructions;
    body.quiz_metadata = metadata.quiz_metadata;
  } else if (metadata.page_type === "assignment_external") {
    body.assignment_instructions = metadata.assignment_instructions;
    body.assignment_requirements = metadata.assignment_requirements;
    body.assignment_metadata = metadata.assignment_metadata;
  }

  const res = await fetch(`${apiUrl}/api/ingest/lesson`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(await readError(res));
  }

  const result = await res.json();

  // Store in recent captures
  await addRecentCapture({
    job_id: result.job_id,
    lesson_title: metadata.lesson_title,
    course_code: metadata.course_code,
    content_type: metadata.page_type,
    status: result.status,
    visibility: result.visibility,
    timestamp: Date.now(),
  });

  return result;
}

async function pollJobStatus(jobId) {
  const apiUrl = await getApiUrl();
  const headers = await getAuthHeaders();

  const res = await fetch(`${apiUrl}/api/ingest/jobs/${encodeURIComponent(jobId)}`, {
    headers,
  });

  if (!res.ok) return null;
  return res.json();
}

async function loginToAskly(email, password) {
  const apiUrl = await getApiUrl();

  // Exchanges credentials for a dedicated, revocable extension token
  const res = await fetch(`${apiUrl}/api/extension/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, label: "Askly Capture" }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(
      err.error || err.message || `Login failed: HTTP ${res.status}`
    );
  }

  const data = await res.json();

  await chrome.storage.local.set({
    askly_session: {
      token: data.token,
      expiresAt: data.expires_at,
      user: data.user,
    },
  });

  return data;
}

async function logoutFromAskly() {
  try {
    const apiUrl = await getApiUrl();
    const headers = await getAuthHeaders();
    // Revoke server-side so a copied token stops working too
    await fetch(`${apiUrl}/api/extension/token`, {
      method: "DELETE",
      headers,
    });
  } catch {
    // Already logged out / offline — still clear the local copy
  }
  await chrome.storage.local.remove(["askly_session"]);
}

// ── Recent captures storage ─────────────────────────────────────

async function addRecentCapture(capture) {
  const { recent_captures = [] } = await chrome.storage.local.get(
    "recent_captures"
  );
  recent_captures.unshift(capture);
  // Keep only last 10
  await chrome.storage.local.set({
    recent_captures: recent_captures.slice(0, 10),
  });
}

async function updateCaptureStatus(jobId, status) {
  const { recent_captures = [] } = await chrome.storage.local.get(
    "recent_captures"
  );
  const updated = recent_captures.map((c) =>
    c.job_id === jobId ? { ...c, status } : c
  );
  await chrome.storage.local.set({ recent_captures: updated });
}

// ── Page metadata cache ─────────────────────────────────────────

let lastPageMetadata = null;

// ── Message handler ─────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Only this extension's own pages and content scripts may talk to us
  if (sender.id !== chrome.runtime.id) return false;

  const handle = async () => {
    try {
      switch (msg.type) {
        case "PAGE_METADATA":
          lastPageMetadata = msg.data;
          return { ok: true };

        case "GET_CACHED_METADATA":
          return { ok: true, data: lastPageMetadata };

        case "SUBMIT_CAPTURE": {
          // The server processes the capture right after accepting it
          const result = await submitLesson(msg.data);
          return { ok: true, data: result };
        }

        case "POLL_JOB": {
          const job = await pollJobStatus(msg.jobId);
          if (job) {
            await updateCaptureStatus(msg.jobId, job.status);
          }
          return { ok: true, data: job };
        }

        case "LOGIN": {
          const loginResult = await loginToAskly(msg.email, msg.password);
          return { ok: true, data: loginResult };
        }

        case "LOGOUT":
          await logoutFromAskly();
          return { ok: true };

        case "GET_SESSION": {
          const { askly_session } = await chrome.storage.local.get(
            "askly_session"
          );
          return {
            ok: true,
            data: askly_session?.token
              ? { user: askly_session.user, token: true }
              : null,
          };
        }

        case "GET_RECENT_CAPTURES": {
          const { recent_captures = [] } = await chrome.storage.local.get(
            "recent_captures"
          );
          return { ok: true, data: recent_captures };
        }

        default:
          return { ok: false, error: "Unknown message type" };
      }
    } catch (error) {
      return { ok: false, error: error.message };
    }
  };

  handle().then(sendResponse);
  return true; // keep channel open for async response
});
