"use client";

import Lenis from "lenis";
import { useEffect } from "react";

/**
 * The landing's motion layer: `[data-reveal]` elements get `.in` as they
 * scroll into view (CSS does the movement), and Lenis smooths wheel and
 * trackpad scrolling. In-page links (#capture …) glide to their section.
 * Both switch off for reduced motion.
 */
export function LandingMotion() {
  useEffect(() => {
    const els = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]"),
    );
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!("IntersectionObserver" in window) || reduce) {
      for (const el of els) el.classList.add("in");
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    for (const el of els) io.observe(el);

    const lenis = new Lenis({
      autoRaf: true,
      lerp: 0.09,
      wheelMultiplier: 0.9,
    });
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey)
        return;
      const a = (e.target as Element).closest?.(
        "a[href^='#']",
      ) as HTMLAnchorElement | null;
      const hash = a?.getAttribute("href");
      if (!hash || hash === "#") return;
      const target = document.querySelector<HTMLElement>(hash);
      if (!target) return;
      e.preventDefault();
      history.pushState(null, "", hash);
      lenis.scrollTo(target, { duration: 1.3 }); // gap comes from scroll-margin-top
    };
    document.addEventListener("click", onClick, true);

    return () => {
      io.disconnect();
      document.removeEventListener("click", onClick, true);
      lenis.destroy();
    };
  }, []);
  return null;
}
