"use client";

import { useEffect } from "react";

/**
 * Marks every `[data-reveal]` element as shown once it scrolls into view;
 * the `reveal` class in styles.ts does the motion. Without
 * IntersectionObserver, or with reduced motion, everything shows at once.
 */
export function Reveal() {
  useEffect(() => {
    const els = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]"),
    );
    const show = (el: Element) => el.setAttribute("data-shown", "true");
    if (
      !("IntersectionObserver" in window) ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      els.forEach(show);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            show(e.target);
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );
    for (const el of els) io.observe(el);
    return () => io.disconnect();
  }, []);
  return null;
}
