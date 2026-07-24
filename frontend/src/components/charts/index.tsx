import { cn } from "lib/utils";
import { TrendingDown, TrendingUp } from "lucide-react";

/**
 * Calm Campus chart primitives — pure SVG, server-safe, token-driven.
 * These compose the data-rich patterns from the reference designs
 * (design/final-decision/01 NexusAI, 05 "five") without any client JS.
 */

/* ── TrendPill ─────────────────────────────────────────────────────────
 * Green (up) / red (down) delta chip. Shared by StatCard and chart headers. */
export function TrendPill({
  delta,
  suffix = "%",
  className,
}: {
  delta: number;
  suffix?: string;
  className?: string;
}) {
  const up = delta >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        up
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "bg-destructive/10 text-destructive",
        className,
      )}
    >
      {up ? (
        <TrendingUp className="size-3" />
      ) : (
        <TrendingDown className="size-3" />
      )}
      {up ? "+" : ""}
      {delta}
      {suffix}
    </span>
  );
}

/* ── Sparkline ─────────────────────────────────────────────────────────
 * Tiny trend line with a soft area fill. `data` is a series of numbers. */
export function Sparkline({
  data,
  width = 96,
  height = 28,
  strokeWidth = 1.5,
  className,
}: {
  data: number[];
  width?: number;
  height?: number;
  strokeWidth?: number;
  className?: string;
}) {
  if (data.length < 2) {
    return (
      <svg
        width={width}
        height={height}
        className={className}
        aria-hidden="true"
      />
    );
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pad = strokeWidth;
  const stepX = (width - pad * 2) / (data.length - 1);
  const pts = data.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + (1 - (v - min) / span) * (height - pad * 2);
    return [x, y] as const;
  });
  const line = pts.map(([x, y]) => `${x},${y}`).join(" ");
  const area = `${pad},${height} ${line} ${width - pad},${height}`;
  return (
    <svg
      width={width}
      height={height}
      className={cn("overflow-visible", className)}
      aria-hidden="true"
    >
      <polygon points={area} className="fill-primary/10" />
      <polyline
        points={line}
        fill="none"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-primary"
      />
      <circle
        cx={pts[pts.length - 1][0]}
        cy={pts[pts.length - 1][1]}
        r={strokeWidth + 1}
        className="fill-primary"
      />
    </svg>
  );
}

/* ── PerformanceGauge ──────────────────────────────────────────────────
 * 180° semicircle meter. Tone shifts green/amber/red by value.
 * "five" performance gauge (design/final-decision/05). */
