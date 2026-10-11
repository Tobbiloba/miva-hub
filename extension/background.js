/**
 * Askly Capture — background service worker.
 *
 * Holds the connection to Askly (a revocable bearer token), answers the
 * popup, the LMS content script and the Askly page bridge, and runs
 * automatic capture: it asks Askly what to capture, then hands the work to
 * the offscreen crawler and relays its progress (badge, popup, page).
 */

import {
  ALLOWED_API_ORIGINS,
  ApiError,
  DEFAULT_API_URL,
  api,
  submitCapture,
} from "./askly-api.js";
import { LmsLoggedOut, getSesskey, listCourses } from "./lms-client.js";

const VERSION = chrome.runtime.getManifest().version;
const SYNC_ALARM = "askly-sync-check";
const SYNC_EVERY_MS = 20 * 60 * 60 * 1000; // "daily", with slack for when Chrome was closed
const MAX_IGNORED = 5000;

// ── Storage ─────────────────────────────────────────────────────

const store = {
  get: (keys) => chrome.storage.local.get(keys),
  set: (values) => chrome.storage.local.set(values),
  remove: (keys) => chrome.storage.local.remove(keys),
};

/** The Askly origin to use: the one the student connected from, else settings. */
async function getApiUrl() {
  const { askly_session, askly_api_url } = await store.get(["askly_session", "askly_api_url"]);
  for (const candidate of [askly_session?.apiUrl, askly_api_url]) {
    try {
      const origin = new URL(candidate).origin;
      if (ALLOWED_API_ORIGINS.includes(origin)) return origin;
    } catch {
      // unset or invalid
    }
  }
  return DEFAULT_API_URL;
}

async function getSession() {
  const { askly_session } = await store.get("askly_session");
  if (!askly_session?.token) return null;
  if (askly_session.expiresAt && Date.parse(askly_session.expiresAt) <= Date.now()) {
    await forgetSession();
    return null;
  }
  return askly_session;
}

/** {apiUrl, token} for API calls; throws when not connected. */
async function getCtx() {
  const session = await getSession();
  if (!session) throw new Error("Connect the extension to Askly first");
  return { apiUrl: await getApiUrl(), token: session.token };
}

async function forgetSession() {
  await store.remove(["askly_session", "sync_selection", "sync_local", "captured_cache"]);
  await setBadge(null);
  broadcastStatus();
}

/** Any API call that comes back 401 means the token was revoked or expired. */
async function guard(promise) {
  try {
    return await promise;
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) await forgetSession();
    throw e;
  }
}

async function saveSession(data, apiUrl) {
  await store.set({
    askly_session: {
      token: data.token,
      expiresAt: data.expires_at || data.expiresAt,
      user: data.user,
      apiUrl,
    },
  });
  broadcastStatus();
}

// ── Sign-in (fallback: email + password from the options page) ──

