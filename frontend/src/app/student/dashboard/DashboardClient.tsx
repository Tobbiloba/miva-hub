"use client";

import { AsklyComposer } from "@/components/ask/AsklyComposer";
import { AsklyGlassCard } from "@/components/ask/AsklyGlassCard";
import { AsklyPill } from "@/components/ask/AsklyPill";
import {
  Bell,
  BookOpen,
  Clock,
  FileText,
  Flame,
  HelpCircle,
  LayoutGrid,
  Lightbulb,
  RefreshCw,
  Target,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

export interface UpcomingAssignment {
  id: string;
  title: string;
  courseCode: string;
  dueDate: Date | string;
}

export interface LatestAnnouncement {
  id: string;
  title: string;
  content: string;
  createdAt: Date | string;
  postedBy?: string;
}

interface DashboardClientProps {
  greeting: string;
  firstName: string;
  statusBadge: string;
  courseCode: string;
  upcomingAssignment: UpcomingAssignment | null;
  latestAnnouncement: LatestAnnouncement | null;
}

// ── Mode pill definitions ────────────────────────────────────────────────────

const modePills = [
  {
    id: "guide",
    label: "Study guide",
    icon: BookOpen,
    template: (code: string) => `Give me a study guide for week _ of ${code}`,
  },
  {
    id: "quiz",
    label: "Practice quiz",
    icon: HelpCircle,
    template: (code: string) => `Quiz me on ${code}`,
  },
  {
    id: "explain",
    label: "Explain a topic",
    icon: Lightbulb,
    template: (code: string) => `Explain _ from ${code}`,
  },
  {
    id: "assignment",
    label: "Help with assignment",
    icon: FileText,
    template: (code: string) => `Help me understand the assignment for ${code}`,
  },
  {
    id: "flashcards",
    label: "Flashcards",
    icon: LayoutGrid,
    template: (code: string) => `Generate flashcards for week _ of ${code}`,
  },
] as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = d.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function truncate(str: string, len: number): string {
  return str.length > len ? str.slice(0, len - 1) + "…" : str;
}

function firstSentence(str: string): string {
  const m = str.match(/^[^.!?]+[.!?]/);
  return m ? m[0] : truncate(str, 80);
}

// ── Component ────────────────────────────────────────────────────────────────

export function DashboardClient({
  greeting,
  firstName,
  statusBadge,
  courseCode,
  upcomingAssignment,
  latestAnnouncement,
}: DashboardClientProps) {
  const router = useRouter();
  const [activePill, setActivePill] = useState<string>("guide");
  const [composerValue, setComposerValue] = useState(
    modePills[0].template(courseCode),
  );

  const handlePillClick = (pillId: string) => {
    const pill = modePills.find((p) => p.id === pillId);
    if (!pill) return;
    setActivePill(pillId);
    setComposerValue(pill.template(courseCode));
  };

  const handleSubmit = (message: string) => {
    const text = message.trim();
    if (!text) return;
    // Hand the prompt off to the chat home, which auto-sends it on mount.
    try {
      sessionStorage.setItem("askly:pending-prompt", text);
    } catch {
      // sessionStorage unavailable (private mode / SSR) — fall back to plain nav.
    }
    router.push("/");
  };

  const daysLeft = upcomingAssignment
    ? daysUntil(upcomingAssignment.dueDate)
    : null;

  return (
    <>
      {/* Greeting block */}
      <div
        style={{
          textAlign: "center",
          marginTop: "3rem",
          marginBottom: "2rem",
        }}
      >
        {/* Status badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            marginBottom: "1rem",
            fontSize: "0.75rem",
            fontWeight: 500,
            color: "var(--askly-text-tertiary)",
            letterSpacing: "0.02em",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "var(--askly-amber-400)",
              flexShrink: 0,
            }}
          />
          {statusBadge}
        </div>

        {/* Greeting h1 */}
        <div>
          <h1
            style={{
              fontSize: "clamp(2.25rem, 5vw, 3.25rem)",
              fontWeight: 400,
              lineHeight: 1.05,
              letterSpacing: "-0.8px",
              color: "var(--askly-text-primary)",
              margin: 0,
            }}
          >
            {greeting}, {firstName}.
          </h1>
          <h1
            style={{
              fontSize: "clamp(2.25rem, 5vw, 3.25rem)",
              fontWeight: 400,
              lineHeight: 1.05,
              letterSpacing: "-0.8px",
              color: "var(--askly-text-tertiary)",
              margin: 0,
            }}
          >
            Ready to study?
          </h1>
        </div>
      </div>

      {/* Composer */}
      <AsklyComposer
        placeholder={`What was covered in week 3 of ${courseCode}?`}
        value={composerValue}
        onChange={setComposerValue}
        onSubmit={handleSubmit}
        contextChip={courseCode}
      />

      {/* Mode pills */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: "0.5rem",
          marginTop: "1.25rem",
        }}
      >
        {modePills.map((pill) => (
          <AsklyPill
            key={pill.id}
            icon={pill.icon}
            label={pill.label}
            active={activePill === pill.id}
            onClick={() => handlePillClick(pill.id)}
          />
        ))}
      </div>

      {/* "For you today" section */}
      <section style={{ marginTop: "2.5rem" }}>
        {/* Section header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1rem",
          }}
        >
          <span
            style={{
              fontSize: "0.8125rem",
              fontWeight: 600,
              color: "var(--askly-text-secondary)",
              letterSpacing: "0.01em",
            }}
          >
            For you today
          </span>
          <button
            type="button"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              fontSize: "0.75rem",
              color: "var(--askly-text-muted)",
              background: "none",
              border: "none",
              cursor: "pointer",
              transition: "color 0.15s ease",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "var(--askly-text-secondary)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--askly-text-muted)")
            }
          >
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>

        {/* Cards grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "0.875rem",
          }}
        >
          {/* Card 1 — Urgent assignment (amber) */}
          {upcomingAssignment && (
            <AsklyGlassCard
              onClick={() => router.push("/student/assignments")}
              style={{
                borderTop: "2px solid rgba(74,222,128,0.45)",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: "rgba(74,222,128,0.15)",
                  marginBottom: "0.75rem",
                }}
              >
                <Flame size={15} style={{ color: "var(--askly-amber-400)" }} />
              </div>
              <p
                style={{
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  color: "var(--askly-text-primary)",
                  marginBottom: "0.3rem",
                  lineHeight: 1.3,
                }}
              >
                {truncate(upcomingAssignment.title, 48)}
              </p>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "var(--askly-text-tertiary)",
                }}
              >
                {upcomingAssignment.courseCode} ·{" "}
                {daysLeft === 0
                  ? "Due today"
                  : daysLeft === 1
                    ? "Due tomorrow"
                    : `Due in ${daysLeft} days`}
              </p>
            </AsklyGlassCard>
          )}

          {/* Card 2 — Continue studying (blue) */}
          <AsklyGlassCard
            onClick={() => router.push("/student/materials")}
            style={{
              borderTop: "2px solid rgba(96,165,250,0.35)",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "rgba(96,165,250,0.12)",
                marginBottom: "0.75rem",
              }}
            >
              <Clock size={15} style={{ color: "#4ade80" }} />
            </div>
            <p
              style={{
                fontSize: "0.8125rem",
                fontWeight: 600,
                color: "var(--askly-text-primary)",
                marginBottom: "0.3rem",
                lineHeight: 1.3,
              }}
            >
              Continue studying
            </p>
            <p
              style={{
                fontSize: "0.75rem",
                color: "var(--askly-text-tertiary)",
              }}
            >
              {courseCode} · Continue where you left off
            </p>
          </AsklyGlassCard>

          {/* Card 3 — Quick flashcard set (mint) */}
          <AsklyGlassCard
            onClick={() => {
              const pill = modePills.find((p) => p.id === "flashcards");
              if (pill) {
                setActivePill("flashcards");
                setComposerValue(pill.template(courseCode));
              }
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            style={{
              borderTop: "2px solid rgba(52,211,153,0.35)",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "rgba(52,211,153,0.12)",
                marginBottom: "0.75rem",
              }}
            >
              <LayoutGrid size={15} style={{ color: "#dff226" }} />
            </div>
            <p
              style={{
                fontSize: "0.8125rem",
                fontWeight: 600,
                color: "var(--askly-text-primary)",
                marginBottom: "0.3rem",
                lineHeight: 1.3,
              }}
            >
              Quick flashcard set
            </p>
            <p
              style={{
                fontSize: "0.75rem",
                color: "var(--askly-text-tertiary)",
              }}
            >
              5-minute review from this week&apos;s lecture
            </p>
          </AsklyGlassCard>

          {/* Card 4 — New announcement (pink) */}
          {latestAnnouncement && (
            <AsklyGlassCard
              onClick={() => router.push("/student/announcements")}
              style={{
                borderTop: "2px solid rgba(244,114,182,0.35)",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: "rgba(244,114,182,0.12)",
                  marginBottom: "0.75rem",
                }}
              >
                <Bell size={15} style={{ color: "#e39aa5" }} />
              </div>
              <p
                style={{
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  color: "var(--askly-text-primary)",
                  marginBottom: "0.3rem",
                  lineHeight: 1.3,
                }}
              >
                {truncate(latestAnnouncement.title, 40)}
              </p>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "var(--askly-text-tertiary)",
                  lineHeight: 1.4,
                }}
              >
                {firstSentence(latestAnnouncement.content)}
              </p>
            </AsklyGlassCard>
          )}

          {/* Fallback card when no announcement */}
          {!latestAnnouncement && !upcomingAssignment && (
            <AsklyGlassCard
              style={{ borderTop: "2px solid rgba(244,114,182,0.35)" }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: "rgba(244,114,182,0.12)",
                  marginBottom: "0.75rem",
                }}
              >
                <Bell size={15} style={{ color: "#e39aa5" }} />
              </div>
              <p
                style={{
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  color: "var(--askly-text-primary)",
                  marginBottom: "0.3rem",
                }}
              >
                No new announcements
              </p>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "var(--askly-text-tertiary)",
                }}
              >
                You&apos;re all caught up
              </p>
            </AsklyGlassCard>
          )}
        </div>
      </section>

      {/* Stats strip */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0",
          marginTop: "2.5rem",
          marginBottom: "2rem",
        }}
      >
        {[
          {
            icon: Flame,
            color: "var(--askly-amber-400)",
            value: "1",
            label: "day streak",
          },
          { icon: Clock, color: "#4ade80", value: "0m", label: "today" },
          {
            icon: Target,
            color: "#dff226",
            value: "0 / 5",
            label: "weekly goal",
          },
        ].map((stat, idx) => (
          <div
            key={stat.label}
            style={{ display: "flex", alignItems: "center" }}
          >
            {idx > 0 && (
              <div
                style={{
                  width: "1px",
                  height: "24px",
                  background: "var(--askly-border)",
                  margin: "0 1.25rem",
                }}
              />
            )}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                fontSize: "0.8125rem",
                color: "var(--askly-text-secondary)",
              }}
            >
              <stat.icon size={14} style={{ color: stat.color }} />
              <span
                style={{ fontWeight: 600, color: "var(--askly-text-primary)" }}
              >
                {stat.value}
              </span>
              <span style={{ color: "var(--askly-text-muted)" }}>
                {stat.label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
