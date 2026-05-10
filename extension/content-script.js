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

  // ── Main detection ────────────────────────────────────────────

  const video = detectVideo();
  const pdfs = detectPDFs();

  let pageType = "unknown";
  if (video) {
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
