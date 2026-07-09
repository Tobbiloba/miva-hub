"use client";

import { Section, Specimen, SubSection } from "./design-shell";

const COLOR_TOKENS = [
  { name: "background", fg: "foreground" },
  { name: "foreground", fg: "background" },
  { name: "card", fg: "card-foreground" },
  { name: "card-foreground", fg: "card" },
  { name: "popover", fg: "popover-foreground" },
  { name: "popover-foreground", fg: "popover" },
  { name: "primary", fg: "primary-foreground" },
  { name: "primary-foreground", fg: "primary" },
  { name: "secondary", fg: "secondary-foreground" },
  { name: "secondary-foreground", fg: "secondary" },
  { name: "muted", fg: "muted-foreground" },
  { name: "muted-foreground", fg: "muted" },
  { name: "accent", fg: "accent-foreground" },
  { name: "accent-foreground", fg: "accent" },
  { name: "destructive", fg: "background" },
  { name: "border", fg: "foreground" },
  { name: "input", fg: "foreground" },
  { name: "ring", fg: "background" },
];

const CHART_TOKENS = ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"];

const SIDEBAR_TOKENS = [
  { name: "sidebar", fg: "sidebar-foreground" },
  { name: "sidebar-foreground", fg: "sidebar" },
  { name: "sidebar-primary", fg: "sidebar-primary-foreground" },
  { name: "sidebar-primary-foreground", fg: "sidebar-primary" },
  { name: "sidebar-accent", fg: "sidebar-accent-foreground" },
  { name: "sidebar-accent-foreground", fg: "sidebar-accent" },
  { name: "sidebar-border", fg: "sidebar-foreground" },
  { name: "sidebar-ring", fg: "sidebar" },
];

const TYPE_SCALE = [
  { cls: "text-xs", label: "text-xs — 12px" },
  { cls: "text-sm", label: "text-sm — 14px" },
  { cls: "text-base", label: "text-base — 16px" },
  { cls: "text-lg", label: "text-lg — 18px" },
  { cls: "text-xl", label: "text-xl — 20px" },
  { cls: "text-2xl", label: "text-2xl — 24px" },
  { cls: "text-3xl", label: "text-3xl — 30px" },
  { cls: "text-4xl", label: "text-4xl — 36px" },
  { cls: "text-5xl", label: "text-5xl — 48px" },
  { cls: "text-6xl", label: "text-6xl — 60px" },
];

const FONT_WEIGHTS = [
  { cls: "font-light", label: "Light 300" },
  { cls: "font-normal", label: "Regular 400" },
  { cls: "font-normal italic", label: "Italic 400" },
  { cls: "font-medium", label: "Medium 500" },
  { cls: "font-bold", label: "Bold 700" },
];

const SPACING = [
  { token: "1", px: "4px", w: "w-1" },
  { token: "2", px: "8px", w: "w-2" },
  { token: "3", px: "12px", w: "w-3" },
  { token: "4", px: "16px", w: "w-4" },
  { token: "6", px: "24px", w: "w-6" },
  { token: "8", px: "32px", w: "w-8" },
  { token: "10", px: "40px", w: "w-10" },
  { token: "12", px: "48px", w: "w-12" },
  { token: "16", px: "64px", w: "w-16" },
  { token: "20", px: "80px", w: "w-20" },
  { token: "24", px: "96px", w: "w-24" },
];

const RADII = [
  { cls: "rounded-sm", label: "sm" },
  { cls: "rounded-md", label: "md" },
  { cls: "rounded-lg", label: "lg" },
  { cls: "rounded-xl", label: "xl" },
  { cls: "rounded-2xl", label: "2xl" },
  { cls: "rounded-full", label: "full" },
];

const SHADOWS = [
  { cls: "shadow-xs", label: "shadow-xs" },
  { cls: "shadow-sm", label: "shadow-sm" },
  { cls: "shadow-md", label: "shadow-md" },
  { cls: "shadow-lg", label: "shadow-lg" },
  { cls: "shadow-xl", label: "shadow-xl" },
];

