"use client";

interface AsklyBackgroundProps {
  intensity?: "subtle" | "normal" | "vibrant";
}

const intensityConfig = {
  subtle: { opacity: 0.55, scale: 0.85 },
  normal: { opacity: 0.75, scale: 1 },
  vibrant: { opacity: 0.95, scale: 1.15 },
};

export function AsklyBackground({
  intensity = "normal",
}: AsklyBackgroundProps) {
  const cfg = intensityConfig[intensity];

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      {/* Orb 1 — warm amber, top-left */}
      <div
        className="askly-orb-1 askly-pulse-glow"
        style={{
          position: "absolute",
          top: "-10%",
          left: "-5%",
          width: `${750 * cfg.scale}px`,
          height: `${750 * cfg.scale}px`,
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse at center, rgba(239,159,39,0.58) 0%, rgba(186,117,23,0.28) 40%, transparent 70%)",
          opacity: cfg.opacity,
          filter: "blur(80px)",
        }}
      />

      {/* Orb 2 — red-orange, bottom-right */}
      <div
        className="askly-orb-2"
        style={{
          position: "absolute",
          bottom: "-15%",
          right: "-8%",
          width: `${650 * cfg.scale}px`,
          height: `${650 * cfg.scale}px`,
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse at center, rgba(216,90,48,0.42) 0%, rgba(186,60,20,0.2) 45%, transparent 70%)",
          opacity: cfg.opacity * 0.9,
          filter: "blur(90px)",
        }}
      />

      {/* Orb 3 — lighter amber accent, center-right */}
      <div
        className="askly-orb-3"
        style={{
          position: "absolute",
          top: "30%",
          right: "15%",
          width: `${500 * cfg.scale}px`,
          height: `${500 * cfg.scale}px`,
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse at center, rgba(250,199,117,0.35) 0%, rgba(239,159,39,0.15) 50%, transparent 75%)",
          opacity: cfg.opacity * 0.8,
          filter: "blur(70px)",
        }}
      />

      {/* Vignette overlay — dark edges, transparent center */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 80% 70% at 50% 50%, transparent 0%, rgba(10,8,7,0.55) 100%)",
        }}
      />

      {/* Noise texture overlay via inline SVG fractalNoise filter */}
      <svg
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: 0.04,
          mixBlendMode: "overlay",
        }}
      >
        <filter id="askly-noise">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.65"
            numOctaves="3"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#askly-noise)" />
      </svg>
    </div>
  );
}
