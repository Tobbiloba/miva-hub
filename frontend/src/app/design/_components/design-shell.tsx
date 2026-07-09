"use client";

import { Button } from "@/components/ui/button";
import { Moon, Palette, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

const NAV = [
  { id: "foundations", label: "Foundations" },
  { id: "controls", label: "Controls" },
  { id: "surfaces", label: "Surfaces" },
  { id: "chat", label: "Chat" },
  { id: "motion", label: "Motion & Icons" },
];

export function DesignShell({ children }: { children: ReactNode }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4">
          <div className="flex items-center gap-2 min-w-0">
            <Palette className="size-5 shrink-0 text-primary" />
            <h1 className="truncate text-sm font-medium sm:text-base">
              Design System
            </h1>
          </div>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <Button
            variant="outline"
            size="icon"
            aria-label="Toggle theme"
            onClick={() =>
              setTheme(resolvedTheme === "dark" ? "light" : "dark")
            }
          >
            {mounted && resolvedTheme === "dark" ? (
              <Sun className="size-4" />
            ) : (
              <Moon className="size-4" />
            )}
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-16 px-4 py-10">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Every token. Every component. Every state.
          </h2>
          <p className="max-w-2xl text-muted-foreground">
            The living reference for this product&apos;s visual language —
            colors, typography, spacing, and the full component library in every
            variant, size, and interaction state. Toggle the theme to see both
            modes.
          </p>
        </div>
        {children}
      </main>
      <footer className="border-t py-8 text-center text-xs text-muted-foreground">
        Design system reference — rendered live from production tokens and
        components.
      </footer>
    </div>
  );
}

export function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 space-y-8">
      <div className="space-y-1 border-b pb-3">
        <h3 className="text-2xl font-bold tracking-tight">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

export function SubSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </h4>
      {children}
    </div>
  );
}

export function Specimen({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="min-w-0 space-y-2">
      <div
        className={`flex min-h-20 min-w-0 flex-wrap items-center gap-3 overflow-hidden rounded-lg border bg-card p-4 ${className ?? ""}`}
      >
        {children}
      </div>
      <p className="font-mono text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
