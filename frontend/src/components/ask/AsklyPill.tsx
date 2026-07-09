"use client";

import type { LucideIcon } from "lucide-react";

interface AsklyPillProps {
  icon?: LucideIcon;
  label: string;
  active?: boolean;
  onClick?: () => void;
  size?: "sm" | "md";
}

export function AsklyPill({
  icon: Icon,
  label,
  active = false,
  onClick,
  size = "md",
}: AsklyPillProps) {
  const paddingX = size === "sm" ? "0.625rem" : "0.875rem";
  const paddingY = size === "sm" ? "0.3rem" : "0.45rem";
  const fontSize = size === "sm" ? "0.75rem" : "0.8125rem";
  const iconSize = size === "sm" ? 13 : 15;
  const gap = size === "sm" ? "0.35rem" : "0.45rem";

  return (
    <button
      type="button"
      onClick={onClick}
      className={active ? "askly-glass-active" : "askly-glass-subtle"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap,
        paddingTop: paddingY,
        paddingBottom: paddingY,
        paddingLeft: paddingX,
        paddingRight: paddingX,
        borderRadius: "9999px",
        fontSize,
        fontWeight: 500,
        letterSpacing: "0.01em",
        color: active
          ? "var(--askly-amber-100)"
          : "var(--askly-text-secondary)",
        cursor: "pointer",
        transition: "all 0.15s ease",
        outline: "none",
        userSelect: "none",
      }}
    >
      {Icon && (
        <Icon
          size={iconSize}
          style={{
            color: active
              ? "var(--askly-amber-400)"
              : "var(--askly-text-tertiary)",
            flexShrink: 0,
          }}
        />
      )}
      {label}
    </button>
  );
}