function Swatch({ name, fg }: { name: string; fg: string }) {
  return (
    <div className="space-y-1.5">
      <div
        className="flex h-16 items-end rounded-lg border p-2"
        style={{ background: `var(--${name})` }}
      >
        <span
          className="font-mono text-[10px]"
          style={{ color: `var(--${fg})` }}
        >
          Aa
        </span>
      </div>
      <p className="truncate font-mono text-xs text-muted-foreground">
        --{name}
      </p>
    </div>
  );
}

export function FoundationsSection() {
  return (
    <Section
      id="foundations"
      title="Foundations"
      description="Semantic tokens defined in globals.css (Tailwind v4 @theme). Every color below re-resolves live when the theme flips."
    >
      <SubSection title="Core color tokens">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {COLOR_TOKENS.map((t) => (
            <Swatch key={t.name} name={t.name} fg={t.fg} />
          ))}
        </div>
      </SubSection>

      <SubSection title="Chart palette">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          {CHART_TOKENS.map((name) => (
            <Swatch key={name} name={name} fg="background" />
          ))}
        </div>
      </SubSection>

      <SubSection title="Sidebar tokens">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {SIDEBAR_TOKENS.map((t) => (
            <Swatch key={t.name} name={t.name} fg={t.fg} />
          ))}
        </div>
      </SubSection>

      <SubSection title="Typography — Neue Montreal (sans) / Geist Mono">
        <div className="grid gap-6 lg:grid-cols-2">
          <Specimen label="Font weights & styles">
            <div className="w-full space-y-1">
              {FONT_WEIGHTS.map((w) => (
                <p key={w.label} className={`${w.cls} text-lg`}>
                  {w.label} — The quick brown fox jumps over the lazy dog
                </p>
              ))}
              <p className="pt-2 font-mono text-sm">
                font-mono — const answer = 42; // Geist Mono
              </p>
            </div>
          </Specimen>
          <Specimen label="Type scale">
            <div className="w-full space-y-1 overflow-hidden">
              {TYPE_SCALE.map((t) => (
                <p key={t.cls} className={`${t.cls} truncate leading-tight`}>
                  {t.label}
                </p>
              ))}
            </div>
          </Specimen>
        </div>
      </SubSection>

      <SubSection title="Spacing scale (4px base)">
        <Specimen label="p-1 … p-24 — margins, paddings, and gaps all draw from this scale">
          <div className="w-full space-y-1.5">
            {SPACING.map((s) => (
              <div key={s.token} className="flex items-center gap-3">
                <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">
                  {s.token} · {s.px}
                </span>
                <div className={`h-3 ${s.w} rounded-sm bg-primary`} />
              </div>
            ))}
          </div>
        </Specimen>
      </SubSection>

      <div className="grid gap-6 lg:grid-cols-2">
        <SubSection title="Border radius (--radius: 0.75rem)">
          <Specimen label="rounded-sm → rounded-full">
            {RADII.map((r) => (
              <div key={r.cls} className="space-y-1 text-center">
                <div
                  className={`size-14 border-2 border-primary bg-primary/10 ${r.cls}`}
                />
                <p className="font-mono text-[10px] text-muted-foreground">
                  {r.label}
                </p>
              </div>
            ))}
          </Specimen>
        </SubSection>
        <SubSection title="Elevation">
          <Specimen label="shadow-xs → shadow-xl">
            {SHADOWS.map((s) => (
              <div key={s.cls} className="space-y-1 text-center">
                <div className={`size-14 rounded-lg border bg-card ${s.cls}`} />
                <p className="font-mono text-[10px] text-muted-foreground">
                  {s.label}
                </p>
              </div>
            ))}
          </Specimen>
        </SubSection>
      </div>
    </Section>
  );
}