async function loginWithPassword(email, password) {
  const apiUrl = await getApiUrl();
  const res = await fetch(`${apiUrl}/api/extension/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, label: "Askly Capture" }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || body.message || `Login failed (HTTP ${res.status})`);
  await saveSession(body, apiUrl);
  return { user: body.user };
}

async function logout() {
  try {
    // Revoke server-side so a copied token stops working too
    await api(await getCtx(), "/api/extension/token", { method: "DELETE" });
  } catch {
    // Already signed out / offline — still forget it here
  }
  await stopSync();
  await forgetSession();
}

// ── Badge ───────────────────────────────────────────────────────

async function setBadge(sync) {
  let text = "";
  let color = "#1d1d1f";
  if (sync?.status === "running") {
    const courses = (sync.courses || []).filter((c) => c.status === "capture");
    const total = courses.reduce((n, c) => n + c.total, 0);
    const done = courses.reduce((n, c) => n + c.captured + c.skipped + c.failed, 0);
    text = total ? `${Math.min(99, Math.round((done / total) * 100))}%` : "…";
  } else if (sync?.status === "needs_login" || sync?.status === "failed") {
    text = "!";
    color = "#b45309";
  }
  await chrome.action.setBadgeText({ text });
  if (text) await chrome.action.setBadgeBackgroundColor({ color });
}

// ── Askly page bridge ───────────────────────────────────────────

// Tabs with the Askly page open, so status changes reach them right away
const bridgeTabs = new Set();

async function extensionStatus() {
  const [session, { sync_local }] = await Promise.all([getSession(), store.get("sync_local")]);
  return {
    version: VERSION,
    connected: !!session,
    syncing: sync_local?.status === "running" && (await crawlerRunning()),
  };
}

async function broadcastStatus() {
  if (!bridgeTabs.size) return;
  const status = await extensionStatus();
  for (const tabId of bridgeTabs) {
    chrome.tabs.sendMessage(tabId, { type: "BRIDGE_STATUS", status }).catch(() => bridgeTabs.delete(tabId));
  }
}

/** A request from the Askly page (relayed by askly-bridge.js). */
async function handleBridge(msg, sender) {
  const origin = new URL(sender.url).origin;
  if (!ALLOWED_API_ORIGINS.includes(origin)) throw new Error("Not an Askly page");
  if (sender.tab?.id != null) bridgeTabs.add(sender.tab.id);

  switch (msg.request) {
    case "HELLO":
      return extensionStatus();

    case "CONNECT": {
      // The page minted this token for its signed-in student
      if (typeof msg.token !== "string" || !msg.token.startsWith("askly_ext_")) {
        throw new Error("That connection code isn't valid");
      }
      const previous = await getSession();
      if (previous && previous.user?.id !== msg.user?.id) {
        await stopSync();
        await store.remove(["sync_selection", "sync_local", "captured_cache"]);
      }
      await saveSession({ token: msg.token, expires_at: msg.expiresAt, user: msg.user }, origin);
      return extensionStatus();
    }

    case "DISCONNECT":
      await stopSync();
      await forgetSession();
      return extensionStatus();

    case "LIST_LMS_COURSES": {
      try {
        const sesskey = await getSesskey();
        return { loggedIn: true, courses: await listCourses(sesskey) };
      } catch (e) {
        if (e instanceof LmsLoggedOut) return { loggedIn: false, courses: [] };
        throw e;
      }
    }

    case "START_SYNC":
      return startSync(sanitizeCourses(msg.courses), { manual: true });

    case "SYNC_NOW":
      return syncNow();

    case "STOP_SYNC":
      return { stopped: await stopSync() };

    default:
      throw new Error("Unknown request");
  }
}

function sanitizeCourses(courses) {
  if (!Array.isArray(courses) || !courses.length) throw new Error("Pick at least one course");
  return courses.slice(0, 80).map((c) => ({
    lmsId: Number(c.lmsId),
    shortname: String(c.shortname || "").slice(0, 200),
    fullname: String(c.fullname || "").slice(0, 400),
  }));
}

// ── Automatic capture ───────────────────────────────────────────

async function crawlerRunning() {
  const contexts = await chrome.runtime.getContexts({ contextTypes: ["OFFSCREEN_DOCUMENT"] });
  if (!contexts.length) return false;
  const reply = await chrome.runtime
    .sendMessage({ target: "offscreen", type: "PING" })
    .catch(() => null);
  return !!reply?.running;
}

async function ensureOffscreen() {
  const contexts = await chrome.runtime.getContexts({ contextTypes: ["OFFSCREEN_DOCUMENT"] });
  if (contexts.length) return;
  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: ["DOM_PARSER"],
    justification: "Read LMS lesson pages during automatic capture",
  });
}

async function recordLocal(sync) {
  await store.set({ sync_local: { ...sync, updatedAt: Date.now() } });
  await setBadge(sync);
  broadcastStatus();
}

/** Tell Askly why a sync couldn't run (shown on the Capture page). */
async function reportToAskly(patch) {
  try {
    await guard(api(await getCtx(), "/api/ingest/sync", { method: "PATCH", body: JSON.stringify(patch) }));
  } catch {
    // best-effort
  }
}

/**
 * Start capturing these LMS courses. Asks Askly which ones it can capture
 * (enrolling the student / asking admins for missing courses), then hands
 * the run to the offscreen crawler.
 */
async function startSync(courses, { manual = false } = {}) {
  const ctx = await getCtx();
  if (await crawlerRunning()) throw new Error("Already capturing. Stop it first to start again.");

  try {
    await getSesskey();
  } catch (e) {
    if (!(e instanceof LmsLoggedOut)) throw e;
    // Picks up again by itself when the student next opens the LMS
    await store.set({ sync_selection: courses, resume_after_login: true });
    const sync = { status: "needs_login", courses: [], error: null, finishedAt: Date.now() };
    await recordLocal(sync);
    await reportToAskly({ status: "needs_login", error: "Not logged in to the LMS" });
    return { needsLogin: true };
  }

  const started = await guard(
    api(ctx, "/api/ingest/sync/start", { method: "POST", body: JSON.stringify({ courses }) }),
  );
  const { ignored_sources = [] } = await store.get("ignored_sources");
  await store.set({ sync_selection: courses, resume_after_login: false });
  await recordLocal({
    status: "running",
    startedAt: Date.now(),
    manual,
    courses: started.courses.map((c) => ({
      ...c,
      total: 0,
      captured: 0,
      skipped: 0,
      failed: 0,
      done: c.status !== "capture",
    })),
    currentItem: null,
    error: null,
  });

  await ensureOffscreen();
  const reply = await chrome.runtime.sendMessage({
    target: "offscreen",
    type: "RUN",
    ctx,
    courses: started.courses,
    capturedSources: started.capturedSources,
    ignoredSources: ignored_sources,
  });
  if (!reply?.ok) throw new Error(reply?.error || "Couldn't start capturing");
  return { started: true, courses: started.courses };
}

async function syncNow() {
  const { sync_selection } = await store.get("sync_selection");
  if (!sync_selection?.length) throw new Error("Pick your courses on the Askly Capture page first");
  return startSync(sync_selection, { manual: true });
}

/** "Capture this whole course" from the popup: add it to the picked courses and sync. */
async function captureCourse(lmsId) {
  let courses;
  try {
    courses = await listCourses(await getSesskey());
  } catch (e) {
    if (e instanceof LmsLoggedOut) return { needsLogin: true };
    throw e;
  }
  const course = courses.find((c) => c.lmsId === lmsId);
  if (!course) throw new Error("This course isn't in your LMS course list");
  const { sync_selection = [] } = await store.get("sync_selection");
  const selection = [
    ...sync_selection.filter((c) => c.lmsId !== lmsId),
    { lmsId, shortname: course.shortname, fullname: course.fullname },
  ];
  return startSync(selection, { manual: true });
}

async function stopSync() {
  if (!(await crawlerRunning())) return false;
  await chrome.runtime.sendMessage({ target: "offscreen", type: "STOP" }).catch(() => {});
  return true;
}

/** Progress and the end of a run, from the crawler. */
async function onSyncEvent(msg) {
  const { sync_local } = await store.get("sync_local");
  const sync = {
    ...(sync_local || {}),
    ...msg.state,
    finishedAt: msg.kind === "finished" ? Date.now() : null,
  };
  await recordLocal(sync);
  if (msg.kind !== "finished") return;

  if (msg.newlyIgnored?.length) {
    const { ignored_sources = [] } = await store.get("ignored_sources");
    await store.set({
      ignored_sources: [...new Set([...ignored_sources, ...msg.newlyIgnored])].slice(-MAX_IGNORED),
    });
  }
  if (sync.status === "needs_login") await store.set({ resume_after_login: true });
  await store.remove("captured_cache");
  // The crawler's page isn't needed until the next run
  await chrome.offscreen.closeDocument().catch(() => {});
}

/** Hourly: run the daily sync when it's due. */
async function maybeAutoSync() {
  const { auto_sync = true, sync_selection, sync_local } = await store.get([
    "auto_sync",
    "sync_selection",
    "sync_local",
  ]);
  if (!auto_sync || !sync_selection?.length || !(await getSession())) return;
  if (await crawlerRunning()) return;
  const last = sync_local?.finishedAt || sync_local?.startedAt || 0;
  if (Date.now() - last < SYNC_EVERY_MS) return;
  await startSync(sync_selection).catch(() => {});
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(SYNC_ALARM, { periodInMinutes: 60, delayInMinutes: 1 });
});
chrome.runtime.onStartup.addListener(async () => {
  chrome.alarms.create(SYNC_ALARM, { periodInMinutes: 60, delayInMinutes: 1 });
  const { sync_local } = await store.get("sync_local");
  // Chrome closed mid-run: the crawler is gone, so the run is over
  if (sync_local?.status === "running") {
    await recordLocal({ ...sync_local, status: "stopped", finishedAt: Date.now() });
    await reportToAskly({ status: "stopped", currentItem: null });
  } else {
    await setBadge(sync_local);
  }
});
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SYNC_ALARM) maybeAutoSync();
});

// ── Captures (popup list + "already captured" marks) ───────────

const CAPTURED_CACHE_MS = 2 * 60 * 1000;

async function getCaptures({ fresh = false } = {}) {
  const { captured_cache } = await store.get("captured_cache");
  if (!fresh && captured_cache && Date.now() - captured_cache.at < CAPTURED_CACHE_MS) {
    return captured_cache.captures;
  }
  const { captures } = await guard(api(await getCtx(), "/api/ingest/captures"));
  const slim = captures.map((c) => ({
    key: c.key,
    title: c.title,
    contentType: c.contentType,
    course: c.course?.code,
    state: c.state,
    error: c.error,
    createdAt: c.createdAt,
    sourceUrl: c.sourceUrl,
  }));
  await store.set({ captured_cache: { at: Date.now(), captures: slim } });
  return slim;
}

/** LMS page URLs already in Askly (ignoring "#file=" attachments). */
async function capturedUrls() {
  const captures = await getCaptures();
  return [
    ...new Set(
      captures
        .filter((c) => c.sourceUrl && c.state !== "failed")
        .map((c) => c.sourceUrl.split("#")[0]),
    ),
  ];
}

// ── Messages ────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Only this extension's own pages and content scripts may talk to us
  if (sender.id !== chrome.runtime.id || msg?.target === "offscreen") return false;

  const handle = async () => {
    switch (msg.type) {
      case "BRIDGE":
        return handleBridge(msg, sender);

      case "SYNC_EVENT":
        // Only the crawler sends these
        if (!sender.url?.endsWith("/offscreen.html")) throw new Error("Not allowed");
        await onSyncEvent(msg);
        return null;

      case "GET_STATE": {
        const [session, local, apiUrl] = await Promise.all([
          getSession(),
          store.get(["sync_local", "sync_selection", "auto_sync"]),
          getApiUrl(),
        ]);
        return {
          connected: !!session,
          user: session?.user || null,
          apiUrl,
          version: VERSION,
          sync: local.sync_local || null,
          syncing: local.sync_local?.status === "running" && (await crawlerRunning()),
          courses: local.sync_selection?.length || 0,
          autoSync: local.auto_sync !== false,
        };
      }

      case "LOGIN":
        return loginWithPassword(msg.email, msg.password);

      case "LOGOUT":
        await logout();
        return null;

      case "SUBMIT_CAPTURE": {
        const result = await guard(submitCapture(await getCtx(), msg.data));
        await store.remove("captured_cache");
        return result;
      }

      case "GET_CAPTURES":
        return getCaptures({ fresh: !!msg.fresh });

      case "GET_CAPTURED_URLS":
        return (await getSession()) ? capturedUrls() : [];

      case "SYNC_NOW":
        return syncNow();

      case "CAPTURE_COURSE":
        return captureCourse(Number(msg.lmsId));

      case "STOP_SYNC":
        return { stopped: await stopSync() };

      case "SET_AUTO_SYNC":
        await store.set({ auto_sync: !!msg.on });
        return { autoSync: !!msg.on };

      case "LMS_PAGE_VISIT": {
        // The student just logged in to the LMS: carry on a sync that was waiting for it
        if (!msg.loggedIn) return null;
        const { resume_after_login, sync_selection } = await store.get([
          "resume_after_login",
          "sync_selection",
        ]);
        if (resume_after_login && sync_selection?.length && !(await crawlerRunning())) {
          await store.set({ resume_after_login: false });
          startSync(sync_selection).catch(() => {});
        }
        return null;
      }

      default:
        throw new Error("Unknown message type");
    }
  };

  handle().then(
    (data) => sendResponse({ ok: true, data }),
    (error) => sendResponse({ ok: false, error: error?.message || String(error) }),
  );
  return true; // keep the channel open for the async response
});

