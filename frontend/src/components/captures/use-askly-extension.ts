"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Talking to the Askly Capture extension from the Askly Capture page.
 *
 * The extension injects a small bridge script on Askly's own origin; the page
 * and the bridge exchange window messages tagged with `source`. The bridge
 * only accepts messages from this window and origin, and the extension only
 * acts on bridge messages coming from Askly's origins.
 */

export type LmsCourseOption = {
  lmsId: number;
  shortname: string;
  fullname: string;
  inProgress: boolean;
  progress: number | null;
};

export type ExtensionStatus = {
  version: string;
  connected: boolean;
  syncing: boolean;
};

type Reply = { ok: boolean; data?: any; error?: string };

const PAGE = "askly-page";
const EXTENSION = "askly-extension";

export function useAsklyExtension() {
  // null while we're still listening for the extension's hello
  const [status, setStatus] = useState<ExtensionStatus | null>(null);
  const [missing, setMissing] = useState(false);
  const pending = useRef(new Map<string, (r: Reply) => void>());

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.source !== window || event.origin !== window.location.origin)
        return;
      const msg = event.data;
      if (!msg || msg.source !== EXTENSION) return;
      if (msg.type === "HELLO" || msg.type === "STATUS") {
        setStatus(msg.status);
        setMissing(false);
        return;
      }
      if (msg.type === "RESULT" && typeof msg.id === "string") {
        pending.current.get(msg.id)?.(msg.reply);
        pending.current.delete(msg.id);
      }
    }
    window.addEventListener("message", onMessage);
    window.postMessage({ source: PAGE, type: "HELLO" }, window.location.origin);
    // The bridge says hello as soon as it loads; silence means not installed
    const timer = setTimeout(() => setMissing(true), 1500);
    return () => {
      window.removeEventListener("message", onMessage);
      clearTimeout(timer);
    };
  }, []);

  const call = useCallback(
    (type: string, payload: Record<string, unknown> = {}, timeoutMs = 60_000) =>
      new Promise<any>((resolve, reject) => {
        const id = crypto.randomUUID();
        const timer = setTimeout(() => {
          pending.current.delete(id);
          reject(new Error("The extension didn't answer. Reload the page."));
        }, timeoutMs);
        pending.current.set(id, (reply) => {
          clearTimeout(timer);
          if (reply.ok) resolve(reply.data);
          else reject(new Error(reply.error || "The extension hit a problem"));
        });
        window.postMessage(
          { source: PAGE, id, type, ...payload },
          window.location.origin,
        );
      }),
    [],
  );

  return {
    status,
    // Only "missing" once the hello window passed without an answer
    installed: status ? true : missing ? false : null,
    call,
  };
}
