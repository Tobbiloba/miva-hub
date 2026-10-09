import { cn } from "lib/utils";
import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import type { ReactNode } from "react";
import { Faq, QuoteSlider } from "./interactive";

/*
 * Landing v2: a faithful build of the "Souma" reference in design/
 * (f0811f5a…webp), section by section, with matching photography.
 */

export const metadata: Metadata = {
  title: "Souma · A little space for you",
  description:
    "Guided yoga and mindful moments, made for real life. Move gently. Breathe deeply. Come back to yourself.",
};

/** "Download the app" pill with the dark square arrow (52px tall). */
function Pill({
  children,
  tone = "light",
  className,
  href = "#",
}: {
  children: ReactNode;
  tone?: "light" | "white" | "dark" | "plain";
  className?: string;
  href?: string;
}) {
  return (
    <a
      href={href}
      className={cn(
        "group inline-flex h-[52px] items-center gap-8 rounded-[18px] pr-2.5 pl-[22px] text-base transition-colors",
        tone === "white" && "bg-[#f6f5f1] text-[#1d2a23] hover:bg-white",
        tone === "light" && "bg-[#f3f2ee] text-[#1d2a23] hover:bg-[#ebeae5]",
        tone === "dark" && "bg-[#263f35] text-white hover:bg-[#1f342b]",
        tone === "plain" && "text-[#1d2a23]",
        className,
      )}
    >
      {children}
      <span
        className={cn(
          "grid size-8 place-items-center rounded-[9px] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5",
          tone === "dark"
            ? "bg-[#f6f5f1] text-[#1d2a23]"
            : "bg-[#263f35] text-white",
        )}
      >
        <ArrowUpRight className="size-4" strokeWidth={1.75} />
      </span>
    </a>
  );
}

/** Small uppercase section label: "/ LABEL" on the left, "[00n]" on the right. */
function Label({ children, n }: { children: ReactNode; n?: string }) {
  return (
    <div className="flex items-center justify-between text-xs tracking-[0.14em] text-[#5f665f] uppercase">
      <span>/ {children}</span>
      {n ? <span className="tracking-normal">[{n}]</span> : null}
    </div>
  );
}

/** Uppercase meta line under a title, e.g. "BEGINNER · GENTLE". */
const meta = "text-xs tracking-[0.02em] text-[#2b3630] uppercase";
/** Section headline (62px at desktop). */
const h2 =
  "text-[42px] leading-[1.02] tracking-[-0.015em] sm:text-[52px] lg:text-[64px]";
/** Large muted body copy. */
const lead = "text-lg leading-[1.45] text-[#6f7570] lg:text-[22px]";

function Photo({
  src,
  alt,
  className,
  sizes = "(min-width: 1024px) 50vw, 100vw",
  priority,
  position,
}: {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  position?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-[22px]", className)}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
        style={position ? { objectPosition: position } : undefined}
      />
    </div>
  );
}

const NAV = [
  "About",
  "Practice",
  "Programs",
  "Classes",
  "Philosophy",
  "Pricing",
  "FAQ",
];

const FLOWS = [
  [
    "Begin with the basics",
    "A welcoming introduction to movement, breath, and finding your feet on the mat.",
    "Beginner · Gentle",
  ],
  [
    "Wake up gently",
    "Easy morning flows to stretch into the day with a little more intention.",
    "Morning · Energizing",
  ],
  [
    "Slow down, settle in",
    "Unhurried stretches and quiet breathing to create a softer end to your day.",
    "Evening · Restorative",
  ],
  [
    "Move a little more freely",
    "Thoughtful mobility sessions for everyday ease, one small stretch at a time.",
    "Anytime · Mobility",
  ],
];

