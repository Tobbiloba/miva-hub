/**
 * Askly Capture — popup.
 * Connect, watch and control automatic capture, capture the page that's
 * open, and see recent captures with their live state.
 */

const $ = (id) => document.getElementById(id);
const LMS_HOST = "lms.miva.university";
const LMS_LOGIN_URL = "https://lms.miva.university/login/index.php";

const TYPE_LABEL = {
  video: "Video",
  pdf: "PDF",
  quiz: "Quiz",
  assignment_external: "Assignment",
  page: "Reading",
  reading: "Reading",
  lecture: "Lecture",
  course: "Course",
};
const STATE_LABEL = {
  ready: "Ready",
  processing: "Reading",
  in_review: "In review",
  no_text: "No text",
  failed: "Failed",
};

let state = null;
let pageMeta = null;
let pollTimer = null;

function send(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (reply) => {
      resolve(chrome.runtime.lastError ? { ok: false, error: chrome.runtime.lastError.message } : reply);
    });
  });
}

function show(id, visible) {
  $(id).hidden = !visible;
}

function ago(ts) {
  if (!ts) return "never";
  const mins = Math.round((Date.now() - new Date(ts).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const child of [].concat(children)) if (child) node.append(child);
  return node;
}

async function openAskly(path = "/student/capture") {
  const apiUrl = state?.apiUrl || "https://askly-miva.vercel.app";
  await chrome.tabs.create({ url: `${apiUrl}${path}` });
  window.close();
}

// ── Boot ────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
  $("settingsBtn").addEventListener("click", () => chrome.runtime.openOptionsPage());
  $("openAskly").addEventListener("click", () => openAskly());
  $("connectBtn").addEventListener("click", () => openAskly("/student/capture?connect=1"));
  $("passwordBtn").addEventListener("click", () => chrome.runtime.openOptionsPage());
  $("autoSync").addEventListener("change", (e) => send({ type: "SET_AUTO_SYNC", on: e.target.checked }));
  $("captureBtn").addEventListener("click", capturePage);

  await refresh();
  if (state?.connected) {
    renderPage();
    loadRecent(true);
  }
});

async function refresh() {
  const reply = await send({ type: "GET_STATE" });
  state = reply?.ok ? reply.data : null;
  show("loadingView", false);
  show("connectView", !state?.connected);
  show("mainView", !!state?.connected);
  renderStatus();
  if (state?.connected) renderSync();
  schedule();
}

function schedule() {
  clearTimeout(pollTimer);
  if (!state?.connected) return;
  pollTimer = setTimeout(async () => {
    await refresh();
    if (state?.syncing) loadRecent();
  }, state.syncing ? 1500 : 6000);
}

// ── Header status ───────────────────────────────────────────────

function renderStatus() {
  const pill = $("statusPill");
  if (!state?.connected) {
    pill.hidden = true;
    return;
  }
  const sync = state.sync;
  const [text, tone] = state.syncing
    ? ["Capturing", "busy"]
    : sync?.status === "needs_login"
      ? ["LMS login needed", "warn"]
      : ["Connected", "ok"];
  pill.textContent = text;
  pill.className = `pill pill-${tone}`;
  pill.hidden = false;
}

// ── Automatic capture ───────────────────────────────────────────

function courseCounts(courses) {
  const capturing = (courses || []).filter((c) => c.status === "capture");
  const total = capturing.reduce((n, c) => n + c.total, 0);
  const done = capturing.reduce((n, c) => n + c.captured + c.skipped + c.failed, 0);
  const captured = capturing.reduce((n, c) => n + c.captured, 0);
  return { capturing, total, done, captured };
}

