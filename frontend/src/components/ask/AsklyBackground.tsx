"use client";

interface AsklyBackgroundProps {
  intensity?: "subtle" | "normal" | "vibrant";
}

const intensityConfig = {
  subtle:  { opacity: 0.55, scale: 0.85 },
  normal:  { opacity: 0.75, scale: 1 },
  vibrant: { opacity: 0.95, scale: 1.15 },
};

export function AsklyBackground({ intensity = "normal" }: AsklyBackgroundProps) {
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
          width: `${700 * cfg.scale}px`,
          height: `${700 * cfg.scale}px`,
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse at center, rgba(239,159,39,0.38) 0%, rgba(186,117,23,0.18) 40%, transparent 70%)",
          opacity: cfg.opacity,
          filter: "blur(8px)",
        }}
      />

      {/* Orb 2 — deep amber/orange, bottom-right */}
      <div
        className="askly-orb-2"
        style={{
          position: "absolute",
          bottom: "-15%",
          right: "-8%",
          width: `${600 * cfg.scale}px`,
          height: `${600 * cfg.scale}px`,
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse at center, rgba(250,199,117,0.28) 0%, rgba(239,159,39,0.12) 45%, transparent 70%)",
          opacity: cfg.opacity * 0.85,
          filter: "blur(10px)",
        }}
      />

      {/* Orb 3 — burnt amber accent, center-right */}
      <div
        className="askly-orb-3"
        style={{
          position: "absolute",
          top: "30%",
          right: "15%",
          width: `${420 * cfg.scale}px`,
          height: `${420 * cfg.scale}px`,
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse at center, rgba(99,56,6,0.45) 0%, rgba(65,36,2,0.2) 50%, transparent 75%)",
          opacity: cfg.opacity * 0.7,
          filter: "blur(6px)",
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
