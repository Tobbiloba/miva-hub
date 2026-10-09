"use client";

import { AsklyLogo } from "@/components/ui/logo-box";
import { motion, useScroll, useTransform } from "framer-motion";
import type { MotionValue } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { WaitlistForm } from "./waitlist-form";

const STATEMENT =
  "A study partner that adapts to your courses, learns how you study, and keeps you ahead at every step.";

function Word({
  word,
  progress,
  range,
}: {
  word: string;
  progress: MotionValue<number>;
  range: [number, number];
}) {
  const opacity = useTransform(progress, range, [0.35, 1]);
  return (
    <motion.span style={{ opacity }} className="mr-[0.25em] inline-block">
      {word}
    </motion.span>
  );
}

const FOOTER_LINKS = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "How it works", href: "#how" },
      { label: "Join the waitlist", href: "#waitlist" },
    ],
  },
  {
    title: "Universities",
    links: [
      { label: "Register your university", href: "/university/register" },
      { label: "Sign in", href: "/sign-in" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
];

export function ClosingSection() {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 85%", "end 45%"],
  });
  const words = STATEMENT.split(" ");

  return (
    <section className="p-2 sm:p-3">
      <div className="relative overflow-hidden rounded-[28px] bg-[#1f2a1f]">
        <Image
          src="/landing/forest.webp"
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d1a12]/70 via-[#0d1a12]/55 to-[#0d1a12]/80" />

        <div className="relative mx-auto max-w-6xl px-5 pt-24 pb-8 sm:px-8 lg:px-24">
          <p
            ref={ref}
            className="max-w-3xl font-display text-4xl font-bold leading-tight text-white sm:text-5xl"
          >
            {words.map((w, i) => (
              <Word
                key={`${w}-${i}`}
                word={w}
                progress={scrollYProgress}
                range={[i / words.length, (i + 1) / words.length]}
              />
            ))}
          </p>

          <div
            id="waitlist"
            className="mt-14 grid scroll-mt-8 items-start gap-8 lg:grid-cols-[1fr_1.1fr]"
          >
            <div className="text-white">
              <h2 className="font-display text-3xl font-bold">
                Join the waitlist
              </h2>
              <p className="mt-2 max-w-sm text-white/80">
                Askly is opening university by university. Leave your email and
                we&apos;ll let you know the moment it&apos;s ready for you.
              </p>
            </div>
            <WaitlistForm source="footer" />
          </div>

          <footer className="mt-20 grid gap-3 md:grid-cols-[1fr_2.2fr]">
            <div className="flex flex-col justify-between rounded-2xl bg-white p-6 text-neutral-900">
              <AsklyLogo />
              <p className="mt-6 text-sm text-neutral-600">
                Your AI study partner, built on your own course materials.
              </p>
            </div>
            <div className="flex flex-col justify-between rounded-2xl bg-white p-6 text-neutral-900">
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
                {FOOTER_LINKS.map((col) => (
                  <div key={col.title}>
                    <p className="text-xs font-semibold">{col.title}</p>
                    <ul className="mt-3 space-y-2 text-xs text-neutral-600">
                      {col.links.map((l) => (
                        <li key={l.label}>
                          <Link
                            href={l.href}
                            className="hover:text-neutral-900"
                          >
                            {l.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <p className="mt-10 text-xs text-neutral-500">
                © {new Date().getFullYear()} Askly. All rights reserved.
              </p>
            </div>
          </footer>
        </div>
      </div>
    </section>
  );
}
