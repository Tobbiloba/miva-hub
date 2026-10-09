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
    <div className="flex h-full flex-col rounded-[22px] bg-[#edf3d3] p-8 text-[#23332b] sm:p-10">
      <span className="font-[family-name:var(--font-serif)] text-5xl leading-none text-[#23332b]/70">
        &ldquo;
      </span>
      <p
        key={i}
        className="mt-4 text-2xl leading-snug tracking-[-0.02em] animate-in fade-in-0 duration-500 sm:text-[34px] sm:leading-[1.2]"
      >
        {q.text}
      </p>
      <p className="mt-6 text-xs font-medium tracking-[0.14em] text-[#23332b]/70 uppercase">
        {q.by}
      </p>
      <div className="mt-auto flex items-center justify-between pt-10">
        <span className="text-xs tabular-nums text-[#23332b]/70">
          {String(i + 1).padStart(2, "0")} /{" "}
          {String(QUOTES.length).padStart(2, "0")}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous quote"
            className="grid size-12 place-items-center rounded-2xl bg-[#263f35] text-white transition-colors hover:bg-[#1f342b]"
          >
            <ArrowLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next quote"
            className="grid size-12 place-items-center rounded-2xl bg-[#263f35] text-white transition-colors hover:bg-[#1f342b]"
          >
            <ArrowRight className="size-5" />
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
    <div className="border-t border-[#dcdcd6]">
      {FAQS.map((f, i) => {
        const isOpen = open === i;
        return (
          <div key={f.q} className="border-b border-[#dcdcd6]">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-6 py-7 text-left"
            >
              <span className="text-2xl tracking-[-0.02em] text-[#3d4741] sm:text-[28px]">
                {f.q}
              </span>
              {isOpen ? (
                <Minus className="size-5 shrink-0 text-[#23332b]" />
              ) : (
                <Plus className="size-5 shrink-0 text-[#23332b]" />
              )}
            </button>
            <div
              className={cn(
                "grid transition-[grid-template-rows] duration-300 ease-out",
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <p className="overflow-hidden pr-10 text-lg leading-relaxed text-[#6f7570]">
                <span className="block pb-7">{f.a}</span>
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
