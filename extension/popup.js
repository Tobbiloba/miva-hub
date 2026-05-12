/**
 * Askly Capture — Popup Script
 * Manages the capture form UI, auth state, and communication
 * with the background service worker.
 */

// DOM refs
const loginPrompt = document.getElementById("loginPrompt");
const openLoginBtn = document.getElementById("openLoginBtn");
const notMivaPage = document.getElementById("notMivaPage");
const unknownPage = document.getElementById("unknownPage");
const captureForm = document.getElementById("captureForm");
const contentTypeBadge = document.getElementById("contentTypeBadge");
const detectionStatus = document.getElementById("detectionStatus");
const courseCodeInput = document.getElementById("courseCode");
const weekNumberInput = document.getElementById("weekNumber");
const lessonTitleInput = document.getElementById("lessonTitle");
const sessionLabelInput = document.getElementById("sessionLabel");
const pdfSelector = document.getElementById("pdfSelector");
const pdfSelect = document.getElementById("pdfSelect");
const captureBtn = document.getElementById("captureBtn");
const captureError = document.getElementById("captureError");
const captureSuccess = document.getElementById("captureSuccess");
const capturesList = document.getElementById("capturesList");
const settingsBtn = document.getElementById("settingsBtn");

let currentMetadata = null;

// ── Initialization ──────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
  // Check login state
  const sessionRes = await sendMessage({ type: "GET_SESSION" });
  const isLoggedIn = sessionRes?.ok && sessionRes.data?.cookieValue;

  if (!isLoggedIn) {
    loginPrompt.style.display = "block";
    captureForm.style.display = "none";
    notMivaPage.style.display = "none";
    loadRecentCaptures();
    return;
  }

  // Get active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.url?.includes("lms.miva.university")) {
    notMivaPage.style.display = "block";
    loadRecentCaptures();
    return;
  }

  // Try to get metadata from content script
  try {
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "GET_PAGE_METADATA",
    });
    if (response) {
      populateForm(response);
    } else {
      // Fall back to cached metadata from background
      const cached = await sendMessage({ type: "GET_CACHED_METADATA" });
      if (cached?.ok && cached.data) {
        populateForm(cached.data);
      } else {
        unknownPage.style.display = "block";
      }
    }
  } catch {
    // Content script not injected yet — try cached
    const cached = await sendMessage({ type: "GET_CACHED_METADATA" });
    if (cached?.ok && cached.data) {
      populateForm(cached.data);
    } else {
      unknownPage.style.display = "block";
    }
  }

  loadRecentCaptures();
});

// ── Form population ─────────────────────────────────────────────

function populateForm(metadata) {
  currentMetadata = metadata;

  if (metadata.page_type === "unknown") {
    unknownPage.style.display = "block";
    captureForm.style.display = "none";
    return;
  }

  captureForm.style.display = "block";

  // Content type badge
  const badgeLabels = {
    video: "VIDEO",
    pdf: "PDF",
    quiz: "QUIZ",
    assignment_external: "ASSIGNMENT",
  };
  contentTypeBadge.textContent = badgeLabels[metadata.page_type] || metadata.page_type.toUpperCase();
  contentTypeBadge.className = `badge ${metadata.page_type}`;

  // Detection status with extra info
  let statusMsg = "Auto-detected from page";
  if (metadata.page_type === "quiz" && metadata.quiz_questions?.length) {
    statusMsg += ` — ${metadata.quiz_questions.length} question(s) found`;
  }
  if (metadata.page_type === "assignment_external" && metadata.assignment_metadata?.due_date) {
    statusMsg += ` — Due: ${metadata.assignment_metadata.due_date}`;
  }
  detectionStatus.textContent = statusMsg;

  // Fill fields
  courseCodeInput.value = metadata.course_code || "";
  weekNumberInput.value = metadata.week_number || "";
  lessonTitleInput.value = metadata.lesson_title || "";
  sessionLabelInput.value = metadata.session_label || "";

  // PDF selector (if multiple PDFs)
  if (metadata.page_type === "pdf" && metadata.all_pdfs?.length > 1) {
    pdfSelector.style.display = "block";
    pdfSelect.innerHTML = "";
    metadata.all_pdfs.forEach((pdf, i) => {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = pdf.filename;
      pdfSelect.appendChild(opt);
    });
    pdfSelect.addEventListener("change", () => {
      const idx = parseInt(pdfSelect.value);
      currentMetadata.pdf_url = metadata.all_pdfs[idx].url;
      currentMetadata.pdf_filename = metadata.all_pdfs[idx].filename;
    });
  }
}

// ── Capture submission ──────────────────────────────────────────

captureBtn.addEventListener("click", async () => {
  captureError.style.display = "none";
  captureSuccess.style.display = "none";

  // Validate required fields
  const courseCode = courseCodeInput.value.trim();
  const lessonTitle = lessonTitleInput.value.trim();

  if (!courseCode) {
    showError("Course code is required");
    return;
  }
  if (!lessonTitle) {
    showError("Lesson title is required");
    return;
  }
  if (!currentMetadata) {
    showError("No page metadata detected");
    return;
  }

  // Build submission data with user overrides
  const submitData = {
    ...currentMetadata,
    course_code: courseCode,
    week_number: weekNumberInput.value
      ? parseInt(weekNumberInput.value)
      : null,
    lesson_title: lessonTitle,
    session_label: sessionLabelInput.value.trim() || null,
  };

  captureBtn.disabled = true;
  captureBtn.textContent = "Submitting...";

  const result = await sendMessage({ type: "SUBMIT_CAPTURE", data: submitData });

  captureBtn.disabled = false;
  captureBtn.textContent = "Capture this lesson";

  if (result?.ok) {
    const id = result.data.job_id || result.data.material_id || "?";
    showSuccess(
      `Captured! ID: ${id.slice(0, 8)}... Status: ${result.data.status}`
    );
    loadRecentCaptures();
  } else {
    showError(result?.error || "Capture failed");
  }
});

// ── Settings ────────────────────────────────────────────────────

settingsBtn.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

openLoginBtn.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

// ── Recent captures ─────────────────────────────────────────────

async function loadRecentCaptures() {
  const result = await sendMessage({ type: "GET_RECENT_CAPTURES" });
  const captures = result?.ok ? result.data : [];

  if (!captures || captures.length === 0) {
    capturesList.innerHTML = '<p class="muted">No captures yet</p>';
    return;
  }

  capturesList.innerHTML = captures
    .slice(0, 5)
    .map(
      (c) => `
    <div class="capture-item">
      <div class="capture-info">
        <div class="capture-title">${escapeHtml(c.lesson_title)}</div>
        <div class="capture-meta">${escapeHtml(c.course_code || "?")} &middot; ${c.content_type} &middot; ${timeAgo(c.timestamp)}</div>
      </div>
      <span class="status-badge status-${c.status}">${c.status}</span>
    </div>
  `
    )
    .join("");
}

// ── Helpers ─────────────────────────────────────────────────────

function sendMessage(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (response) => {
      resolve(response);
    });
  });
}

function showError(msg) {
  captureError.textContent = msg;
  captureError.style.display = "block";
}

function showSuccess(msg) {
  captureSuccess.textContent = msg;
  captureSuccess.style.display = "block";
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
