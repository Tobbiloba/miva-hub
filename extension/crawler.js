/**
 * Askly Capture — automatic capture ("sync"), run in the offscreen document.
 *
 * Goes through each picked course on the LMS in course order, reads every
 * lesson page with the student's own LMS login, and sends what it finds to
 * Askly. One LMS page at a time with a pause between them, because MIVA's
 * server answers bursts with 504s. Progress goes to Askly (for the Capture
 * page) and to the background worker (badge + popup).
 */

import { ApiError, api, submitCapture } from "./askly-api.js";
import { LmsLoggedOut, courseItems, fetchLmsPage, getSesskey } from "./lms-client.js";

const L = globalThis.AsklyLms;
const PAUSE_MS = 1200;
const REPORT_EVERY_MS = 2500;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let current = null; // the run in progress, if any

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id || msg?.target !== "offscreen") return false;
  if (msg.type === "RUN") {
    if (current) {
      sendResponse({ ok: false, error: "A sync is already running" });
      return false;
    }
    current = new Run(msg);
    current.start().finally(() => {
      current = null;
    });
    sendResponse({ ok: true });
  } else if (msg.type === "STOP") {
    current?.stop();
    sendResponse({ ok: true, running: !!current });
  } else if (msg.type === "PING") {
    sendResponse({ ok: true, running: !!current });
  }
  return false;
});

class StopRun extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

class Run {
  constructor({ ctx, courses, capturedSources, ignoredSources }) {
    this.ctx = ctx;
    this.done = new Set([...(capturedSources || []), ...(ignoredSources || [])]);
    this.newlyIgnored = [];
    this.stopping = false;
    this.lastReport = 0;
    this.state = {
      status: "running",
      currentItem: null,
      error: null,
      courses: courses.map((c) => ({
        lmsId: c.lmsId,
        code: c.code,
        title: c.title,
        status: c.status,
        total: 0,
        captured: 0,
        skipped: 0,
        failed: 0,
        done: c.status !== "capture",
      })),
    };
  }

  stop() {
    this.stopping = true;
  }

  async start() {
    try {
      const sesskey = await getSesskey();
      for (const course of this.state.courses) {
        if (course.done) continue;
        await this.captureCourse(sesskey, course);
      }
      this.state.status = "done";
    } catch (e) {
      if (e instanceof StopRun) {
        this.state.status = e.status;
        this.state.error = e.message || null;
      } else if (e instanceof LmsLoggedOut) {
        this.state.status = "needs_login";
        this.state.error = "Log in to the LMS, then sync again.";
      } else {
        this.state.status = "failed";
        this.state.error = e?.message || "Something went wrong";
      }
    }
    this.state.currentItem = null;
    try {
      await this.report(true);
    } catch (e) {
      this.state.status = "failed";
      this.state.error = e?.message || this.state.error;
    }
    this.emit("finished");
  }

  async captureCourse(sesskey, course) {
    let items;
    try {
      items = await courseItems(sesskey, course.lmsId);
    } catch (e) {
      if (e instanceof LmsLoggedOut) throw e;
      course.failed = 1;
      course.done = true;
      await this.report(true);
      return;
    }
    const todo = items.filter((i) => !this.done.has(i.url));
    course.total = todo.length;
    await this.report(true);

    for (const item of todo) {
      if (this.stopping) throw new StopRun("stopped");
      this.state.currentItem = `${course.code}: ${item.name}`.slice(0, 300);
      this.emit("progress");
      const outcome = await this.captureItem(course, item);
      course[outcome]++;
      await this.report();
      await sleep(PAUSE_MS);
    }
    course.done = true;
    await this.report(true);
  }

  /** One LMS item → "captured" | "skipped" | "failed". */
  async captureItem(course, item) {
    let lessons;
    try {
      const url = item.module === "url" ? `${item.url}&redirect=0` : item.url;
      const html = await fetchLmsPage(url);
      const doc = new DOMParser().parseFromString(html, "text/html");
      lessons = lessonsFrom(course, item, doc, html);
    } catch (e) {
      if (e instanceof LmsLoggedOut) throw e;
      return "failed";
    }
    if (!lessons.length) {
      // Nothing Askly can read (interactive lesson, external link): don't
      // fetch it again on every daily sync
      this.done.add(item.url);
      this.newlyIgnored.push(item.url);
      return "skipped";
    }

    let captured = 0;
    let failed = 0;
    for (const lesson of lessons) {
      try {
        await this.submit(lesson);
        captured++;
      } catch (e) {
        if (e instanceof StopRun) throw e;
        if (e instanceof ApiError && e.status === 409) continue; // already in Askly
        failed++;
      }
    }
    this.done.add(item.url);
    if (!captured && !failed) {
      // Askly already had all of it (e.g. the same PDF linked twice)
      this.newlyIgnored.push(item.url);
      return "skipped";
    }
    return failed ? "failed" : "captured";
  }