const PLANS = [
  {
    name: "Free",
    badge: "Get started",
    blurb: "A gentle place to begin.",
    price: "$0",
    per: "/ forever",
    items: [
      "A selection of starter classes",
      "5–15 minute daily sessions",
      "Introductory breathwork",
      "Practice reminders",
      "Save your favourite classes",
    ],
    cta: "Start free",
    note: "No payment needed.",
  },
  {
    name: "Monthly",
    badge: "Stay flexible",
    blurb: "More room to explore, every day.",
    price: "$7",
    per: "/ month",
    items: [
      "Full yoga & breathwork library",
      "Guided multi-week programs",
      "Download classes for offline use",
      "Practice reminders",
      "Track your practice",
    ],
    cta: "Choose monthly",
    note: "$7 billed monthly.",
  },
  {
    name: "Yearly",
    badge: "Best value",
    blurb: "A year of showing up for yourself.",
    price: "$69",
    per: "/ year",
    items: [
      "Full yoga & breathwork library",
      "Guided multi-week programs",
      "Download classes for offline use",
      "Practice reminders",
      "Track your practice",
    ],
    cta: "Choose yearly",
    note: "$69 billed yearly · $5.75 / month.",
    dark: true,
  },
];

export default function LandingV2() {
  return (
    <div className="min-h-screen bg-white font-sans text-[#1d2a23] antialiased [font-feature-settings:'cv11'] [&_h1,&_h2,&_h3]:font-normal">
      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="p-2.5">
        <div className="relative h-[max(640px,min(100svh,940px))] overflow-hidden rounded-[22px] bg-[#1e2a20]">
          <Image
            src="/landing/v2/hero-hand.webp"
            alt="A hand holding a phone showing the Souma app among sunlit plants"
            fill
            priority
            sizes="100vw"
            className="object-cover object-[50%_45%] brightness-[0.82] saturate-[0.72] sepia-[0.18]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/20 lg:from-[#141c14]/60 lg:via-[#141c14]/15 lg:to-[#141c14]/25" />

          {/* Floating nav */}
          <header className="absolute inset-x-0 top-[9px] z-20 flex justify-center px-3">
            <nav className="flex h-[72px] w-full max-w-[936px] items-center justify-between gap-6 rounded-[26px] bg-[#1f2d25]/80 pr-2.5 pl-6 text-white backdrop-blur-md">
              <a
                href="#"
                className="text-[28px] tracking-[-0.02em] lg:text-[36px]"
              >
                Souma*
              </a>
              <ul className="hidden items-center gap-[26px] text-[13.5px] text-white/90 lg:flex">
                {NAV.map((n) => (
                  <li key={n}>
                    <a
                      href={`#${n.toLowerCase()}`}
                      className="transition-colors hover:text-white"
                    >
                      {n}
                    </a>
                  </li>
                ))}
              </ul>
              <Pill tone="white" href="#pricing">
                Get the app
              </Pill>
            </nav>
          </header>

          <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-10 px-6 pb-28 text-white sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:pb-[150px]">
            <div>
              <h1 className="max-w-[760px] text-[44px] leading-[1.02] tracking-[-0.02em] sm:text-6xl lg:text-[72px]">
                A little space for you.
                <br />A better rhythm for your day.
              </h1>
            </div>
            <div className="max-w-[340px]">
              <p className="flex items-center gap-2.5 text-xs tracking-[0.14em] text-[#d9eaa3] uppercase">
                <span className="size-1 rounded-full bg-[#d9eaa3]" />
                Your everyday yoga companion
              </p>
              <p className="mt-7 text-lg leading-[1.5] text-white/90 lg:text-xl">
                Guided yoga and mindful moments, made for real life. Move
                gently. Breathe deeply. Come back to yourself.
              </p>
              <Pill tone="white" className="mt-10">
                Download the app
              </Pill>
            </div>
          </div>
          <p className="absolute bottom-[76px] left-6 z-10 hidden gap-6 text-xs tracking-[0.01em] text-white/85 uppercase sm:flex">
            <span>Move with intention.</span>
            <span>Live with more ease.</span>
          </p>
        </div>
      </section>

      {/* ── 001 About ──────────────────────────────────────── */}
      <section
        id="about"
        className="px-6 pt-24 pb-28 lg:pt-[108px] lg:pb-[108px]"
      >
        <Label n="001">A little about Souma</Label>
        <div className="mt-14 grid grid-cols-1 gap-12 lg:mt-[66px] lg:grid-cols-[1fr_1.25fr] lg:gap-[55px]">
          <div>
            <Photo
              src="/landing/v2/meditate.webp"
              alt="A woman meditating cross-legged in a sunlit room"
              className="aspect-[1.1/1]"
              position="50% 40%"
            />
            <p className="mt-10 text-xl">Less pressure. More presence.</p>
            <p className="mt-5 text-base text-[#6f7570]">
              A practice that feels like coming home.
            </p>
          </div>
          <div>
            <h2 className="text-[32px] leading-[1.08] tracking-[-0.02em] sm:text-[40px] lg:text-[46px]">
              &ldquo;We believe yoga belongs in your everyday life—a little room
              to move, breathe, and feel more like yourself.&rdquo;
            </h2>
            <div className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-[0.885fr_1fr] lg:mt-[70px] lg:gap-[49px]">
              <Photo
                src="/landing/v2/mats.webp"
                alt="Yoga mats and cork blocks on a warm wooden floor"
                className="aspect-[0.77/1]"
                sizes="(min-width: 1024px) 25vw, 50vw"
              />
              <div className="flex flex-col">
                <p className={lead}>
                  Start where you are. Find a moment that fits your day, and let
                  Souma guide you from there.
                </p>
                <Pill tone="light" className="mt-12 w-fit">
                  Download the app
                </Pill>
                <div className="mt-8 rounded-[22px] bg-[#d6eb9a] p-6 lg:mt-auto">
                  <p className="text-xs tracking-[0.14em] text-[#3d4a36] uppercase">
                    Your week in balance
                  </p>
                  <p className="mt-5 text-[52px] leading-none tracking-[-0.02em]">
                    65 min
                  </p>
                  <p className="mt-5 text-sm text-[#3d4a36]">
                    Small moments. Lasting rhythm.
                  </p>
                  <div className="mt-6 flex justify-between">
                    {[1, 1, 1, 1, 0, 0, 0].map((on, k) => (
                      <span
                        key={k}
                        className={cn(
                          "size-[21px] rounded-full",
                          on ? "bg-[#1d2a23]" : "bg-[#bcd97e]",
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 002 Daily practice ─────────────────────────────── */}
      <section
        id="practice"
        className="bg-[#f5f4f0] px-6 pt-24 pb-28 lg:pt-[112px] lg:pb-[132px]"
      >
        <Label n="002">Your daily practice</Label>
        <div className="mt-14 grid grid-cols-1 gap-12 lg:mt-[66px] lg:grid-cols-[1.25fr_1fr] lg:gap-[55px]">
          <div className="flex flex-col">
            <h2 className={h2}>A practice that moves with your life.</h2>
            <div className="mt-8 flex flex-wrap gap-2.5">
              {[
                "Gentle flow",
                "Mindful movement",
                "Breathwork",
                "Daily rituals",
              ].map((t) => (
                <span
                  key={t}
                  className="rounded-md bg-white px-3.5 py-[7px] text-sm"
                >
                  {t}
                </span>
              ))}
            </div>
            <p className={cn(lead, "mt-9 max-w-[700px]")}>
              Some days you need energy. Some days you need a softer landing.
              Choose how you want to feel, and find a practice to meet you
              there.
            </p>
            <div className="mt-auto flex flex-col gap-8 pt-16 sm:flex-row sm:items-end">
              <Photo
                src="/landing/v2/guide.webp"
                alt="A smiling instructor with curly hair"
                className="aspect-[0.67/1] w-[185px] shrink-0"
                sizes="200px"
                position="50% 25%"
              />
              <div>
                <p className="max-w-[400px] text-[30px] leading-[1.25] tracking-[-0.01em]">
                  A gentle guide, always with you.
                </p>
                <p className="mt-6 max-w-[420px] text-[19px] leading-[1.5] text-[#6f7570]">
                  Clear cues. Room to pause. Permission to go at your own pace.
                </p>
                <Pill tone="dark" className="mt-8">
                  Find your flow
                </Pill>
              </div>
            </div>
          </div>
          <div>
            <Photo
              src="/landing/v2/warrior.webp"
              alt="A woman in warrior pose in a sunlit studio"
              className="aspect-square"
              position="50% 50%"
            />
            <div className="mt-[23px] rounded-[22px] bg-[#c2d5a8] px-[27px] pt-6 pb-[22px]">
              <p className="text-xs tracking-[0.14em] text-[#4d5a48] uppercase">
                Your next moment
              </p>
              <div className="mt-4 flex items-baseline justify-between">
                <p className="text-[30px] tracking-[-0.01em]">Morning flow</p>
                <p className="text-base">15 min</p>
              </div>
              <p className="mt-3 text-lg text-[#4d5a48]">
                A little movement. A fresh start.
              </p>
              <div className="mt-5 grid grid-cols-14 gap-[7px]">
                {Array.from({ length: 14 }, (_, k) => (
                  <span
                    key={k}
                    className={cn(
                      "h-[42px] rounded-lg",
                      k < 9 ? "bg-[#4f7352]" : "bg-[#e9ecdf]",
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 003 Find your flow ─────────────────────────────── */}
      <section
        id="programs"
        className="px-6 pt-24 pb-28 lg:pt-[108px] lg:pb-[108px]"
      >
        <Label n="003">Find your flow</Label>
        <div className="mt-14 grid grid-cols-1 gap-6 lg:mt-[66px] lg:grid-cols-[1fr_1.25fr] lg:items-end lg:gap-[55px]">
          <h2 className={h2}>
            A little movement.
            <br />A whole new feeling.
          </h2>
          <p className={cn(lead, "pb-1")}>
            Build a practice around what you need today.
          </p>
        </div>
        <div className="mt-14 grid grid-cols-1 gap-12 lg:mt-[68px] lg:grid-cols-[1fr_1.25fr] lg:gap-[55px]">
          <div className="relative">
            <Photo
              src="/landing/v2/tree.webp"
              alt="A woman balancing in tree pose with prayer hands"
              className="aspect-[0.74/1]"
              position="50% 30%"
            />
            <div className="absolute inset-x-6 bottom-6 rounded-[18px] bg-[#eef3d2] p-7">
              <p className="text-xs tracking-[0.14em] text-[#5f665f] uppercase">
                Today&apos;s intention
              </p>
              <p className="mt-6 text-[40px] leading-none tracking-[-0.02em] lg:text-[48px]">
                Make space.
              </p>
              <p className="mt-6 text-base text-[#5f665f] lg:text-lg">
                One breath. One stretch. One moment for you.
              </p>
              <div className="mt-6 flex items-baseline justify-between">
                <span className="text-[30px] tracking-[-0.01em]">12 min</span>
                <span className="text-lg">All levels</span>
              </div>
            </div>
          </div>
          <ul className="flex flex-col">
            {FLOWS.map(([title, body, tag]) => (
              <li
                key={title}
                className="border-b border-[#e2e2dd] pt-10 pb-8 first:pt-7"
              >
                <h3 className="text-[30px] leading-[1.15] tracking-[-0.01em] lg:text-[38px]">
                  {title}
                </h3>
                <p className="mt-5 text-lg leading-[1.45] text-[#6f7570] lg:text-[19px]">
                  {body}
                </p>
                <p className={cn(meta, "mt-4")}>{tag}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── 004 Pocket studio ──────────────────────────────── */}
      <section
        id="classes"
        className="bg-[#f5f4f0] px-6 pt-24 pb-28 lg:pt-[108px] lg:pb-[110px]"
      >
        <Label n="004">Your pocket studio</Label>
        <h2 className={cn(h2, "mt-14 max-w-[800px] lg:mt-[66px]")}>
          Daily rituals, made to fit your rhythm.
        </h2>
        <div className="mt-14 grid grid-cols-1 gap-12 lg:mt-[73px] lg:grid-cols-[1fr_0.87fr_1fr] lg:gap-[51px]">
          <div>
            <Photo
              src="/landing/v2/props.webp"
              alt="A rolled yoga mat with cork blocks on a wooden bench"
              className="aspect-[1.39/1]"
              sizes="(min-width: 1024px) 33vw, 100vw"
            />
            <p className="mt-8 text-[30px] tracking-[-0.01em]">
              Your mat. Your moment.
            </p>
            <p className="mt-6 max-w-[440px] text-lg leading-[1.45] text-[#6f7570] lg:text-xl">
              Bring a little studio feeling to whatever space you call yours.
            </p>
          </div>

          {/* Phone mockup, built in HTML */}
          <div className="mx-auto w-full max-w-[390px] rounded-[44px] border-[10px] border-[#263f35] bg-[#fbfbf9] px-[21px] pt-4 pb-3">
            <div className="flex items-center justify-between px-2 text-sm font-medium">
              <span>9:41</span>
              <span className="h-7 w-[100px] rounded-full bg-[#1d2a23]" />
              <span className="flex items-center gap-1">
                <span className="flex items-end gap-px">
                  {[4, 6, 8, 10].map((h) => (
                    <span
                      key={h}
                      className="w-[2px] rounded-sm bg-[#1d2a23]"
                      style={{ height: h }}
                    />
                  ))}
                </span>
                <span className="ml-1 h-[10px] w-[20px] rounded-[3px] border border-[#1d2a23] p-px">
                  <span className="block h-full w-3/4 rounded-[1px] bg-[#1d2a23]" />
                </span>
              </span>
            </div>
            <p className="mt-8 text-center text-[32px] tracking-[-0.02em]">
              souma
            </p>
            <p className="mt-8 text-[32px] leading-[1.1] tracking-[-0.02em]">
              How do you want to feel?
            </p>
            <div className="mt-6 flex gap-3 text-[13px]">
              <span className="rounded-full bg-[#d6eb9a] px-3 py-2">
                Grounded
              </span>
              <span className="rounded-full bg-[#ecebe5] px-3 py-2">
                Energized
              </span>
              <span className="rounded-full bg-[#ecebe5] px-3 py-2">
                Rested
              </span>
            </div>
            <Photo
              src="/landing/v2/seated.webp"
              alt=""
              className="mt-6 aspect-[1.14/1] rounded-[18px]"
              sizes="340px"
              position="55% 50%"
            />
            <p className="mt-6 text-[30px] tracking-[-0.01em]">A fresh start</p>
            <p className="mt-4 text-[15px] text-[#6f7570]">
              15 min&nbsp;&nbsp;·&nbsp;&nbsp;Gentle flow
            </p>
            <span className="mt-7 grid h-[55px] place-items-center rounded-[20px] bg-[#263f35] text-base text-white">
              Start practice
            </span>
            <div className="mt-8 flex justify-center gap-[21px] text-[13px] text-[#6f7570]">
              <span>Home</span>
              <span>Explore</span>
              <span>Practice</span>
              <span>You</span>
            </div>
            <div className="mx-auto mt-8 h-1 w-[115px] rounded-full bg-[#263f35]" />
          </div>

          <div className="flex flex-col">
            <p className="text-xs tracking-[0.14em] text-[#5f665f] uppercase">
              Featured practice
            </p>
            <h3 className="mt-9 text-[40px] leading-none tracking-[-0.02em] lg:text-[48px]">
              A fresh start
            </h3>
            <p className={cn(lead, "mt-8")}>
              Unroll your mat and ease into a gentle sequence. A small ritual to
              make the morning yours.
            </p>
            <p className={cn(meta, "mt-7")}>
              15 minutes&nbsp;&nbsp;/&nbsp;&nbsp;All levels
            </p>
            <Pill tone="plain" className="mt-6 w-fit">
              Download the app
            </Pill>
            <Photo
              src="/landing/v2/breathe.webp"
              alt="A woman breathing with her eyes closed in a forest"
              className="mt-10 aspect-[0.87/1] lg:mt-auto"
              sizes="(min-width: 1024px) 33vw, 100vw"
              position="60% 40%"
            />
          </div>
        </div>
      </section>

      {/* ── Philosophy band ────────────────────────────────── */}
      <section id="philosophy" className="bg-[#f5f4f0] px-2.5 sm:px-6">
        <div className="rounded-[30px] bg-[#263c32] px-4 pt-14 pb-4 text-[#f6f5f1] sm:px-6 sm:pb-6 lg:pt-[70px]">
          <p className="text-xs tracking-[0.14em] text-white/80 uppercase">
            / Philosophy
          </p>
          <h2 className="mt-12 text-[40px] leading-[1.05] tracking-[-0.02em] sm:text-[52px] lg:mt-[52px] lg:text-[64px]">
            More than a practice. A kinder way to show up.
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-[22px] lg:mt-20 lg:grid-cols-[1fr_2.2fr]">
            <Photo
              src="/landing/v2/founder.webp"
              alt="Founder portrait"
              className="aspect-[0.87/1]"
              sizes="(min-width: 1024px) 30vw, 100vw"
              position="45% 35%"
            />
            <QuoteSlider />
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────── */}
      <section
        id="pricing"
        className="bg-[#f5f4f0] px-6 pt-24 pb-28 lg:pt-[116px] lg:pb-[119px]"
      >
        <Label>Find your rhythm</Label>
        <div className="mt-12 grid grid-cols-1 gap-6 lg:mt-12 lg:grid-cols-[1fr_auto] lg:items-end">
          <h2 className={h2}>
            A little commitment.
            <br />
            More room for you.
          </h2>
          <p className="pb-1 text-lg text-[#4d5550] lg:text-[19px]">
            Begin for free, or make Souma part of your everyday. Choose your
            plan in the app.
          </p>
        </div>
        <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr_1.234fr]">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={cn(
                "flex flex-col rounded-[24px] px-[34px] pt-7 pb-10",
                p.dark ? "bg-[#263c32] text-[#f6f5f1]" : "bg-white",
              )}
            >
              <div className="flex items-center justify-between">
                <p className="text-[30px] tracking-[-0.01em]">{p.name}</p>
                <span
                  className={cn(
                    "rounded-full px-3 py-1.5 text-[11px] tracking-[0.04em] uppercase",
                    p.dark ? "bg-[#d6eb9a] text-[#1d2a23]" : "bg-[#f3f2ee]",
                  )}
                >
                  {p.badge}
                </span>
              </div>
              <p
                className={cn(
                  "mt-5 text-[17px]",
                  p.dark ? "text-white/80" : "text-[#5f665f]",
                )}
              >
                {p.blurb}
              </p>
              <p className="mt-6 flex items-baseline gap-3">
                <span className="text-[52px] leading-none tracking-[-0.02em]">
                  {p.price}
                </span>
                <span
                  className={cn(
                    "text-[17px]",
                    p.dark ? "text-white/80" : "text-[#5f665f]",
                  )}
                >
                  {p.per}
                </span>
              </p>
              <ul
                className={cn(
                  "mt-7 space-y-[15px] border-t pt-7 text-[17px]",
                  p.dark ? "border-white/10" : "border-[#e4e4df]",
                )}
              >
                {p.items.map((it) => (
                  <li key={it} className="flex items-center gap-3">
                    <span
                      className={cn(
                        "size-[5px] rounded-full",
                        p.dark ? "bg-[#d6eb9a]" : "bg-[#1d2a23]",
                      )}
                    />
                    {it}
                  </li>
                ))}
              </ul>
              <a
                href="#"
                className={cn(
                  "mt-6 flex h-[52px] items-center justify-center gap-10 rounded-[18px] text-base transition-colors",
                  p.dark
                    ? "bg-[#f6f5f1] text-[#1d2a23] hover:bg-white"
                    : "bg-[#263c32] text-white hover:bg-[#1f342b]",
                )}
              >
                {p.cta}
                <span
                  className={cn(
                    "grid size-8 place-items-center rounded-[9px]",
                    p.dark
                      ? "bg-[#263c32] text-white"
                      : "bg-[#f6f5f1] text-[#1d2a23]",
                  )}
                >
                  <ArrowUpRight className="size-4" strokeWidth={1.75} />
                </span>
              </a>
              <p
                className={cn(
                  "mt-6 text-[15px]",
                  p.dark ? "text-white/85" : "text-[#5f665f]",
                )}
              >
                {p.note}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-14 text-center text-[17px] text-[#4d5550]">
          A gentler price for a longer rhythm. Save $15 a year with the yearly
          plan.
        </p>
      </section>

      {/* ── 006 FAQ ────────────────────────────────────────── */}
      <section
        id="faq"
        className="px-6 pt-24 pb-28 lg:pt-[117px] lg:pb-[90px]"
      >
        <Label n="006">A few good questions</Label>
        <div className="mt-14 grid grid-cols-1 gap-12 lg:mt-[66px] lg:grid-cols-[1fr_1.52fr] lg:gap-[55px]">
          <div>
            <h2 className={cn(h2, "max-w-[480px]")}>
              Everything you need to begin.
            </h2>
            <p className={cn(lead, "mt-8 max-w-[460px] lg:text-[21px]")}>
              A little clarity before your first moment on the mat.
            </p>
            <Pill tone="light" className="mt-12">
              Download the app
            </Pill>
          </div>
          <Faq />
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="bg-[#131a15] px-6 pt-20 pb-10 text-[#f6f5f1] lg:pt-[78px]">
        <div className="grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-[787fr_357fr_357fr_431fr] lg:gap-0">
          <div className="col-span-2 lg:col-span-1">
            <p className="text-[36px] leading-[1.05] tracking-[-0.015em] lg:text-[48px]">
              Begin your journey.
              <br />
              Find your own rhythm.
            </p>
            <Pill tone="white" className="mt-8">
              Download the app
            </Pill>
          </div>
          <div>
            <p className="text-xs tracking-[0.02em] text-white/60 uppercase">
              Explore
            </p>
            <ul className="mt-7 space-y-[26px] text-[17px]">
              {[
                "About Souma",
                "Daily practice",
                "Programs",
                "Class library",
                "Philosophy",
                "Pricing",
                "FAQ",
              ].map((l) => (
                <li key={l}>
                  <a href="#" className="transition-colors hover:text-white/70">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs tracking-[0.02em] text-white/60 uppercase">
              Follow Souma
            </p>
            <ul className="mt-7 space-y-[26px] text-[17px]">
              {["Instagram", "Pinterest", "Twitter"].map((l) => (
                <li key={l}>
                  <a href="#" className="transition-colors hover:text-white/70">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="col-span-2 lg:col-span-1">
            <p className="text-xs tracking-[0.02em] text-white/60 uppercase">
              Made for real life
            </p>
            <p className="mt-7 max-w-[300px] text-[22px] leading-[1.45]">
              A little movement. A deeper breath. More room for you.
            </p>
          </div>
        </div>
        <div className="mt-20 grid grid-cols-1 items-center gap-6 border-t border-[#33443a] pt-9 lg:grid-cols-[787fr_714fr_431fr] lg:gap-0">
          <p className="text-[54px] leading-none tracking-[-0.02em] text-[#d6eb9a]">
            Souma<span className="text-[#5f8a5a]">*</span>
          </p>
          <p className="text-[11px] text-white/60">
            Designed by <span className="text-white">Gennady Muzych</span>
          </p>
          <p className="text-[11px] text-white/60 uppercase lg:text-right">
            © 2026 Souma. Find your own rhythm.
          </p>
        </div>
      </footer>
    </div>
  );
}
