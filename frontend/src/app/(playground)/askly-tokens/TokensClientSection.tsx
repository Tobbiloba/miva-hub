"use client";

import { useState } from "react";
import { BookOpen, HelpCircle, Lightbulb, FileText, LayoutGrid } from "lucide-react";
import { AsklyPill } from "@/components/ask/AsklyPill";
import { AsklyComposer } from "@/components/ask/AsklyComposer";

const pills = [
  { id: "guide", label: "Study guide", icon: BookOpen },
  { id: "quiz", label: "Practice quiz", icon: HelpCircle },
  { id: "explain", label: "Explain a topic", icon: Lightbulb },
  { id: "assignment", label: "Help with assignment", icon: FileText },
  { id: "flashcards", label: "Flashcards", icon: LayoutGrid },
];

export function TokensClientSection() {
  const [activePill, setActivePill] = useState<string | null>("guide");
  const [composerValue, setComposerValue] = useState("");

  return (
    <>
      {/* Pills */}
      <section style={{ marginBottom: "2.5rem" }}>
        <h2
          style={{
            fontSize: "0.75rem",
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.45)",
            marginBottom: "0.75rem",
          }}
        >
          AsklyPill
        </h2>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {pills.map((p) => (
            <AsklyPill
              key={p.id}
              icon={p.icon}
              label={p.label}
              active={activePill === p.id}
              onClick={() => setActivePill(p.id === activePill ? null : p.id)}
            />
          ))}
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
          {pills.slice(0, 3).map((p) => (
            <AsklyPill key={p.id} icon={p.icon} label={p.label} size="sm" />
          ))}
        </div>
      </section>

      {/* Composer */}
      <section style={{ marginBottom: "2.5rem" }}>
        <h2
          style={{
            fontSize: "0.75rem",
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.45)",
            marginBottom: "0.75rem",
          }}
        >
          AsklyComposer
        </h2>
        <AsklyComposer
          placeholder="What was covered in week 3 of COS201?"
          value={composerValue}
          onChange={setComposerValue}
          onSubmit={(v) => alert(`Submit: ${v}`)}
          contextChip="COS201"
        />
      </section>

      {/* Animation classes */}
      <section>
        <h2
          style={{
            fontSize: "0.75rem",
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.45)",
            marginBottom: "0.75rem",
          }}
        >
          Animation classes
        </h2>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          {(["askly-orb-1", "askly-orb-2", "askly-orb-3"] as const).map((cls, i) => (
            <div
              key={cls}
              className={`${cls} askly-pulse-glow`}
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                background: `radial-gradient(circle, var(--askly-amber-${[400, 100, 600][i]}) 0%, transparent 70%)`,
              }}
            />
          ))}
          <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)" }}>
            orb-1 (14s) · orb-2 (18s) · orb-3 (22s) — all with pulse-glow (4s)
          </span>
        </div>
      </section>
    </>
  );
}
