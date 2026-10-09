/**
 * Shared landing styles: Askly's dark ground, monochrome only. White is the
 * accent; depth comes from hairline borders, soft top highlights and glow.
 */
export const btnPrimary =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-6 text-[15px] font-medium text-black shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_8px_30px_-8px_rgba(255,255,255,0.35)] transition-[background-color,transform,box-shadow] hover:bg-white/90 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.2),0_10px_40px_-6px_rgba(255,255,255,0.45)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export const btnSecondary =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-6 text-[15px] font-medium text-white/90 backdrop-blur transition-colors hover:border-white/25 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40";

/** Headings get a faint silver fall-off, light at the top. */
export const heading =
  "font-semibold tracking-[-0.04em] text-balance bg-gradient-to-b from-white via-white to-white/55 bg-clip-text text-transparent pb-[0.06em]";

export const eyebrow =
  "text-[13px] font-medium tracking-[0.02em] text-white/45";

/** Glassy card: hairline border, gentle top highlight, slight fill. */
export const card =
  "rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-white/[0.015] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]";

/** Fade-up on scroll; pair with `data-reveal` (see reveal.tsx). */
export const reveal =
  "opacity-0 translate-y-6 transition-[opacity,transform] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] data-[shown=true]:opacity-100 data-[shown=true]:translate-y-0 motion-reduce:opacity-100 motion-reduce:translate-y-0";