function renderSync() {
  const sync = state.sync;
  const { capturing, total, done, captured } = courseCounts(sync?.courses);
  const actions = $("syncActions");
  actions.replaceChildren();
  $("autoSync").checked = state.autoSync;

  let summary;
  if (state.syncing) {
    summary = `Going through ${capturing.length} course${capturing.length === 1 ? "" : "s"}. You can close this.`;
  } else if (sync?.status === "needs_login") {
    summary = "Log in to your LMS and it carries on by itself.";
  } else if (!state.courses) {
    summary = "Capture all your courses in one go. Pick them on Askly.";
  } else if (sync?.status === "failed") {
    summary = sync.error || "The last sync hit a problem.";
  } else if (sync?.status === "stopped") {
    summary = `Stopped ${ago(sync.finishedAt)}. ${captured} new lesson${captured === 1 ? "" : "s"} before that.`;
  } else if (sync?.finishedAt) {
    summary = `Last synced ${ago(sync.finishedAt)} · ${captured} new lesson${captured === 1 ? "" : "s"}`;
    // e.g. course files on Google Drive the browser couldn't open yet
    if (sync.error) summary += `. ${sync.error}`;
  } else {
    summary = `${state.courses} course${state.courses === 1 ? "" : "s"} picked.`;
  }
  $("syncSummary").textContent = summary;

  // Live progress
  show("syncProgress", !!state.syncing);
  if (state.syncing) {
    const pct = total ? Math.round((done / total) * 100) : 0;
    const wrap = $("syncBarWrap");
    wrap.classList.toggle("indeterminate", !total);
    wrap.setAttribute("aria-valuenow", String(pct));
    $("syncBar").style.width = total ? `${pct}%` : "";
    $("syncCurrent").textContent = sync?.currentItem ? `Reading ${sync.currentItem}` : "Starting…";
    $("syncCourses").replaceChildren(
      ...capturing.slice(0, 8).map((c) => {
        const n = c.captured + c.skipped + c.failed;
        const p = c.done ? 100 : c.total ? Math.round((n / c.total) * 100) : 0;
        return el("li", { class: c.done ? "done" : "" }, [
          el("span", { class: "code" }, [
            el("span", { text: c.code }),
            el("span", { class: "muted", text: c.done ? "✓" : c.total ? `${n}/${c.total}` : "…" }),
          ]),
          el("span", { class: "bar" }, el("span", { class: "bar-fill", style: `width:${p}%;display:block` })),
        ]);
      }),
    );
  }

  if (state.syncing) {
    actions.append(
      el("button", {
        class: "btn btn-secondary",
        type: "button",
        text: "Stop",
        onclick: async (e) => {
          e.target.disabled = true;
          await send({ type: "STOP_SYNC" });
          refresh();
        },
      }),
    );
  } else if (sync?.status === "needs_login") {
    actions.append(
      el("button", {
        class: "btn btn-primary",
        type: "button",
        text: "Open the LMS",
        onclick: () => chrome.tabs.create({ url: LMS_LOGIN_URL }),
      }),
    );
  } else if (!state.courses) {
    actions.append(
      el("button", {
        class: "btn btn-primary",
        type: "button",
        text: "Choose my courses",
        onclick: () => openAskly(),
      }),
    );
  } else {
    actions.append(
      el("button", { class: "btn btn-primary", type: "button", text: "Sync now", onclick: syncNow }),
      el("button", { class: "btn btn-secondary", type: "button", text: "Courses", onclick: () => openAskly() }),
    );
  }
}

async function syncNow(e) {
  e.target.disabled = true;
  e.target.textContent = "Starting…";
  const reply = await send({ type: "SYNC_NOW" });
  if (!reply?.ok) {
    $("syncSummary").textContent = reply?.error || "Couldn't start";
  }
  refresh();
}

// ── This page ───────────────────────────────────────────────────

function hint(text) {
  $("hintText").textContent = text;
  show("hintCard", true);
  show("pageCard", false);
}

async function renderPage() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let url;
  try {
    url = new URL(tab?.url || "");
  } catch {
    url = null;
  }
  if (!url || url.hostname !== LMS_HOST) {
    hint("Open a lesson or a course on your LMS to capture it from here.");
    return;
  }
  if (url.pathname.startsWith("/login")) {
    hint("Log in to your LMS, then open a lesson or a course.");
    return;
  }

  // A course page: capture the whole course
  if (url.pathname === "/course/view.php" && url.searchParams.get("id")) {
    const lmsId = Number(url.searchParams.get("id"));
    show("hintCard", false);
    show("pageCard", true);
    show("pageDetails", false);
    show("pageCaptured", false);
    $("pageType").textContent = TYPE_LABEL.course;
    $("pageTitle").textContent = (tab.title || "This course").replace(/\s*\|\s*Miva\s*$/i, "").replace(/^Course:\s*/i, "");
    $("pageMeta").textContent = "Saves every lesson in it, then keeps it up to date daily.";
    $("captureBtn").textContent = "Capture this whole course";
    $("captureBtn").onclick = async () => {
      setBusy(true, "Starting…");
      const reply = await send({ type: "CAPTURE_COURSE", lmsId });
      setBusy(false, "Capture this whole course");
      if (reply?.ok && reply.data?.needsLogin) message("Log in to your LMS first.", false);
      else if (reply?.ok) message("Capturing this course. Watch the progress above.", true);
      else message(reply?.error || "Couldn't start", false);
      refresh();
    };
    return;
  }

  let meta = null;
  try {
    meta = await chrome.tabs.sendMessage(tab.id, { type: "GET_PAGE_METADATA" });
  } catch {
    meta = null;
  }
  if (!meta || meta.page_type === "unknown") {
    hint("Nothing to capture on this page. Open a lesson, or a course page to capture the whole course.");
    return;
  }
  pageMeta = meta;
  show("hintCard", false);
  show("pageCard", true);
  $("pageType").textContent = TYPE_LABEL[meta.page_type] || meta.page_type;
  $("pageTitle").textContent = meta.lesson_title;
  $("pageMeta").textContent = [meta.course_code, meta.week_number != null ? `Week ${meta.week_number}` : null]
    .filter(Boolean)
    .join(" · ") || "Course not detected — add it under Edit details";
  $("courseCode").value = meta.course_code || "";
  $("weekNumber").value = meta.week_number ?? "";
  $("lessonTitle").value = meta.lesson_title || "";
  const pdfSelect = $("pdfSelect");
  pdfSelect.replaceChildren(
    ...(meta.all_pdfs || []).map((p, i) => el("option", { value: String(i), text: p.filename })),
  );
  pdfSelect.disabled = (meta.all_pdfs || []).length < 2;
  pdfSelect.onchange = () => {
    const pdf = meta.all_pdfs[Number(pdfSelect.value)];
    pageMeta.pdf_url = pdf.url;
    pageMeta.pdf_filename = pdf.filename;
  };
  if (!meta.course_code) $("pageDetails").open = true;

  const urls = await send({ type: "GET_CAPTURED_URLS" });
  const bare = `${url.origin}${url.pathname}?id=${url.searchParams.get("id")}`;
  const already = urls?.ok && urls.data.includes(bare);
  show("pageCaptured", !!already);
  $("captureBtn").textContent = already ? "Capture again" : "Capture this page";
}

