"use client";

import { cn } from "lib/utils";
import { ArrowLeft, ArrowRight, Minus, Plus } from "lucide-react";
import { useState } from "react";

const QUOTES = [
  {
    text: "You don’t have to become a different person to begin. Just bring yourself, exactly as you are. We’ll meet you on the mat.",
    by: "Elliot Reed · Founder",
  },
  {
    text: "Ten quiet minutes in the morning changed the shape of my whole day. That’s all Souma asks for.",
    by: "Maya Lin · Instructor",
  },
  {
    text: "We built the practice we wanted for ourselves: gentle, honest, and there whenever you’re ready.",
    by: "Jonah Brooks · Co-founder",
  },
];

/** Pale-lime quote card with "01 / 03" and square arrow buttons. */
export function QuoteSlider() {
  const [i, setI] = useState(0);
  const q = QUOTES[i];
  const go = (d: number) =>
    setI((v) => (v + d + QUOTES.length) % QUOTES.length);
  return (
    <div className="flex h-full flex-col rounded-[22px] bg-[#eef3d2] px-7 pt-10 pb-10 text-[#1d2a23] sm:px-10 sm:pt-12">
      <span className="text-[44px] leading-[0.6] italic text-[#1d2a23]">
        &rdquo;
      </span>
      <p
        key={i}
        className="mt-12 max-w-[820px] text-2xl leading-[1.22] tracking-[-0.01em] animate-in fade-in-0 duration-500 sm:text-[32px] lg:text-[40px]"
      >
        {q.text}
      </p>
      <p className="mt-10 text-xs tracking-[0.14em] text-[#3d4741] uppercase">
        {q.by}
      </p>
      <div className="mt-auto flex items-center justify-between pt-12">
        <span className="text-[13px] tabular-nums text-[#3d4741]">
          {String(i + 1).padStart(2, "0")} /{" "}
          {String(QUOTES.length).padStart(2, "0")}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous quote"
            className="grid size-[52px] place-items-center rounded-[18px] bg-[#263c32] text-white transition-colors hover:bg-[#1f342b]"
          >
            <ArrowLeft className="size-5" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next quote"
            className="grid size-[52px] place-items-center rounded-[18px] bg-[#263c32] text-white transition-colors hover:bg-[#1f342b]"
          >
            <ArrowRight className="size-5" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </div>
  );
}

const FAQS = [
  {
    q: "Can I start as a beginner?",
    a: "Absolutely. Start with gentle foundations, follow the cues, and take every movement at your own pace. You don’t need to be flexible to begin.",
  },
  {
    q: "How much time do I need?",
    a: "As little as five minutes. Most sessions run between 5 and 30 minutes, so there’s always one that fits your day.",
  },
  {
    q: "Do I need any equipment?",
    a: "Just a little space and a mat if you have one. A cushion or a couple of books can stand in for blocks.",
  },
  {
    q: "What kinds of practice will I find?",
    a: "Gentle flows, mindful movement, breathwork, mobility and evening wind-downs, organised by how you want to feel.",
  },
  {
    q: "Where can I download Souma?",
    a: "Souma is available on the App Store and Google Play. Start free, no payment needed.",
  },
];

/** Hairline accordion; the first item starts open (minus), the rest plus. */
export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div>
      {FAQS.map((f, i) => {
        const isOpen = open === i;
        return (
          <div key={f.q} className="border-b border-[#e2e2dd]">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-6 py-[30px] text-left lg:pr-[30px]"
            >
              <span className="text-2xl tracking-[-0.01em] text-[#4a524c] sm:text-[30px]">
                {f.q}
              </span>
              {isOpen ? (
                <Minus
                  className="size-5 shrink-0 text-[#1d2a23]"
                  strokeWidth={1.5}
                />
              ) : (
                <Plus
                  className="size-5 shrink-0 text-[#1d2a23]"
                  strokeWidth={1.5}
                />
              )}
            </button>
            <div
              className={cn(
                "grid transition-[grid-template-rows] duration-300 ease-out",
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <p className="overflow-hidden pr-10 text-lg leading-[1.5] text-[#6f7570] lg:text-[19px]">
                <span className="block pb-7">{f.a}</span>
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
