"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpenCheck,
  BrainCircuit,
  CalendarClock,
  Layers,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { PhoneFrame } from "./frames";

const PILLARS = [
  {
    icon: BookOpenCheck,
    title: "Answers from your materials",
    body: "Askly reads the lectures and notes you capture and cites them, so you can check every answer.",
  },
  {
    icon: CalendarClock,
    title: "Knows what's due",
    body: "Assignments and quizzes from your LMS land on one deadline list, and the chat brings them up first.",
  },
  {
    icon: BrainCircuit,
    title: "Remembers how you study",
    body: "Quiz scores, missed questions and finished work shape what Askly suggests next.",
  },
  {
    icon: Layers,
    title: "Practice that sticks",
    body: "Turn any lecture into a quiz or a flashcard deck with spaced repetition, in one message.",
  },
  {
    icon: Smartphone,
    title: "Works on any device",
    body: "Start on your laptop, revise on your phone. Your chats and decks follow you.",
  },
  {
    icon: ShieldCheck,
    title: "Private by default",
    body: "Your notes and chats are yours. No ads, no selling data, nothing shared with classmates.",
  },
];

const KEY_FEATURES = [
  {
    title: "Course-grounded answers",
    body: [
      "Ask anything about your courses and Askly answers from the lecture notes and PDFs you captured, with [S1] chips that open the source.",
      "If something isn't in your materials yet, it tells you instead of guessing.",
    ],
    screen: "/landing/screens/mobile-answer-light.webp",
    photo: "/landing/valley.webp",
  },
  {
    title: "Deadlines that find you",
    body: [
      "Captured assignments and quizzes bring their due dates with them. Add your own in a tap, or just tell the chat.",
      "Ask “what's due?” and get a plan for the week.",
    ],
    screen: "/landing/screens/mobile-deadlines-light.webp",
    photo: "/landing/sunrise.webp",
  },
  {
    title: "Flashcards from your notes",
    body: [
      "One message turns a lecture into a deck. Save it, then review the cards that are due each day.",
      "Spaced repetition keeps the hard ones coming back until they stick.",
    ],
    screen: "/landing/screens/mobile-flashcards-light.webp",
    photo: "/landing/teal-peak.webp",
  },
  {
    title: "Practice before the test",
    body: [
      "Get a practice quiz from this week's materials with feedback after every answer.",
      "Askly remembers what you missed and brings it back next time.",
    ],
    screen: "/landing/screens/mobile-chat-light.webp",
    photo: "/landing/hero-peak.webp",
  },
];

const ROTATE_MS = 7000;

export function FeaturesSection() {
  return (
    <section id="features" className="relative overflow-hidden">
      {/* soft, blurred continuation of the hero scene */}
      <div aria-hidden className="absolute inset-0">
        <Image
          src="/landing/hero-peak.webp"
          alt=""
          fill
          sizes="100vw"
          className="scale-110 object-cover blur-2xl"
        />
        <div className="absolute inset-0 bg-[#24456e]/35" />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 py-24 sm:px-8 lg:px-24">
        <h2 className="text-center font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Engineered differently, built for you
        </h2>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map(({ icon: Icon, title, body }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: (i % 3) * 0.08, duration: 0.5 }}
              className="rounded-2xl border border-white/60 bg-white p-6 text-neutral-900 shadow-xl"
            >
              <Icon className="size-6" aria-hidden />
              <h3 className="mt-5 font-display text-lg font-bold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-neutral-600">
                {body}
              </p>
            </motion.div>
          ))}
        </div>

        <div id="how" className="scroll-mt-8 pt-32">
          <h2 className="text-center font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Unlock your full potential with Askly
          </h2>
          <KeyFeatures />
        </div>
      </div>
    </section>
  );
}

function KeyFeatures() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setTimeout(
      () => setActive((i) => (i + 1) % KEY_FEATURES.length),
      ROTATE_MS,
    );
    return () => clearTimeout(id);
  }, [active, paused]);

  const current = KEY_FEATURES[active];

  return (
    <div
      className="mt-12 grid gap-6 rounded-3xl bg-white p-4 text-neutral-900 shadow-2xl sm:p-6 lg:grid-cols-[1fr_1.15fr]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="flex flex-col p-2 sm:p-4">
        <span className="w-fit rounded-full border border-neutral-200 px-3 py-1 text-xs font-medium">
          Key features
        </span>
        <ul className="mt-5 flex flex-1 flex-col">
          {KEY_FEATURES.map((f, i) => {
            const isActive = i === active;
            return (
              <li
                key={f.title}
                className="relative border-t border-neutral-200"
              >
                {isActive && !paused && (
                  <motion.span
                    key={`bar-${active}`}
                    aria-hidden
                    className="absolute -top-px left-0 h-0.5 bg-neutral-900"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: ROTATE_MS / 1000, ease: "linear" }}
                  />
                )}
                {isActive && paused && (
                  <span
                    aria-hidden
                    className="absolute -top-px left-0 h-0.5 w-full bg-neutral-900"
                  />
                )}
                <button
                  type="button"
                  onClick={() => setActive(i)}
                  aria-expanded={isActive}
                  className={`w-full py-4 text-left font-display text-lg font-bold transition-colors ${
                    isActive
                      ? "text-neutral-900"
                      : "text-neutral-400 hover:text-neutral-700"
                  }`}
                >
                  {f.title}
                </button>
                <AnimatePresence initial={false}>
                  {isActive && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-3 pb-6 text-sm leading-relaxed text-neutral-600">
                        {f.body.map((p) => (
                          <p key={p}>{p}</p>
                        ))}
                        <a
                          href="#waitlist"
                          className="mt-3 inline-flex h-9 items-center rounded-lg bg-neutral-950 px-4 text-xs font-semibold text-white transition hover:bg-neutral-800"
                        >
                          Join the waitlist
                        </a>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="relative min-h-[460px] overflow-hidden rounded-2xl sm:min-h-[560px]">
        <AnimatePresence mode="sync">
          <motion.div
            key={current.photo}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0"
          >
            <Image
              src={current.photo}
              alt=""
              fill
              sizes="(min-width: 1024px) 560px, 100vw"
              className="object-cover"
            />
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 grid place-items-center p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.screen}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4 }}
              className="w-[230px] sm:w-[250px]"
            >
              <PhoneFrame src={current.screen} alt={current.title} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
