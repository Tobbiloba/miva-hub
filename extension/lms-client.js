/**
 * Askly Capture — reading MIVA's LMS with the student's own login.
 *
 * Uses the same internal calls the LMS's own pages make (Moodle's AJAX
 * service, authorised by the session cookie + sesskey), so the student's
 * login never leaves their browser. Read-only: nothing here submits,
 * starts an attempt or marks anything complete.
 */

export const LMS_ORIGIN = "https://lms.miva.university";
export const LMS_LOGIN_URL = `${LMS_ORIGIN}/login/index.php`;

export class LmsLoggedOut extends Error {
  constructor() {
    super("You're not logged in to the LMS");
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The session key the LMS's AJAX calls need; throws when logged out. */
export async function getSesskey() {
  const res = await fetch(`${LMS_ORIGIN}/my/`, { credentials: "include" });
  if (new URL(res.url).pathname.startsWith("/login")) throw new LmsLoggedOut();
  const html = await res.text();
  const m = html.match(/"sesskey":"([A-Za-z0-9]+)"/);
  if (!m) throw new LmsLoggedOut();
  return m[1];
}

async function ajax(sesskey, methodname, args) {
  const res = await fetch(
    `${LMS_ORIGIN}/lib/ajax/service.php?sesskey=${encodeURIComponent(sesskey)}&info=${methodname}`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ index: 0, methodname, args }]),
    },
  );
  if (!res.ok) throw new Error(`The LMS answered ${res.status}`);
  const [result] = await res.json();
  if (result?.error) {
    const code = result.exception?.errorcode || "";
    if (/login|sesskey|requirelogin/i.test(code)) throw new LmsLoggedOut();
    throw new Error(result.exception?.message || "The LMS refused the request");
  }
  return result.data;
}

/**
 * The student's LMS courses. `inProgress` is the LMS's own notion of a
 * current course (by its dates), used to pre-tick the course picker.
 */
export async function listCourses(sesskey) {
  const call = (classification) =>
    ajax(sesskey, "core_course_get_enrolled_courses_by_timeline_classification", {
      offset: 0,
      limit: 0,
      classification,
      sort: "fullname",
    });
  const [all, current] = await Promise.all([call("all"), call("inprogress")]);
  const currentIds = new Set((current?.courses || []).map((c) => c.id));
  return (all?.courses || [])
    .filter((c) => !c.hidden)
    .map((c) => ({
      lmsId: c.id,
      shortname: decode(c.shortname),
      fullname: decode(c.fullname),
      inProgress: currentIds.has(c.id),
      progress: typeof c.progress === "number" ? c.progress : null,
    }));
}

const MODULES = new Set(["page", "url", "quiz", "assign"]);

/**
 * Every lesson in a course, in course order, from one call. Forums, polls,
 * feedback forms and hidden items are left out.
 */
export async function courseItems(sesskey, courseId) {
  const state = JSON.parse(await ajax(sesskey, "core_courseformat_get_state", { courseid: courseId }));
  const cms = new Map(state.cm.map((cm) => [String(cm.id), cm]));
  const items = [];
  for (const section of state.section) {
    if (section.visible === false) continue;
    for (const id of section.cmlist) {
      const cm = cms.get(String(id));
      if (!cm || !MODULES.has(cm.module) || cm.uservisible === false || !cm.url) continue;
      items.push({
        cmId: Number(cm.id),
        module: cm.module,
        name: decode(cm.name),
        url: cm.url,
        section: decode(section.title || ""),
      });
    }
  }
  return items;
}

/**
 * Fetch an LMS page, politely: MIVA's server is slow and answers bursts
 * with 504s, so failures are retried after a growing pause.
 */
export async function fetchLmsPage(url, { attempts = 3 } = {}) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    if (i) await sleep(4000 * 3 ** (i - 1));
    try {
      const res = await fetch(url, { credentials: "include" });
      if (new URL(res.url).pathname.startsWith("/login")) throw new LmsLoggedOut();
      if (res.ok) return res.text();
      lastError = new Error(`The LMS answered ${res.status}`);
      if (res.status < 500) break;
    } catch (e) {
      if (e instanceof LmsLoggedOut) throw e;
      lastError = e;
    }
  }
  throw lastError;
}

function decode(s) {
  return String(s || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}
