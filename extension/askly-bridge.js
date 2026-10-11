/**
 * Askly Capture — bridge between the Askly Capture page and the extension.
 *
 * Runs only on Askly's own origins. The page posts window messages tagged
 * `source: "askly-page"`; this relays them to the background worker and
 * posts the reply back. Messages from other windows or origins are ignored.
 */
(function () {
  "use strict";

  const PAGE = "askly-page";
  const EXTENSION = "askly-extension";

  function post(message) {
    window.postMessage({ source: EXTENSION, ...message }, window.location.origin);
  }

  function ask(request, payload) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "BRIDGE", request, ...payload }, (reply) => {
        resolve(
          chrome.runtime.lastError
            ? { ok: false, error: "The extension was updated. Reload this page." }
            : reply || { ok: false, error: "No answer from the extension" },
        );
      });
    });
  }

  async function hello() {
    const reply = await ask("HELLO", {});
    if (reply.ok) post({ type: "HELLO", status: reply.data });
  }

  window.addEventListener("message", async (event) => {
    if (event.source !== window || event.origin !== window.location.origin) return;
    const msg = event.data;
    if (!msg || msg.source !== PAGE || typeof msg.type !== "string") return;
    if (msg.type === "HELLO") {
      hello();
      return;
    }
    const { source, id, type, ...payload } = msg;
    const reply = await ask(type, payload);
    post({ type: "RESULT", id, reply });
  });

  // Status changes (connected, sync started/finished) pushed by the worker
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === "BRIDGE_STATUS") post({ type: "STATUS", status: msg.status });
  });

  hello();
})();
