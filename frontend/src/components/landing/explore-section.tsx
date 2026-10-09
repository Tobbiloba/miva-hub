"use client";

import { motion } from "framer-motion";
import {
  ArrowUp,
  AudioWaveform,
  CheckCircle2,
  Command,
  Paperclip,
} from "lucide-react";

const ROWS = [
  {
    title: "Talk it through",
    body: "Stuck on a concept? Switch to voice and talk to Askly like a study partner, hands free.",
    color: "bg-[#7a5a40]",
    mock: (
      <div className="w-[78%] rounded-2xl border border-white/15 bg-[#2b221c] p-4 shadow-2xl">
        <p className="text-sm text-white/50">
          Explain recursion like I&apos;m new…
        </p>
        <div className="mt-6 flex items-center justify-end gap-3 text-white/60">
          <Paperclip className="size-4" />
          <span className="grid size-9 place-items-center rounded-xl bg-[#6b93ff] text-white">
            <AudioWaveform className="size-4" />
          </span>
        </div>
      </div>
    ),
  },
  {
    title: "Capture from your LMS",
    body: "The Askly Capture extension saves lecture videos, PDFs, assignments and quizzes from your LMS in one click.",
    color: "bg-[#2f6f73]",
    mock: (
      <div className="w-[70%] rounded-2xl bg-white p-4 text-neutral-900 shadow-2xl">
        <p className="text-xs font-semibold text-neutral-500">Askly Capture</p>
        <p className="mt-2 text-sm font-semibold">
          COS101 Week 3: Number systems
        </p>
        <p className="text-xs text-neutral-500">Lecture video · 42 min</p>
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
          <CheckCircle2 className="size-4" /> Captured. Askly can answer from it
        </div>
      </div>
    ),
  },
  {
    title: "Answers you can check",
    body: "Every answer from your notes comes with sources. Tap a chip to open the exact material it came from.",
    color: "bg-[#3b5bdb]",
    mock: (
      <div className="w-[80%] rounded-2xl bg-white/95 p-4 text-neutral-900 shadow-2xl">
        <p className="text-center text-sm font-semibold">
          What did my notes say about transistors?
        </p>
        <p className="mt-3 text-xs leading-relaxed text-neutral-600">
          The second generation replaced vacuum tubes with transistors, making
          computers smaller and more reliable{" "}
          <span className="rounded bg-blue-100 px-1 font-semibold text-blue-700">
            S1
          </span>{" "}
          <span className="rounded bg-blue-100 px-1 font-semibold text-blue-700">
            S2
          </span>
        </p>
        <div className="mt-3 flex justify-end">
          <span className="grid size-8 place-items-center rounded-lg bg-neutral-900 text-white">
            <ArrowUp className="size-4" />
          </span>
        </div>
      </div>
    ),
  },
  {
    title: "Instant access",
    body: "Keyboard shortcuts for a new chat, the sidebar and voice, so Askly is always one key away.",
    color: "bg-[#4f6b3a]",
    mock: (
      <div className="flex items-center gap-2">
        {["⌘", "⇧", "O"].map((k) => (
          <span
            key={k}
            className="grid size-14 place-items-center rounded-2xl border border-white/30 bg-white/15 font-display text-2xl font-bold text-white shadow-xl"
          >
            {k === "⌘" ? <Command className="size-6" /> : k}
          </span>
        ))}
      </div>
    ),
  },
];

export function ExploreSection() {
  return (
    <section className="bg-white text-neutral-900">
      <div className="mx-auto max-w-6xl px-5 pb-24 sm:px-8 lg:px-24">
        <h2 className="text-center font-display text-4xl font-bold tracking-tight sm:text-5xl">
          Explore more features in Askly
        </h2>
        <div className="mt-14 space-y-6">
          {ROWS.map((row) => (
            <motion.div
              key={row.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6 }}
              className="grid items-center gap-6 md:grid-cols-[1fr_1.4fr] md:gap-12"
            >
              <div>
                <h3 className="font-display text-2xl font-bold">{row.title}</h3>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-neutral-600">
                  {row.body}
                </p>
              </div>
              <div
                className={`grid aspect-[16/10] place-items-center rounded-3xl ${row.color}`}
              >
                {row.mock}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
