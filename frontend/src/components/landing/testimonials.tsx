"use client";
import { ArrowRight } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { Button } from "ui/button";

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
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-20">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-12 items-center">
        {/* Left Side - Content */}
        <div className="space-y-4 sm:space-y-6">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-normal leading-tight">
            Ask it the way you&apos;d ask a classmate
          </h1>
          <p className="text-neutral-200 text-sm sm:text-base md:text-lg leading-relaxed">
            Plain questions, answered from your own course materials, with the
            source every time.
          </p>

          <Button
            asChild
            className="mt-4 rounded gap-2 p-1.5 pl-4 sm:pl-6 h-fit hover:gap-3 transition-all text-sm sm:text-base"
          >
            <a href="#how-it-works">
              See how it works
              <span className="p-2 sm:p-3 bg-lime-400 text-black rounded">
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </span>
            </a>
          </Button>
        </div>

        {/* Right Side - Example Card */}
        <div className="relative col-span-2">
          <div className="bg-black/30 rounded p-5 sm:p-6 md:p-8 lg:p-10 shadow-sm">
            <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-normal mb-4 sm:mb-6 text-white">
              &ldquo;{active.question}&rdquo;
            </h2>

            <p className="text-neutral-300 text-sm sm:text-base leading-relaxed mb-6 sm:mb-8">
              {active.answer}
            </p>

            <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
              <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-white text-black rounded flex-shrink-0 grid place-items-center text-xs sm:text-sm font-semibold">
                {active.course}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h3 className="font-semibold text-base sm:text-lg">
                      {active.course}
                    </h3>
                    <p className="text-neutral-300 text-sm">
                      {active.courseTitle}
                    </p>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    {active.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-white text-black rounded text-xs sm:text-sm font-medium border border-gray-200"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Pagination Dots */}
            <div className="flex justify-center gap-2">
              {examples.map((example, index) => (
                <button
                  type="button"
                  key={example.id}
                  onClick={() => setActiveIndex(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === activeIndex
                      ? "bg-white w-8"
                      : "w-2 bg-neutral-600 hover:bg-neutral-400"
                  }`}
                  aria-label={`Show example ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Testimonials;
