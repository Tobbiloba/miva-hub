/**
 * Askly Capture — Background Service Worker
 * Handles auth token storage, API communication, and job tracking.
 */

// ── Storage helpers ─────────────────────────────────────────────

async function getApiUrl() {
  const { askly_api_url } = await chrome.storage.local.get("askly_api_url");
  return askly_api_url || "https://askly.miva.university"; // default to production
}

async function getAuthHeaders() {
  const { askly_session } = await chrome.storage.local.get("askly_session");
  if (!askly_session?.token) {
    throw new Error("Not logged in");
  }
  return {
    "Content-Type": "application/json",
    Cookie: `better-auth.session_token=${askly_session.token}`,
  };
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
    content_type: metadata.page_type, // 'video' or 'pdf'
  };

  if (metadata.page_type === "video") {
    body.vimeo_video_id = metadata.vimeo_video_id;
    body.vimeo_hash = metadata.vimeo_hash;
  } else if (metadata.page_type === "pdf") {
    body.pdf_url = metadata.pdf_url;
    body.pdf_filename = metadata.pdf_filename;
  }

  const res = await fetch(`${apiUrl}/api/ingest/lesson`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    credentials: "include",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  const result = await res.json();

  // Store in recent captures
  await addRecentCapture({
    job_id: result.job_id,
    lesson_title: metadata.lesson_title,
    course_code: metadata.course_code,
    content_type: metadata.page_type,
    status: result.status,
    timestamp: Date.now(),
  });

  return result;
}

async function pollJobStatus(jobId) {
  const apiUrl = await getApiUrl();
  const headers = await getAuthHeaders();

  const res = await fetch(`${apiUrl}/api/ingest/jobs/${jobId}`, {
    headers,
    credentials: "include",
  });

  if (!res.ok) return null;
  return res.json();
}

async function triggerProcessing() {
  const apiUrl = await getApiUrl();
  const headers = await getAuthHeaders();

  const res = await fetch(`${apiUrl}/api/ingest/process-jobs`, {
    method: "POST",
    headers,
    credentials: "include",
  });

  if (!res.ok) return null;
  return res.json();
}

async function loginToAskly(email, password) {
  const apiUrl = await getApiUrl();

  const res = await fetch(`${apiUrl}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    credentials: "include",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || err.message || `Login failed: HTTP ${res.status}`);
  }

  const data = await res.json();

  // Store session
  await chrome.storage.local.set({
    askly_session: {
      token: data.token || data.session?.token,
      user: data.user,
    },
  });

  return data;
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
  const handle = async () => {
    try {
      switch (msg.type) {
        case "PAGE_METADATA":
          lastPageMetadata = msg.data;
          return { ok: true };

        case "GET_CACHED_METADATA":
          return { ok: true, data: lastPageMetadata };

        case "SUBMIT_CAPTURE":
          const result = await submitLesson(msg.data);
          // Trigger processing after submission
          triggerProcessing().catch(() => {}); // fire-and-forget
          return { ok: true, data: result };

        case "POLL_JOB":
          const job = await pollJobStatus(msg.jobId);
          if (job) {
            await updateCaptureStatus(msg.jobId, job.status);
          }
          return { ok: true, data: job };

        case "LOGIN":
          const loginResult = await loginToAskly(msg.email, msg.password);
          return { ok: true, data: loginResult };

        case "LOGOUT":
          await chrome.storage.local.remove(["askly_session"]);
          return { ok: true };

        case "GET_SESSION":
          const { askly_session } = await chrome.storage.local.get(
            "askly_session"
          );
          return { ok: true, data: askly_session || null };

        case "GET_RECENT_CAPTURES":
          const { recent_captures = [] } = await chrome.storage.local.get(
            "recent_captures"
          );
          return { ok: true, data: recent_captures };

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
