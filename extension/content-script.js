/**
 * Askly Capture — Content Script
 * Runs on MIVA LMS pages (lms.miva.university).
 * Detects page type (video/PDF/unknown), extracts metadata,
 * and sends it to the popup via chrome.runtime messaging.
 */

(function () {
  "use strict";

  /**
   * Detect Vimeo iframe and extract video ID + hash
   */
  function detectVideo() {
    const iframes = document.querySelectorAll("iframe");
    for (const iframe of iframes) {
      const src = iframe.src || iframe.getAttribute("data-src") || "";
      const match = src.match(
        /player\.vimeo\.com\/video\/(\d+)(?:\?h=([a-f0-9]+))?/
      );
      if (match) {
        return {
          vimeo_video_id: match[1],
          vimeo_hash: match[2] || null,
        };
      }
    }
    return null;
  }

  /**
   * Detect PDF links on the page (lms-assets CDN)
   */
  function detectPDFs() {
    const links = document.querySelectorAll("a[href]");
    const pdfs = [];
    for (const link of links) {
      const href = link.href || "";
      if (
        href.includes("lms-assets.miva.university") &&
        href.match(/\.pdf$/i)
      ) {
        const urlParts = href.split("/");
        const filename = decodeURIComponent(urlParts[urlParts.length - 1]);
        pdfs.push({ url: href, filename });
      }
    }
    return pdfs;
  }

  /**
   * Extract course code from breadcrumb or page content
   * Matches patterns like COS102, MTH201, GST112, etc.
   */
  function extractCourseCode() {
    // Try breadcrumb first
    const breadcrumbs = document.querySelectorAll(
      ".breadcrumb a, #page-navbar a, nav[aria-label='Navigation bar'] a"
    );
    for (const crumb of breadcrumbs) {
      const text = crumb.textContent || "";
      const match = text.match(/\b([A-Z]{3}\d{3})\b/);
      if (match) return match[1];
    }

    // Try page heading
    const headings = document.querySelectorAll(
      "h1, h2, .page-header-headings h1, .page-header-headings h2"
    );
    for (const h of headings) {
      const text = h.textContent || "";
      const match = text.match(/\b([A-Z]{3}\d{3})\b/);
      if (match) return match[1];
    }

    // Try page title
    const titleMatch = document.title.match(/\b([A-Z]{3}\d{3})\b/);
    if (titleMatch) return titleMatch[1];

    // Scan body text as last resort (first 5000 chars)
    const bodyText = document.body.innerText.slice(0, 5000);
    const bodyMatch = bodyText.match(/\b([A-Z]{3}\d{3})\b/);
    if (bodyMatch) return bodyMatch[1];

    return null;
  }

  /**
   * Extract lesson title from page heading
   */
  function extractLessonTitle() {
    const selectors = [
      "h1",
      "h2.page-title",
      ".page-header-headings h1",
      ".page-header-headings h2",
      "#page-title",
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim()) {
        return el.textContent.trim();
      }
    }
    return document.title || "Untitled Lesson";
  }

  /**
   * Extract week number from heading text
   * Matches "Week 1:", "Week 01", "WEEK 12 -", etc.
   */
  function extractWeekNumber() {
    const text = document.body.innerText.slice(0, 3000);
    const match = text.match(/\bweek\s*(\d{1,2})\b/i);
    return match ? parseInt(match[1], 10) : null;
  }

  /**
   * Extract session/cohort label
   * Matches "September Cohort 2025", "January Cohort 2026", etc.
   */
  function extractSessionLabel() {
    const text = document.body.innerText.slice(0, 5000);
    const match = text.match(
      /\b((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+Cohort\s+\d{4})\b/i
    );
    return match ? match[1] : null;
  }

  // ── Quiz detection (/mod/quiz/view.php) ───────────────────────

  function detectQuiz() {
    if (!window.location.pathname.includes("/mod/quiz/")) return null;

    const quiz = { questions: [], instructions: null, metadata: {} };

    // Instructions / description
    const descEl =
      document.querySelector(".box.quizinfo") ||
      document.querySelector("#region-main .activity-description") ||
      document.querySelector(".box.generalbox");
    if (descEl) quiz.instructions = descEl.innerText.trim();

    // Questions (visible on attempt or review pages)
    const questionEls = document.querySelectorAll(".que");
    for (const qEl of questionEls) {
      const qText =
        qEl.querySelector(".qtext")?.innerText?.trim() || null;
      if (!qText) continue;

      const options = [];
      const answerEls = qEl.querySelectorAll(
        ".answer label, .answer .flex-fill, .answer input[type='radio'] + span, .answer .ml-1"
      );
      for (const a of answerEls) {
        const optText = a.innerText.trim();
        if (optText) options.push(optText);
      }
      // Deduplicate options
      const uniqueOpts = [...new Set(options)];
      quiz.questions.push({ text: qText, options: uniqueOpts });
    }

    // If no structured questions found, try extracting all visible text
    if (quiz.questions.length === 0) {
      const mainContent = document.querySelector("#region-main");
      if (mainContent) {
        quiz.instructions =
          (quiz.instructions || "") +
          "\n\n" +
          mainContent.innerText.trim().slice(0, 5000);
        quiz.instructions = quiz.instructions.trim();
      }
    }

    // Metadata
    const infoItems = document.querySelectorAll(
      ".quizinfo .cell, .box.quizinfo p, .activity-information .completion-info, .activity-dates .date"
    );
    for (const item of infoItems) {
      const text = item.innerText.toLowerCase();
      if (text.includes("time limit")) {
        quiz.metadata.time_limit = item.innerText.trim();
      }
      if (text.includes("attempt")) {
        quiz.metadata.attempts_allowed = item.innerText.trim();
      }
      if (text.includes("grading") || text.includes("grade")) {
        quiz.metadata.grading_method = item.innerText.trim();
      }
    }

    // Due date from activity-dates or .dates
    const dateEl =
      document.querySelector(".activity-dates time") ||
      document.querySelector(".dates td time") ||
      document.querySelector(".activity-information time");
    if (dateEl) {
      quiz.metadata.due_date =
        dateEl.getAttribute("datetime") || dateEl.innerText.trim();
    }

    return quiz;
  }

  // ── Assignment detection (/mod/assign/view.php) ──────────────

  function detectAssignment() {
    if (!window.location.pathname.includes("/mod/assign/")) return null;

    const assign = { instructions: null, requirements: null, metadata: {} };

    // Instructions / description
    const descEl =
      document.querySelector("#intro .no-overflow") ||
      document.querySelector("#intro") ||
      document.querySelector(".box.generalbox.boxaligncenter") ||
      document.querySelector(".box.generalbox");
    if (descEl) assign.instructions = descEl.innerText.trim();

    // If no structured instructions, fall back to main content
    if (!assign.instructions) {
      const mainContent = document.querySelector("#region-main");
      if (mainContent) {
        assign.instructions = mainContent.innerText.trim().slice(0, 5000);
      }
    }

    // Submission requirements
    const reqEl = document.querySelector(".submissionstatustable");
    if (reqEl) assign.requirements = reqEl.innerText.trim();

    // Metadata
    const dateEl =
      document.querySelector(".activity-information time") ||
      document.querySelector(".activity-dates time") ||
      document.querySelector(".dates td time");
    if (dateEl) {
      assign.metadata.due_date =
        dateEl.getAttribute("datetime") || dateEl.innerText.trim();
    }

    const gradeEl = document.querySelector(
      ".gradeitem .maximumgrade, .gradevalue, .submissionstatustable .cell.c1.lastcol"
    );
    if (gradeEl) {
      const gradeText = gradeEl.innerText.trim();
      const gradeMatch = gradeText.match(/(\d+)/);
      if (gradeMatch) assign.metadata.max_grade = parseInt(gradeMatch[1]);
    }

    // Submission types from status table
    const typeEls = document.querySelectorAll(
      ".submissionstatustable tr"
    );
    for (const row of typeEls) {
      const label = row.querySelector("td:first-child")?.innerText?.toLowerCase() || "";
      const value = row.querySelector("td:last-child")?.innerText?.trim() || "";
      if (label.includes("submission type")) {
        assign.metadata.submission_types = value;
      }
      if (label.includes("due date")) {
        assign.metadata.due_date = assign.metadata.due_date || value;
      }
    }

    return assign;
  }

  // ── Main detection ────────────────────────────────────────────

  const video = detectVideo();
  const pdfs = detectPDFs();
  const quiz = detectQuiz();
  const assignment = detectAssignment();

  let pageType = "unknown";
  if (quiz) {
    pageType = "quiz";
  } else if (assignment) {
    pageType = "assignment_external";
  } else if (video) {
    pageType = "video";
  } else if (pdfs.length > 0) {
    pageType = "pdf";
  }

  const metadata = {
    page_type: pageType,
    source_url: window.location.href,
    course_code: extractCourseCode(),
    lesson_title: extractLessonTitle(),
    week_number: extractWeekNumber(),
    session_label: extractSessionLabel(),
    // Video fields
    vimeo_video_id: video?.vimeo_video_id || null,
    vimeo_hash: video?.vimeo_hash || null,
    // PDF fields (first PDF if multiple)
    pdf_url: pdfs.length > 0 ? pdfs[0].url : null,
    pdf_filename: pdfs.length > 0 ? pdfs[0].filename : null,
    all_pdfs: pdfs, // all detected PDFs for user selection
    // Quiz fields
    quiz_questions: quiz?.questions || null,
    quiz_instructions: quiz?.instructions || null,
    quiz_metadata: quiz?.metadata || null,
    // Assignment fields
    assignment_instructions: assignment?.instructions || null,
    assignment_requirements: assignment?.requirements || null,
    assignment_metadata: assignment?.metadata || null,
  };

  // Store in page-level data for popup to retrieve
  chrome.runtime.sendMessage({
    type: "PAGE_METADATA",
    data: metadata,
  });

  // Also respond to direct queries from popup
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === "GET_PAGE_METADATA") {
      sendResponse(metadata);
    }
    return true; // keep channel open for async
  });
})();