function setBusy(busy, label) {
  $("captureBtn").disabled = busy;
  $("captureBtn").textContent = label;
}

function message(text, ok) {
  const msg = $("pageMsg");
  msg.textContent = text;
  msg.className = `msg ${ok ? "ok" : "err"}`;
  msg.hidden = false;
}

async function capturePage() {
  if (!pageMeta) return;
  const courseCode = $("courseCode").value.trim();
  const title = $("lessonTitle").value.trim();
  if (!courseCode) {
    $("pageDetails").open = true;
    message("Add the course code (e.g. COS409).", false);
    $("courseCode").focus();
    return;
  }
  if (!title) {
    $("pageDetails").open = true;
    message("Add a title.", false);
    return;
  }
  const week = $("weekNumber").value;
  setBusy(true, "Capturing…");
  const reply = await send({
    type: "SUBMIT_CAPTURE",
    data: {
      ...pageMeta,
      course_code: courseCode,
      lesson_title: title,
      week_number: week === "" ? null : Number(week),
    },
  });
  setBusy(false, "Capture again");
  if (reply?.ok) {
    const d = reply.data || {};
    message(
      d.message ||
        (d.visibility === "private"
          ? "Captured. Askly will be able to answer from it in a minute."
          : "Captured. It joins the course library after review."),
      true,
    );
    show("pageCaptured", false);
    loadRecent(true);
  } else {
    message(reply?.error || "Capture failed", false);
  }
}

// ── Recent captures ─────────────────────────────────────────────

let recentLoaded = false;

async function loadRecent(fresh = false) {
  const list = $("recentList");
  if (!recentLoaded) {
    list.replaceChildren(...[0, 1, 2].map(() => el("li", {}, el("div", { class: "skeleton", style: "flex:1" }))));
  }
  const reply = await send({ type: "GET_CAPTURES", fresh });
  recentLoaded = true;
  if (!reply?.ok) {
    list.replaceChildren(
      el("li", { class: "empty" }, [
        el("span", { text: "Couldn't load your captures. " }),
        el("button", { class: "btn btn-link", type: "button", text: "Try again", onclick: () => loadRecent(true) }),
      ]),
    );
    return;
  }
  const captures = reply.data || [];
  $("recentCount").textContent = captures.length ? `${captures.length} total` : "";
  if (!captures.length) {
    list.replaceChildren(el("li", { class: "empty", text: "Nothing captured yet." }));
    return;
  }
  list.replaceChildren(
    ...captures.slice(0, 5).map((c) =>
      el("li", {}, [
        el("div", { class: "info" }, [
          el("div", { class: "title", text: c.title, title: c.error || c.title }),
          el("div", {
            class: "meta",
            text: [c.course, TYPE_LABEL[c.contentType] || c.contentType, ago(c.createdAt)].filter(Boolean).join(" · "),
          }),
        ]),
        el("span", { class: `state state-${c.state}`, text: STATE_LABEL[c.state] || c.state }),
      ]),
    ),
  );
  // Keep processing items moving while the popup is open
  if (captures.slice(0, 5).some((c) => c.state === "processing")) {
    setTimeout(() => loadRecent(true), 4000);
  }
}
