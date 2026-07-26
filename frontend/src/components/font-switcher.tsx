"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Type } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Body-font picker. Persists to localStorage("app-font") and sets
 * `data-font` on <html>, which globals.css maps to --font-sans app-wide.
 * The families are loaded in layout.tsx via next/font.
 */
/** Plus Jakarta Sans is the app default (index 0). */
export const APP_FONTS = [
  {
    key: "jakarta",
    label: "Plus Jakarta Sans",
    stack: "var(--font-jakarta), sans-serif",
  },
  { key: "neue", label: "Neue Montreal", stack: '"Neue Montreal", sans-serif' },
  { key: "geist", label: "Geist", stack: "var(--font-geist-sans), sans-serif" },
  { key: "inter", label: "Inter", stack: "var(--font-inter), sans-serif" },
  {
    key: "manrope",
    label: "Manrope",
    stack: "var(--font-manrope), sans-serif",
  },
  { key: "sora", label: "Sora", stack: "var(--font-sora), sans-serif" },
  {
    key: "space",
    label: "Space Grotesk",
    stack: "var(--font-space), sans-serif",
  },
] as const;

const DEFAULT_FONT = "jakarta";

export function applyFont(key: string) {
  const root = document.documentElement;
  // jakarta is the CSS default (body base rule) — no attribute needed.
  if (key === DEFAULT_FONT) root.removeAttribute("data-font");
  else root.setAttribute("data-font", key);
  try {
    localStorage.setItem("app-font", key);
  } catch {}
}

export function FontSwitcher({ className }: { className?: string }) {
  const [font, setFont] = useState<string>(DEFAULT_FONT);

  useEffect(() => {
    let saved = DEFAULT_FONT;
    try {
      saved = localStorage.getItem("app-font") || DEFAULT_FONT;
    } catch {}
    setFont(saved);
  }, []);

  function onChange(key: string) {
    setFont(key);
    applyFont(key);
  }

  return (
    <Select value={font} onValueChange={onChange}>
      <SelectTrigger className={className} aria-label="Choose font">
        <Type className="size-4 shrink-0 text-muted-foreground" />
        <SelectValue placeholder="Font" />
      </SelectTrigger>
      <SelectContent>
        {APP_FONTS.map((f) => (
          <SelectItem key={f.key} value={f.key}>
            <span style={{ fontFamily: f.stack }}>{f.label}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
