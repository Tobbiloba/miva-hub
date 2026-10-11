/**
 * Askly Capture — reading MIVA's LMS (Moodle) pages.
 *
 * Shared by the content script (the page the student has open) and the
 * offscreen crawler (pages fetched in the background during automatic
 * capture), so both read lessons the same way. Every function takes the
 * Document and its URL; nothing here touches the network.
 */
(function (root) {
  "use strict";

  const ASSET_HOST = "lms-assets.miva.university";
  const VIMEO = /player\.vimeo\.com\/video\/(\d+)(?:\?h=([a-f0-9]+))?/;
  const VIMEO_PAGE = /(?:^|\/\/)vimeo\.com\/(\d+)(?:\/([a-f0-9]+))?/;

  const BLOCKS = "p, div, li, tr, h1, h2, h3, h4, h5, h6, section, blockquote, pre, table, ul, ol";

  /**
   * Readable text with line breaks between blocks. Fetched pages aren't
   * rendered, so innerText falls back to raw textContent (no breaks).
   */
  function text(el) {
    if (!el) return "";
    const copy = el.cloneNode(true);
    for (const br of copy.querySelectorAll("br")) br.replaceWith("\n");
    for (const block of copy.querySelectorAll(BLOCKS)) block.append("\n");
    return (copy.textContent || "")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t\f\v]+/g, " ")
      .replace(/ *\n */g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  /** "COS 409", "MIVA-CSC 303" → "COS409" */
  function normaliseCode(raw) {
    const m = String(raw || "")
      .toUpperCase()
      .replace(/\bMIVA\s*-\s*/g, " ")
      .match(/\b([A-Z]{2,4})\s*-?\s*(\d{3})\b/);
    return m ? m[1] + m[2] : null;
  }

  function decodeEntities(s) {
    return String(s || "")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#0?39;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
  }

  /**
   * The lesson's area: the activity header (with its description, e.g. an
   * assignment brief) and its content, without the course index drawer.
   */
  function mainContent(doc) {
    return (
      doc.querySelector("#region-main") ||
      doc.querySelector("[role='main']") ||
      doc.body
    );
  }

  function detectVideo(doc) {
    for (const frame of doc.querySelectorAll("iframe")) {
      const src = frame.getAttribute("src") || frame.getAttribute("data-src") || "";
      const m = src.match(VIMEO);
      if (m) return { vimeo_video_id: m[1], vimeo_hash: m[2] || null };
    }
    return null;
  }

  /** A Vimeo link (not an embed), e.g. a URL resource pointing at a video. */
  function vimeoFromUrl(url) {
    const embed = String(url).match(VIMEO);
    if (embed) return { vimeo_video_id: embed[1], vimeo_hash: embed[2] || null };
    const page = String(url).match(VIMEO_PAGE);
    return page ? { vimeo_video_id: page[1], vimeo_hash: page[2] || null } : null;
  }

  function isPdfUrl(url) {
    try {
      const u = new URL(url);
      return u.hostname === ASSET_HOST && /\.pdf$/i.test(u.pathname);
    } catch {
      return false;
    }
  }

  function pdfName(url) {
    const path = new URL(url).pathname;
    return decodeURIComponent(path.split("/").pop() || "document.pdf");
  }

  /** LMS-hosted PDFs linked or embedded in the lesson's content. */
  function detectPDFs(doc) {
    const scope = mainContent(doc);
    const urls = new Set();
    for (const el of scope.querySelectorAll("a[href], iframe[src], object[data], embed[src]")) {
      const raw = el.getAttribute("href") || el.getAttribute("src") || el.getAttribute("data") || "";
      if (raw.includes(ASSET_HOST)) urls.add(decodeEntities(raw));
    }
    return [...urls].filter(isPdfUrl).map((url) => ({ url, filename: pdfName(url) }));
  }

  /**
   * Where a URL resource points ("view.php?id=…&redirect=0" shows the
   * target instead of redirecting): the embedded frame or the link.
   */
  function urlResourceTarget(doc, html) {
    const scope = mainContent(doc);
    const el =
      scope.querySelector(".urlworkaround a[href]") ||
      scope.querySelector("iframe[src]") ||
      scope.querySelector("object[data]") ||
      scope.querySelector(".resourcecontent a[href], .urlworkaround a");
    const raw = el && (el.getAttribute("href") || el.getAttribute("src") || el.getAttribute("data"));
    if (raw && !raw.includes("/mod/") && !raw.startsWith("#")) return decodeEntities(raw);
    // Fallback: the first asset or external link in the raw page
    const asset = String(html || "").match(/https:\/\/lms-assets\.miva\.university\/[^"'<>\s]+/);
    return asset ? decodeEntities(asset[0]) : null;
  }

  /** "Week 3: …" → 3 */
  function weekFrom(...texts) {
    for (const t of texts) {
      const m = String(t || "").match(/\bweek\s*(\d{1,2})\b/i);
      if (m) return parseInt(m[1], 10);
    }
    return null;
  }

  function courseCodeFrom(doc) {
    const places = [
      ...doc.querySelectorAll(".breadcrumb a, #page-navbar a, nav[aria-label='Navigation bar'] a"),
      ...doc.querySelectorAll("h1, h2, .page-header-headings h1"),
    ];
    for (const el of places) {
      const code = normaliseCode(text(el));
      if (code) return code;
    }
    return normaliseCode(doc.title) || normaliseCode(text(doc.body).slice(0, 5000));
  }

  function lessonTitleFrom(doc) {
    for (const sel of ["#region-main h2", "h1", "h2.page-title", ".page-header-headings h1", "#page-title"]) {
      const t = text(doc.querySelector(sel));
      if (t) return t;
    }
    // "COS 409: Week 1: Reading - … | Miva"
    return (doc.title || "Untitled lesson").replace(/\s*\|\s*Miva\s*$/i, "").replace(/^[A-Z]{2,4}\s*\d{3}\s*:\s*/, "");
  }

  function sessionLabelFrom(doc) {
    const m = text(doc.body)
      .slice(0, 5000)
      .match(/\b((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+Cohort\s+\d{4})\b/i);
    return m ? m[1] : null;
  }

  /**
   * The activity's due/close date. Moodle lists several dates ("Opened:",
   * "Due:", "Closes:"); take the due/close one, preferring <time datetime>.
   */
  function findDueDate(doc) {
    const rows = doc.querySelectorAll(
      "[data-region='activity-dates'] div, .activity-dates div, .activity-information div, .dates tr, .submissionstatustable tr"
    );
    for (const row of rows) {
      const t = text(row);
      if (!/^(due|closes?|cut-?off|deadline)/i.test(t) && !/due date/i.test(t)) continue;
      const time = row.querySelector("time[datetime]");
      if (time) return time.getAttribute("datetime");
      if (/\d{4}/.test(t)) return t;
    }
    return null;
  }

  function quiz(doc) {
    const result = { questions: [], instructions: null, metadata: {} };
    // The teacher's instructions, then the quiz's rules (attempts, timing)
    const parts = [
      text(doc.querySelector("#intro") || doc.querySelector(".activity-description")),
      text(doc.querySelector(".box.quizinfo")),
    ].filter(Boolean);
    if (parts.length) result.instructions = parts.join("\n\n");

    // Questions only appear on attempt/review pages the student opened
    for (const q of doc.querySelectorAll(".que")) {
      const qText = text(q.querySelector(".qtext"));
      if (!qText) continue;
      const options = [...q.querySelectorAll(".answer label, .answer .flex-fill, .answer .ml-1")]
        .map(text)
        .filter(Boolean);
      result.questions.push({ text: qText, options: [...new Set(options)] });
    }

    for (const item of doc.querySelectorAll(".quizinfo p, .box.quizinfo p, .activity-dates .date")) {
      const t = text(item);
      const lower = t.toLowerCase();
      if (lower.includes("time limit")) result.metadata.time_limit = t;
      if (lower.includes("attempts allowed")) result.metadata.attempts_allowed = t;
      if (lower.includes("grading method")) result.metadata.grading_method = t;
    }
    const due = findDueDate(doc);
    if (due) result.metadata.due_date = due;
    if (!result.instructions && !result.questions.length) return null;
    if (result.instructions) result.instructions = result.instructions.slice(0, 10000);
    return result;
  }

  function assignment(doc) {
    const result = { instructions: null, requirements: null, metadata: {} };
    const desc =
      doc.querySelector("#intro .no-overflow") ||
      doc.querySelector("#intro") ||
      doc.querySelector(".activity-description") ||
      doc.querySelector(".box.generalbox.boxaligncenter");
    result.instructions = text(desc).slice(0, 10000) || null;

    const status = doc.querySelector(".submissionstatustable");
    if (status) result.requirements = text(status).slice(0, 10000);

    const due = findDueDate(doc);
    if (due) result.metadata.due_date = due;
    for (const row of doc.querySelectorAll(".submissionstatustable tr")) {
      const label = text(row.querySelector("th, td:first-child")).toLowerCase();
      const value = text(row.querySelector("td:last-child"));
      if (label.includes("due date") && !result.metadata.due_date) result.metadata.due_date = value;
    }
    if (!result.instructions && !result.metadata.due_date) return null;
    return result;
  }

  /**
   * Readable text of a content page (e.g. reflection questions), without the
   * course index, completion widgets and navigation Moodle puts around it.
   */
  function pageText(doc) {
    const scope = mainContent(doc).cloneNode(true);
    for (const junk of scope.querySelectorAll(
      "script, style, nav, form, .activity-header, .activity-information, [data-region='activity-information'], .completion-info, .activity-navigation, #prev-activity-link, #next-activity-link, .jumpmenu, .modified, .urlselect, select, h2"
    )) {
      junk.remove();
    }
    const body = scope.querySelector(".box.generalbox, .no-overflow") || scope;
    return text(body).replace(/\n{3,}/g, "\n\n").slice(0, 60000);
  }

  /** Everything the popup shows for the page the student has open. */
  function describePage(doc, url) {
    const path = new URL(url).pathname;
    const video = detectVideo(doc);
    const pdfs = detectPDFs(doc);
    const q = path.includes("/mod/quiz/") ? quiz(doc) : null;
    const a = path.includes("/mod/assign/") ? assignment(doc) : null;
    const pageBody = path.includes("/mod/page/") && !video ? pageText(doc) : "";

    let pageType = "unknown";
    if (q) pageType = "quiz";
    else if (a) pageType = "assignment_external";
    else if (video) pageType = "video";
    else if (pdfs.length) pageType = "pdf";
    else if (pageBody.length >= 80) pageType = "page";

    const title = lessonTitleFrom(doc);
    return {
      page_type: pageType,
      source_url: url,
      course_code: courseCodeFrom(doc),
      course_id: courseIdFrom(doc),
      lesson_title: title,
      week_number: weekFrom(title, text(doc.querySelector(".breadcrumb"))),
      session_label: sessionLabelFrom(doc),
      vimeo_video_id: video?.vimeo_video_id || null,
      vimeo_hash: video?.vimeo_hash || null,
      pdf_url: pdfs[0]?.url || null,
      pdf_filename: pdfs[0]?.filename || null,
      all_pdfs: pdfs,
      quiz_questions: q?.questions || null,
      quiz_instructions: q?.instructions || null,
      quiz_metadata: q?.metadata || null,
      assignment_instructions: a?.instructions || null,
      assignment_requirements: a?.requirements || null,
      assignment_metadata: a?.metadata || null,
      page_text: pageType === "page" ? pageBody : null,
    };
  }

  /** The LMS course id of the page (body class "course-647"). */
  function courseIdFrom(doc) {
    const m = (doc.body?.className || "").match(/\bcourse-(\d+)\b/);
    return m ? parseInt(m[1], 10) : null;
  }

  root.AsklyLms = {
    normaliseCode,
    decodeEntities,
    detectVideo,
    vimeoFromUrl,
    detectPDFs,
    isPdfUrl,
    pdfName,
    urlResourceTarget,
    weekFrom,
    quiz,
    assignment,
    pageText,
    describePage,
    courseIdFrom,
  };
})(typeof globalThis !== "undefined" ? globalThis : self);