export function PerformanceGauge({
  value,
  size = 160,
  strokeWidth = 12,
  label = "Total Score",
  className,
}: {
  /** 0–100 */
  value: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const r = (size - strokeWidth) / 2;
  const cy = size / 2;
  // semicircle: 180° (π) sweep from left (180°) to right (0°)
  const semi = Math.PI * r;
  const tone =
    clamped >= 70
      ? "stroke-emerald-500"
      : clamped >= 50
        ? "stroke-amber-500"
        : "stroke-destructive";
  return (
    <div
      className={cn("relative inline-flex flex-col items-center", className)}
      style={{ width: size, height: size / 2 + 8 }}
      role="meter"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <svg width={size} height={size / 2 + 8} className="overflow-visible">
        <path
          d={`M ${strokeWidth / 2} ${cy} A ${r} ${r} 0 0 1 ${size - strokeWidth / 2} ${cy}`}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="stroke-muted"
        />
        <path
          d={`M ${strokeWidth / 2} ${cy} A ${r} ${r} 0 0 1 ${size - strokeWidth / 2} ${cy}`}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={semi}
          strokeDashoffset={semi - (clamped / 100) * semi}
          className={cn("transition-[stroke-dashoffset] duration-700", tone)}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
        <span className="text-2xl font-semibold tabular-nums leading-none">
          {Math.round(clamped)}%
        </span>
        {label && (
          <span className="mt-1 text-xs text-muted-foreground">{label}</span>
        )}
      </div>
    </div>
  );
}

/* ── DonutChart ────────────────────────────────────────────────────────
 * Segmented ring + optional center label. Colors cycle chart-1..5 unless
 * a segment supplies its own token class. NexusAI "Model Usage". */
export type DonutSegment = {
  label: string;
  value: number;
  /** Tailwind fill/stroke color class, e.g. "text-chart-3". Defaults cycle. */
  colorClass?: string;
};

const DONUT_COLORS = [
  "text-chart-1",
  "text-chart-2",
  "text-chart-3",
  "text-chart-4",
  "text-chart-5",
];

export function DonutChart({
  data,
  size = 150,
  strokeWidth = 18,
  centerValue,
  centerLabel,
  className,
}: {
  data: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  centerValue?: string;
  centerLabel?: string;
  className?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div
      className={cn("relative inline-flex shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted"
        />
        {data.map((seg, i) => {
          const frac = seg.value / total;
          const dash = frac * c;
          const el = (
            <circle
              key={seg.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              strokeWidth={strokeWidth}
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-offset}
              className={cn(
                "stroke-current",
                seg.colorClass ?? DONUT_COLORS[i % DONUT_COLORS.length],
              )}
            />
          );
          offset += dash;
          return el;
        })}
      </svg>
      {(centerValue || centerLabel) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {centerValue && (
            <span className="text-xl font-semibold tabular-nums leading-none">
              {centerValue}
            </span>
          )}
          {centerLabel && (
            <span className="mt-0.5 text-[11px] text-muted-foreground">
              {centerLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/** Legend rows for a DonutChart — value + optional percentage. */
export function DonutLegend({
  data,
  className,
}: {
  data: DonutSegment[];
  className?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  return (
    <ul className={cn("space-y-2 text-sm", className)}>
      {data.map((seg, i) => (
        <li key={seg.label} className="flex items-center gap-2">
          <span
            className={cn(
              "size-2.5 shrink-0 rounded-full bg-current",
              seg.colorClass ?? DONUT_COLORS[i % DONUT_COLORS.length],
            )}
          />
          <span className="flex-1 truncate text-muted-foreground">
            {seg.label}
          </span>
          <span className="font-medium tabular-nums">
            {Math.round((seg.value / total) * 100)}%
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ── MiniBarChart ──────────────────────────────────────────────────────
 * Rounded-top bars with an optional secondary stack and dotted reference
 * line. NexusAI "Usage Overview" (design/final-decision/01). */
export type BarDatum = {
  label: string;
  value: number;
  /** Optional stacked secondary portion (rendered below, muted-yellow). */
  secondary?: number;
};

export function MiniBarChart({
  data,
  height = 180,
  referenceValue,
  className,
}: {
  data: BarDatum[];
  height?: number;
  /** Draws a dotted horizontal reference line at this value. */
  referenceValue?: number;
  className?: string;
}) {
  const max =
    Math.max(
      ...data.map((d) => d.value + (d.secondary ?? 0)),
      referenceValue ?? 0,
    ) || 1;
  const plotH = height - 24; // leave room for x labels
  const refY = referenceValue ? plotH - (referenceValue / max) * plotH : null;
  return (
    <div className={cn("w-full", className)}>
      <div
        className="relative flex items-end justify-between gap-2"
        style={{ height: plotH }}
      >
        {refY !== null && (
          <div
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-muted-foreground/40"
            style={{ top: refY }}
            aria-hidden="true"
          />
        )}
        {data.map((d) => {
          const primaryH = (d.value / max) * plotH;
          const secH = d.secondary ? (d.secondary / max) * plotH : 0;
          return (
            <div
              key={d.label}
              className="flex min-w-0 flex-1 flex-col items-center justify-end"
              style={{ height: plotH }}
              title={`${d.label}: ${d.value}${d.secondary ? ` (+${d.secondary})` : ""}`}
            >
              <div
                className="w-full max-w-9 overflow-hidden rounded-t-md bg-muted/40"
                style={{ height: Math.max(primaryH + secH, 3) }}
              >
                <div className="flex h-full w-full flex-col justify-end">
                  {secH > 0 && (
                    <div
                      className="w-full bg-chart-2"
                      style={{ height: secH }}
                    />
                  )}
                  <div
                    className="w-full rounded-t-md bg-primary"
                    style={{ height: primaryH }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between gap-2">
        {data.map((d) => (
          <span
            key={d.label}
            className="min-w-0 flex-1 truncate text-center text-[11px] text-muted-foreground"
          >
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}
