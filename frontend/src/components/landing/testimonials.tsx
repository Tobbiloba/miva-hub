"use client";
import { cn } from "lib/utils";
import { ArrowRight } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { btnSecondary, card, eyebrow, heading, reveal } from "./styles";

interface Example {
  id: number;
  question: string;
  answer: string;
  course: string;
  courseTitle: string;
  tags: string[];
}

// Real kinds of requests Askly handles, in a student's own words
const examples: Example[] = [
  {
    id: 1,
    question: "What's the difference between RAM and ROM?",
    answer:
      "RAM holds what the CPU is working on and is cleared when the power goes off. ROM keeps the start-up instructions. Source: COS101 Week 2, Anatomy of a Computer System.",
    course: "COS101",
    courseTitle: "Introduction to Computing Sciences",
    tags: ["Answer", "Sources"],
  },
  {
    id: 2,
    question: "Quiz me on the generations of computing.",
    answer:
      "Five questions from your Week 1 notes, each with four options. Askly marks every answer and shows the right one when you miss.",
    course: "COS101",
    courseTitle: "Introduction to Computing Sciences",
    tags: ["Quiz", "Week 1"],
  },
  {
    id: 3,
    question: "Make me flashcards from my last lecture.",
    answer:
      "A deck from your latest lesson. Save it, and Askly brings each card back just before you'd forget it.",
    course: "COS101",
    courseTitle: "Introduction to Computing Sciences",
    tags: ["Flashcards", "Review"],
  },
];

const Testimonials: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = examples[activeIndex];

  return (
    <section className="mx-auto max-w-6xl px-5 py-24 sm:px-8 sm:py-32">
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16">
        <div data-reveal className={reveal}>
          <p className={eyebrow}>In your own words</p>
          <h2
            className={cn(heading, "mt-3 text-4xl sm:text-5xl leading-[1.05]")}
          >
            Ask it the way you&apos;d ask a classmate.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Plain questions, answered from your own course materials, with the
            source every time.
          </p>
          <a href="#how-it-works" className={cn(btnSecondary, "mt-8")}>
            See how it works
            <ArrowRight className="size-4" />
          </a>
        </div>

        <div
          data-reveal
          style={{ transitionDelay: "120ms" }}
          className={cn(reveal, card, "p-6 sm:p-8")}
        >
          {/* The question, as a chat bubble */}
          <div className="flex justify-end">
            <p className="max-w-[85%] rounded-[18px] bg-secondary px-4 py-2.5 text-[15px] sm:text-base">
              {active.question}
            </p>
          </div>
          <div className="mt-5 flex gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-[8px] bg-white text-[12px] font-semibold text-black">
              A
            </span>
            <p className="text-[15px] leading-7 text-white/85 sm:text-base">
              {active.answer}
            </p>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-5">
            <span className="rounded-md bg-white/10 px-2 py-1 text-xs font-semibold text-white">
              {active.course}
            </span>
            <span className="text-sm text-muted-foreground">
              {active.courseTitle}
            </span>
            <span className="ml-auto flex gap-1.5">
              {active.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/10 px-2.5 py-0.5 text-xs text-white/70"
                >
                  {tag}
                </span>
              ))}
            </span>
          </div>

          <div className="mt-6 flex justify-center gap-2">
            {examples.map((example, index) => (
              <button
                type="button"
                key={example.id}
                onClick={() => setActiveIndex(index)}
                className="grid h-6 place-items-center px-1"
                aria-label={`Show example ${index + 1}`}
                aria-pressed={index === activeIndex}
              >
                <span
                  className={cn(
                    "block h-1.5 rounded-full transition-all",
                    index === activeIndex
                      ? "w-6 bg-white"
                      : "w-1.5 bg-white/25 hover:bg-white/50",
                  )}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
