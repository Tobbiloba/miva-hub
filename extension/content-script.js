/**
 * Askly Capture — content script on MIVA's LMS.
 *
 * Reads the page the student has open (for the popup's "Capture this
 * page"), lets the worker know the student is logged in (a sync waiting
 * for the LMS login carries on), and marks lessons already in Askly with a
 * small "In Askly" tag on course and lesson pages.
 */
(function () {
  "use strict";

  const L = globalThis.AsklyLms;
  const loggedIn = !location.pathname.startsWith("/login");

  const describe = () => L.describePage(document, location.href);

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === "GET_PAGE_METADATA") {
      sendResponse(describe());
    }
    return false;
  });

  chrome.runtime.sendMessage({ type: "LMS_PAGE_VISIT", loggedIn }).catch?.(() => {});

  // ── "In Askly" marks ────────────────────────────────────────

  const MARK = "askly-captured-mark";
  let captured = new Set();

  function tag() {
    const el = document.createElement("span");
    el.className = MARK;
    el.textContent = "✓ In Askly";
    el.title = "Saved to Askly. You can ask about it in chat.";
    el.style.cssText =
      "display:inline-flex;align-items:center;margin-left:8px;padding:1px 8px;border-radius:999px;" +
      "font:600 11px/18px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;" +
      "color:#0f7b3f;background:#e8f6ee;border:1px solid #bfe6cf;vertical-align:middle;white-space:nowrap;";
    return el;
  }

  const bare = (href) => {
    try {
      const u = new URL(href, location.href);
      return `${u.origin}${u.pathname}?id=${u.searchParams.get("id")}`;
    } catch {
      return null;
    }
  };

  function decorate() {
    if (!captured.size) return;
    // Lesson links on course and section pages
    for (const link of document.querySelectorAll(
      ".activity a[href*='/mod/'], .activity-item a[href*='/mod/'], li.activity a.aalink",
    )) {
      if (!captured.has(bare(link.href))) continue;
      const holder = link.closest(".activityname, .activity-name-area, .activityinstance") || link;
      if (holder.querySelector(`.${MARK}`) || holder.nextElementSibling?.classList?.contains(MARK)) continue;
      holder.append(tag());
    }
    // The lesson page itself
    if (/\/mod\//.test(location.pathname) && captured.has(bare(location.href))) {
      const heading = document.querySelector("#region-main h2, .page-header-headings h1");
      if (heading && !heading.querySelector(`.${MARK}`)) heading.append(tag());
    }
  }

  async function loadMarks() {
    if (!loggedIn) return;
    const reply = await chrome.runtime.sendMessage({ type: "GET_CAPTURED_URLS" }).catch(() => null);
    if (!reply?.ok || !reply.data?.length) return;
    captured = new Set(reply.data.map(bare).filter(Boolean));
    decorate();
    // Course pages render sections lazily
    let pending = null;
    new MutationObserver(() => {
      clearTimeout(pending);
      pending = setTimeout(decorate, 300);
    }).observe(document.body, { childList: true, subtree: true });
  }

  loadMarks();
})();
