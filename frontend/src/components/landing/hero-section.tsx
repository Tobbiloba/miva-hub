"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import { DesktopFrame, PhoneFrame } from "./frames";
import { SiteNav } from "./site-nav";

const LINES = ["Study smarter. Stress less.", "Let Askly handle the rest."];

function RevealLine({ text, delay }: { text: string; delay: number }) {
  return (
    <span className="block">
      {text.split(" ").map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ delay: delay + i * 0.08, duration: 0.6 }}
          className="mr-[0.25em] inline-block"
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
}

export function HeroSection() {
  return (
    <section className="p-2 sm:p-3">
      <div className="relative overflow-hidden rounded-[28px] bg-[#1d4f8f]">
        <Image
          src="/landing/hero-peak.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[50%_70%]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0b2a55]/45 via-transparent to-transparent" />

        <div className="relative">
          <SiteNav />

          <div className="mx-auto max-w-6xl px-5 pt-14 pb-10 sm:px-8 sm:pt-24 lg:px-24">
            <h1 className="text-5xl font-semibold leading-[1.02] tracking-[-0.035em] text-white sm:text-6xl lg:text-7xl">
              <RevealLine text={LINES[0]} delay={0.1} />
              <RevealLine text={LINES[1]} delay={0.5} />
            </h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.6 }}
              className="mt-5 max-w-lg text-base text-white/85 sm:text-lg"
            >
              Askly answers from your own course materials, keeps track of your
              deadlines, and turns lectures into quizzes and flashcards.
            </motion.p>
            <motion.a
              href="#waitlist"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 }}
              className="mt-8 inline-flex h-11 items-center rounded-xl bg-white px-5 text-sm font-semibold text-neutral-900 shadow-lg transition hover:bg-white/90"
            >
              Join the waitlist
            </motion.a>
          </div>

          {/* Two product cards rising from the bottom of the photo */}
          <div className="mx-auto mt-16 grid max-w-6xl gap-5 px-5 sm:px-8 md:mt-28 md:grid-cols-2 lg:px-24">
            <ProductCard
              label="On your phone"
              title="Your study partner, always with you."
              body="Quiz yourself on the bus, check what's due between lectures."
            >
              <div className="flex justify-center gap-4 px-6">
                <PhoneFrame
                  src="/landing/screens/mobile-answer-light.webp"
                  alt="Askly answering from course notes on a phone"
                  className="mt-10 w-[44%] max-w-[210px]"
                  priority
                />
                <PhoneFrame
                  src="/landing/screens/mobile-chat-light.webp"
                  alt="Askly's chat home on a phone"
                  className="w-[44%] max-w-[210px]"
                  priority
                />
              </div>
            </ProductCard>
            <ProductCard
              label="On your laptop"
              title="Built for the way you study."
              body="Your courses, deadlines and flashcards in one calm place."
              className="md:mt-24"
            >
              <div className="px-6">
                <DesktopFrame
                  src="/landing/screens/desktop-chat-light.webp"
                  alt="Askly on a laptop"
                  priority
                />
              </div>
            </ProductCard>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductCard({
  label,
  title,
  body,
  children,
  className,
}: {
  label: string;
  title: string;
  body: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7 }}
      className={`h-[430px] overflow-hidden rounded-t-3xl border border-b-0 border-white/25 bg-[#5d6f86]/60 text-white backdrop-blur-xl sm:h-[470px] ${className ?? ""}`}
    >
      <div className="flex items-center justify-between px-5 pt-4">
        <span className="text-sm font-semibold">{label}</span>
        <a
          href="#waitlist"
          className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-2.5 py-1 text-xs font-medium transition hover:bg-white/25"
        >
          Join waitlist <ArrowUpRight className="size-3.5" />
        </a>
      </div>
      <div className="px-6 pt-5 pb-6 text-center">
        <p className="text-xl font-semibold tracking-[-0.025em] sm:text-2xl">
          {title}
        </p>
        <p className="mx-auto mt-1.5 max-w-xs text-sm text-white/80">{body}</p>
      </div>
      {children}
    </motion.div>
  );
}
