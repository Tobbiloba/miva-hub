"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";
import { DesktopFrame } from "./frames";

const TABS = [
  {
    title: "Light and dark",
    body: "A calm light theme for the library and a warm dark one for late nights.",
    screen: "/landing/screens/desktop-answer-dark.webp",
  },
  {
    title: "Your courses, one place",
    body: "Courses, captures and recent activity side by side, so nothing slips.",
    screen: "/landing/screens/desktop-courses-light.webp",
  },
  {
    title: "Practice built in",
    body: "Quizzes and flashcards render right in the chat, ready to save.",
    screen: "/landing/screens/desktop-flashcards-light.webp",
  },
];

const ROTATE_MS = 6000;

export function AppearanceSection() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const id = setTimeout(
      () => setActive((i) => (i + 1) % TABS.length),
      ROTATE_MS,
    );
    return () => clearTimeout(id);
  }, [active]);

  return (
    <section
      id="appearance"
      className="relative -mt-8 rounded-t-[32px] bg-white text-neutral-900"
    >
      <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8 lg:px-24">
        <span className="rounded-full border border-neutral-200 px-3 py-1 text-xs font-medium">
          Appearance
        </span>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
              Make Askly truly yours
            </h2>
            <p className="mt-2 text-base text-neutral-600">
              A clean, focused space that fits the way you study.
            </p>
          </div>
          <a
            href="#waitlist"
            className="inline-flex h-10 w-fit items-center rounded-lg bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            Join the waitlist
          </a>
        </div>

        <div className="relative mt-10 overflow-hidden rounded-3xl">
          <Image
            src="/landing/sunrise.webp"
            alt=""
            fill
            sizes="(min-width: 1024px) 1000px, 100vw"
            className="object-cover"
          />
          <div className="relative px-4 pt-8 sm:px-12 sm:pt-14">
            <AnimatePresence mode="wait">
              <motion.div
                key={TABS[active].screen}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.45 }}
              >
                <DesktopFrame
                  src={TABS[active].screen}
                  alt={TABS[active].title}
                  className="rounded-b-none"
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {TABS.map((tab, i) => {
            const isActive = i === active;
            return (
              <button
                key={tab.title}
                type="button"
                onClick={() => setActive(i)}
                aria-pressed={isActive}
                className="relative border-t border-neutral-200 pt-4 text-left"
              >
                {isActive && (
                  <motion.span
                    key={`bar-${active}`}
                    aria-hidden
                    className="absolute -top-px left-0 h-0.5 bg-neutral-900"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: ROTATE_MS / 1000, ease: "linear" }}
                  />
                )}
                <span
                  className={`block font-display text-xl font-bold transition-colors ${
                    isActive ? "text-neutral-900" : "text-neutral-400"
                  }`}
                >
                  {tab.title}
                </span>
                <span
                  className={`mt-1 block text-sm transition-colors ${
                    isActive ? "text-neutral-600" : "text-neutral-400"
                  }`}
                >
                  {tab.body}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
