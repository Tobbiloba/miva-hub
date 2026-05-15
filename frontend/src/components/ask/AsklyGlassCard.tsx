import type { CSSProperties, ReactNode } from "react";

interface AsklyGlassCardProps {
  children: ReactNode;
  padding?: string;
  radius?: string;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
}

export function AsklyGlassCard({
  children,
  padding = "1.25rem",
  radius = "18px",
  className = "",
  style,
  onClick,
}: AsklyGlassCardProps) {
  return (
    <div
      className={`askly-glass ${className}`}
      onClick={onClick}
      style={{
        padding,
        borderRadius: radius,
        cursor: onClick ? "pointer" : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
