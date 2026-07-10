"use client";

import { ActionCard } from "@/components/action-card";
import { CategoryPills } from "@/components/category-pills";
import { ProgressRing } from "@/components/progress-ring";
import { StatCard } from "@/components/stat-card";
import { StreakCalendar } from "@/components/streak-calendar";
import {
  BookOpen,
  Camera,
  CalendarClock,
  GraduationCap,
  MessageCircleQuestion,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Section, Specimen, SubSection } from "./design-shell";

const PILLS = [
  { id: "all", label: "All courses" },
  { id: "math", label: "Mathematics" },
  { id: "cs", label: "Computer Science" },
  { id: "bio", label: "Biology" },
  { id: "law", label: "Business Law" },
  { id: "eco", label: "Economics" },
];

export function PatternsSection() {
  const [pill, setPill] = useState("all");

  return (
    <Section
      id="patterns"
      title="Product Patterns"
      description="Calm Campus primitives from the final design direction — the building blocks for dashboards and demo-path screens."
    >
      <SubSection title="KPI stat cards (StatCard)">
        <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<GraduationCap />}
            label="Current GPA"
            value="4.63"
            delta={2.1}
            caption="vs last semester"
          />
          <StatCard
            icon={<BookOpen />}
            label="Credits Earned"
            value="86"
            delta={12.5}
          />
          <StatCard
            icon={<CalendarClock />}
            label="Due This Week"
            value="4"
            delta={-25}
            caption="vs last week"
          />
          <StatCard icon={<Wallet />} label="AI Cost" value="$12.40" />
        </div>
      </SubSection>

      <SubSection title="Category pill bar (CategoryPills)">
        <Specimen label="CategoryPills — active pill filled, horizontally scrollable">
          <CategoryPills items={PILLS} value={pill} onChange={setPill} />
        </Specimen>
      </SubSection>

      <SubSection title="Action cards (ActionCard) — one AI-recommended per row">
        <div className="grid min-w-0 gap-4 md:grid-cols-3">
          <ActionCard
            icon={<Camera />}
            title="Snap & Solve"
            description="Photograph your handwritten work and get it graded with instant feedback."
            ctaLabel="Snap now"
            onAction={() => toast.info("Design demo — no action taken.")}
          />
          <ActionCard
            recommended
            icon={<MessageCircleQuestion />}
            title="Review Week 4 with your AI Professor"
            description="Your quiz accuracy dipped on sorting algorithms. A focused 20-minute session closes the gap."
            ctaLabel="Start session"
            onAction={() => toast.info("Design demo — no action taken.")}
          />
          <ActionCard
            icon={<BookOpen />}
            title="Flashcards: Data Structures"
            description="12 cards due for spaced-repetition review today."
            ctaLabel="Review deck"
            onAction={() => toast.info("Design demo — no action taken.")}
          />
        </div>
      </SubSection>

      <SubSection title="Progress rings (ProgressRing)">
        <Specimen label="ProgressRing — 35 / 60 / 100 (complete turns lime) · sizes 40/56">
          <ProgressRing value={35} />
          <ProgressRing value={60} />
          <ProgressRing value={100} />
          <ProgressRing value={72} size={56} strokeWidth={5} />
        </Specimen>
      </SubSection>

      <SubSection title="Study streak (StreakCalendar)">
        <div className="grid min-w-0 gap-6 lg:grid-cols-2">
          <Specimen label="StreakCalendar — lime marks study days" className="items-start">
            <StreakCalendar
              streakCount={21}
              activeDays={[1, 2, 3, 6, 7, 8, 9, 13, 14, 15, 16, 17, 20, 21, 22, 23, 24, 27, 28]}
              className="w-full max-w-xs"
            />
          </Specimen>
          <Specimen label="StreakCalendar — empty state (new student)" className="items-start">
            <StreakCalendar streakCount={0} activeDays={[]} className="w-full max-w-xs" />
          </Specimen>
        </div>
      </SubSection>
    </Section>
  );
}