  async submit(lesson) {
    for (let attempt = 0; ; attempt++) {
      try {
        return await submitCapture(this.ctx, lesson, { viaSync: true });
      } catch (e) {
        if (!(e instanceof ApiError)) throw e;
        if (e.status === 401) throw new StopRun("failed", e.message);
        if (e.status === 402) throw new StopRun("failed", e.message);
        if (e.status === 403 && e.body?.code === "SCHOOL_PENDING") {
          throw new StopRun("failed", e.message);
        }
        if (e.status === 429) {
          // A short wait rides out a burst; a long one means the day's cap
          if (attempt === 0 && (e.retryAfterSec ?? 60) <= 120) {
            await sleep((e.retryAfterSec ?? 60) * 1000);
            continue;
          }
          throw new StopRun(
            "stopped",
            "Askly's capture limit for now is reached. The next sync carries on.",
          );
        }
        throw e;
      }
    }
  }

  emit(kind) {
    chrome.runtime
      .sendMessage({
        type: "SYNC_EVENT",
        kind,
        state: this.state,
        newlyIgnored: kind === "finished" ? this.newlyIgnored : [],
      })
      .catch(() => {});
  }

  /** Tell Askly (throttled unless forced); progress shows on the Capture page. */
  async report(force = false) {
    this.emit("progress");
    if (!force && Date.now() - this.lastReport < REPORT_EVERY_MS) return;
    this.lastReport = Date.now();
    try {
      await api(this.ctx, "/api/ingest/sync", {
        method: "PATCH",
        body: JSON.stringify({
          status: this.state.status,
          currentItem: this.state.currentItem,
          error: this.state.error,
          courses: this.state.courses
            .filter((c) => c.status === "capture")
            .map(({ lmsId, total, captured, skipped, failed, done }) => ({
              lmsId,
              total,
              captured,
              skipped,
              failed,
              done,
            })),
        }),
      });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        throw new StopRun("failed", e.message);
      }
      // Progress is best-effort; the run carries on
    }
  }
}

/**
 * What to send Askly for one LMS item. Mirrors the module types MIVA's
 * courses use: video/text pages, URL resources (PDFs on the asset CDN or
 * Vimeo links), quiz intro pages (never an attempt) and assignments (the
 * brief, its due date and its question paper).
 */
function lessonsFrom(course, item, doc, html) {
  const base = {
    source_url: item.url,
    course_code: course.code,
    week_number: L.weekFrom(item.section, item.name),
    lesson_title: item.name.slice(0, 300),
    session_label: null,
  };
  const pdfLesson = (pdf, sourceUrl, title) => ({
    ...base,
    source_url: sourceUrl,
    lesson_title: title.slice(0, 300),
    page_type: "pdf",
    pdf_url: pdf.url,
    pdf_filename: pdf.filename,
  });

  if (item.module === "url") {
    const target = L.urlResourceTarget(doc, html);
    if (!target) return [];
    const video = L.vimeoFromUrl(target);
    if (video) return [{ ...base, page_type: "video", ...video }];
    if (L.isPdfUrl(target)) {
      return [pdfLesson({ url: target, filename: L.pdfName(target) }, item.url, item.name)];
    }
    return []; // interactive (SCORM) lessons and external links
  }

  if (item.module === "quiz") {
    const q = L.quiz(doc);
    return q
      ? [
          {
            ...base,
            page_type: "quiz",
            quiz_questions: q.questions,
            quiz_instructions: q.instructions,
            quiz_metadata: q.metadata,
          },
        ]
      : [];
  }

  if (item.module === "assign") {
    const a = L.assignment(doc);
    const out = a
      ? [
          {
            ...base,
            page_type: "assignment_external",
            assignment_instructions: a.instructions,
            assignment_requirements: null, // the student's own submission status stays out
            assignment_metadata: a.metadata,
          },
        ]
      : [];
    for (const pdf of L.detectPDFs(doc)) {
      out.push(
        pdfLesson(
          pdf,
          `${item.url}#file=${encodeURIComponent(pdf.filename)}`,
          `${item.name} (question paper)`,
        ),
      );
    }
    return out;
  }

  // page: a video, embedded PDFs, or readable text
  const video = L.detectVideo(doc);
  if (video) return [{ ...base, page_type: "video", ...video }];
  const pdfs = L.detectPDFs(doc);
  if (pdfs.length) {
    return pdfs.map((pdf, i) =>
      pdfLesson(
        pdf,
        i === 0 ? item.url : `${item.url}#file=${encodeURIComponent(pdf.filename)}`,
        i === 0 ? item.name : `${item.name}: ${pdf.filename.replace(/\.pdf$/i, "")}`,
      ),
    );
  }
  const body = L.pageText(doc);
  return body.length >= 80 ? [{ ...base, page_type: "page", page_text: body }] : [];
}
