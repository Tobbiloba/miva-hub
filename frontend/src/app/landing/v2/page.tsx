import { cn } from "lib/utils";
import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import { Instrument_Serif } from "next/font/google";
import Image from "next/image";
import type { ReactNode } from "react";
import { Faq, QuoteSlider } from "./interactive";

/*
 * Landing v2: a faithful build of the "Souma" reference in design/
 * (f0811f5a…webp), section by section, with matching photography.
 */

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Souma · A little space for you",
  description:
    "Guided yoga and mindful moments, made for real life. Move gently. Breathe deeply. Come back to yourself.",
};

/** "Download the app" pill with the dark square arrow. */
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
        "group inline-flex items-center gap-5 rounded-[18px] py-2 pr-2 pl-5 text-[15px] font-medium transition-colors",
        tone === "white" && "bg-white text-[#23332b] hover:bg-white/90",
        tone === "light" && "bg-[#f1f1ee] text-[#23332b] hover:bg-[#e9e9e4]",
        tone === "dark" && "bg-[#263f35] text-white hover:bg-[#1f342b]",
        tone === "plain" && "pl-0 text-[#23332b]",
        className,
      )}
    >
      {children}
      <span
        className={cn(
          "grid size-8 place-items-center rounded-[10px] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5",
          tone === "dark"
            ? "bg-white text-[#23332b]"
            : "bg-[#263f35] text-white",
        )}
      >
        <ArrowUpRight className="size-4" />
      </span>
    </a>
  );
}

function Label({ children, n }: { children: ReactNode; n: string }) {
  return (
    <div className="flex items-center justify-between text-[11px] font-medium tracking-[0.16em] text-[#5f665f] uppercase">
      <span>/ {children}</span>
      <span className="tracking-normal">[{n}]</span>
    </div>
  );
}

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
    <div className={cn("relative overflow-hidden rounded-[20px]", className)}>
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
    <div
      className={cn(
        serif.variable,
        "min-h-screen bg-white font-sans text-[#23332b] antialiased [&_h1,&_h2,&_h3]:font-normal",
      )}
    >
      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="p-2">
        <div className="relative h-[max(640px,min(100svh,900px))] overflow-hidden rounded-[26px]">
          <Image
            src="/landing/v2/hero-hand.webp"
            alt="A hand holding a phone showing the Souma app among sunlit plants"
            fill
            priority
            sizes="100vw"
            className="object-cover object-[50%_45%]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/20 lg:from-black/55 lg:via-black/10 lg:to-black/25" />

          {/* Floating nav */}
          <header className="absolute inset-x-0 top-3 z-20 flex justify-center px-3">
            <nav className="flex w-full max-w-[860px] items-center justify-between gap-6 rounded-[22px] bg-[#1d2b24]/75 py-2 pr-2 pl-6 text-white backdrop-blur-md">
              <a href="#" className="text-[28px] tracking-[-0.02em]">
                Souma*
              </a>
              <ul className="hidden items-center gap-6 text-[13px] text-white/90 lg:flex">
                {NAV.map((n) => (
                  <li key={n}>
                    <a
                      href={`#${n.toLowerCase()}`}
                      className="hover:text-white"
                    >
                      {n}
                    </a>
                  </li>
                ))}
              </ul>
              <Pill tone="white" href="#pricing" className="text-sm">
                Get the app
              </Pill>
            </nav>
          </header>

          <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-10 p-6 text-white sm:p-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="max-w-[760px] text-[44px] leading-[1.02] tracking-[-0.035em] sm:text-6xl lg:text-[72px]">
                A little space for you.
                <br />A better rhythm for your day.
              </h1>
              <p className="mt-6 flex gap-4 text-[11px] lg:mt-10 font-medium tracking-[0.06em] text-white/85 uppercase">
                <span>Move with intention.</span>
                <span>Live with more ease.</span>
              </p>
            </div>
            <div className="max-w-[300px] pb-12 lg:pb-16">
              <p className="flex items-center gap-2 text-[11px] font-medium tracking-[0.16em] text-white/90 uppercase">
                <span className="size-1.5 rounded-full bg-[#d9eaa3]" />
                Your everyday yoga companion
              </p>
              <p className="mt-6 text-lg leading-snug text-white/90">
                Guided yoga and mindful moments, made for real life. Move
                gently. Breathe deeply. Come back to yourself.
              </p>
              <Pill tone="white" className="mt-7">
                Download the app
              </Pill>
            </div>
          </div>
        </div>
      </section>

      {/* ── 001 About ──────────────────────────────────────── */}
      <section
        id="about"
        className="mx-auto max-w-[1280px] px-5 pt-24 pb-24 sm:px-6"
      >
        <Label n="001">A little about Souma</Label>
        <div className="mt-16 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.05fr] lg:gap-12">
          <div>
            <Photo
              src="/landing/v2/meditate.webp"
              alt="A woman meditating cross-legged in a sunlit room"
              className="aspect-[1/1.05]"
              position="50% 50%"
            />
            <p className="mt-8 text-xl tracking-[-0.01em]">
              Less pressure. More presence.
            </p>
            <p className="mt-4 text-[15px] text-[#6f7570]">
              A practice that feels like coming home.
            </p>
          </div>
          <div>
            <h2 className="text-[34px] leading-[1.15] tracking-[-0.03em] sm:text-[44px]">
              &ldquo;We believe yoga belongs in your everyday life—a little room
              to move, breathe, and feel more like yourself.&rdquo;
            </h2>
            <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2">
              <Photo
                src="/landing/v2/mats.webp"
                alt="Yoga mats and cork blocks on a warm wooden floor"
                className="aspect-[1/1.45]"
                sizes="(min-width: 1024px) 25vw, 50vw"
              />
              <div className="flex flex-col">
                <p className="text-xl leading-snug text-[#6f7570]">
                  Start where you are. Find a moment that fits your day, and let
                  Souma guide you from there.
                </p>
                <Pill tone="light" className="mt-7 w-fit">
                  Download the app
                </Pill>
                <div className="mt-auto rounded-[20px] bg-[#d9eaa3] p-6 pt-6">
                  <p className="text-[11px] font-medium tracking-[0.16em] text-[#3d4a36] uppercase">
                    Your week in balance
                  </p>
                  <p className="mt-5 text-5xl tracking-[-0.03em]">65 min</p>
                  <p className="mt-5 text-sm text-[#3d4a36]">
                    Small moments. Lasting rhythm.
                  </p>
                  <div className="mt-5 flex justify-between">
                    {[1, 1, 1, 1, 0, 0, 0].map((on, k) => (
                      <span
                        key={k}
                        className={cn(
                          "size-5 rounded-full",
                          on ? "bg-[#23332b]" : "bg-[#bfd57f]",
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
      <section id="practice" className="bg-[#f4f2ee] py-24">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
          <Label n="002">Your daily practice</Label>
          <div className="mt-16 grid grid-cols-1 gap-12 lg:grid-cols-2">
            <div className="flex flex-col">
              <h2 className="text-5xl leading-[1.05] tracking-[-0.035em] sm:text-[60px]">
                A practice that moves with your life.
              </h2>
              <div className="mt-8 flex flex-wrap gap-2.5">
                {[
                  "Gentle flow",
                  "Mindful movement",
                  "Breathwork",
                  "Daily rituals",
                ].map((t) => (
                  <span
                    key={t}
                    className="rounded-lg bg-white px-3.5 py-2 text-[13px]"
                  >
                    {t}
                  </span>
                ))}
              </div>
              <p className="mt-8 max-w-[600px] text-xl leading-snug text-[#6f7570]">
                Some days you need energy. Some days you need a softer landing.
                Choose how you want to feel, and find a practice to meet you
                there.
              </p>
              <div className="mt-auto flex flex-col gap-6 pt-16 sm:flex-row sm:items-end">
                <Photo
                  src="/landing/v2/guide.webp"
                  alt="A smiling instructor with curly hair"
                  className="aspect-[1/1.5] w-40 shrink-0"
                  sizes="200px"
                  position="50% 25%"
                />
                <div className="pb-1">
                  <p className="text-[28px] leading-tight tracking-[-0.02em]">
                    A gentle guide, always with you.
                  </p>
                  <p className="mt-3 max-w-[380px] text-[17px] text-[#6f7570]">
                    Clear cues. Room to pause. Permission to go at your own
                    pace.
                  </p>
                  <Pill tone="dark" className="mt-6">
                    Find your flow
                  </Pill>
                </div>
              </div>
            </div>
            <div>
              <Photo
                src="/landing/v2/warrior.webp"
                alt="A woman in warrior pose on a mat outdoors"
                className="aspect-square"
                position="50% 50%"
              />
              <div className="mt-5 rounded-[20px] bg-[#c5d6aa] p-6">
                <p className="text-[11px] font-medium tracking-[0.16em] text-[#3d4a36] uppercase">
                  Your next moment
                </p>
                <div className="mt-4 flex items-baseline justify-between">
                  <p className="text-[28px] tracking-[-0.02em]">Morning flow</p>
                  <p className="text-[15px]">15 min</p>
                </div>
                <p className="mt-3 text-[15px] text-[#4d5a48]">
                  A little movement. A fresh start.
                </p>
                <div className="mt-5 grid grid-cols-14 gap-1.5">
                  {Array.from({ length: 14 }, (_, k) => (
                    <span
                      key={k}
                      className={cn(
                        "h-9 rounded-md",
                        k < 9 ? "bg-[#4c6e4f]" : "bg-[#e6eadb]",
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 003 Find your flow ─────────────────────────────── */}
      <section
        id="programs"
        className="mx-auto max-w-[1280px] px-5 py-24 sm:px-6"
      >
        <Label n="003">Find your flow</Label>
        <div className="mt-16 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-end">
          <h2 className="text-5xl leading-[1.05] tracking-[-0.035em] sm:text-[60px]">
            A little movement.
            <br />A whole new feeling.
          </h2>
          <p className="pb-2 text-xl text-[#6f7570]">
            Build a practice around what you need today.
          </p>
        </div>
        <div className="mt-14 grid grid-cols-1 gap-12 lg:grid-cols-2">
          <div className="relative">
            <Photo
              src="/landing/v2/tree.webp"
              alt="A woman balancing in tree pose"
              className="aspect-[1/1.3]"
              position="50% 35%"
            />
            <div className="absolute inset-x-5 bottom-5 rounded-[16px] bg-[#edf3d3] p-6">
              <p className="text-[11px] font-medium tracking-[0.16em] text-[#5f665f] uppercase">
                Today&apos;s intention
              </p>
              <p className="mt-4 text-[44px] leading-none tracking-[-0.03em]">
                Make space.
              </p>
              <p className="mt-4 text-[15px] text-[#5f665f]">
                One breath. One stretch. One moment for you.
              </p>
              <div className="mt-6 flex items-baseline justify-between">
                <span className="text-[26px] tracking-[-0.02em]">12 min</span>
                <span className="text-[15px]">All levels</span>
              </div>
            </div>
          </div>
          <ul className="flex flex-col">
            {FLOWS.map(([title, body, tag]) => (
              <li
                key={title}
                className="border-b border-[#dcdcd6] py-8 first:pt-4"
              >
                <h3 className="text-[34px] tracking-[-0.025em]">{title}</h3>
                <p className="mt-4 text-[17px] text-[#6f7570]">{body}</p>
                <p className="mt-5 text-[11px] font-medium tracking-[0.06em] uppercase">
                  {tag}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── 004 Pocket studio ──────────────────────────────── */}
      <section id="classes" className="bg-[#f4f2ee] py-24">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
          <Label n="004">Your pocket studio</Label>
          <h2 className="mt-16 max-w-[720px] text-5xl leading-[1.05] tracking-[-0.035em] sm:text-[60px]">
            Daily rituals, made to fit your rhythm.
          </h2>
          <div className="mt-16 grid grid-cols-1 gap-10 lg:grid-cols-3">
            <div>
              <Photo
                src="/landing/v2/props.webp"
                alt="A yoga mat with two cork blocks"
                className="aspect-[1.15/1]"
                sizes="(min-width: 1024px) 33vw, 100vw"
              />
              <p className="mt-8 text-[28px] tracking-[-0.02em]">
                Your mat. Your moment.
              </p>
              <p className="mt-5 text-[17px] text-[#6f7570]">
                Bring a little studio feeling to whatever space you call yours.
              </p>
            </div>

            {/* Phone mockup, built in HTML */}
            <div className="mx-auto w-full max-w-[345px] rounded-[44px] border-[9px] border-[#263f35] bg-[#f3f1ea] px-5 pt-4 pb-4 shadow-[0_30px_60px_-30px_rgba(20,40,30,0.45)]">
              <div className="flex items-center justify-between px-2 text-[13px] font-semibold">
                <span>9:41</span>
                <span className="h-6 w-24 rounded-full bg-black" />
                <span className="text-[11px]">●●● ▮</span>
              </div>
              <p className="mt-5 text-center font-[family-name:var(--font-serif)] text-[26px]">
                souma
              </p>
              <p className="mt-5 text-[30px] leading-[1.08] tracking-[-0.02em]">
                How do you want to feel?
              </p>
              <div className="mt-5 flex gap-2 text-[12px]">
                <span className="rounded-full bg-[#d9eaa3] px-3 py-1.5">
                  Grounded
                </span>
                <span className="rounded-full bg-[#e6e4dc] px-3 py-1.5">
                  Energized
                </span>
                <span className="rounded-full bg-[#e6e4dc] px-3 py-1.5">
                  Rested
                </span>
              </div>
              <Photo
                src="/landing/v2/seated.webp"
                alt=""
                className="mt-5 aspect-[1.15/1] rounded-[14px]"
                sizes="300px"
                position="55% 50%"
              />
              <p className="mt-5 text-[26px] tracking-[-0.02em]">
                A fresh start
              </p>
              <p className="mt-2 text-[13px] text-[#6f7570]">
                15 min · Gentle flow
              </p>
              <span className="mt-5 grid h-12 place-items-center rounded-[14px] bg-[#263f35] text-[14px] text-white">
                Start practice
              </span>
              <div className="mt-5 flex justify-center gap-6 text-[11px] text-[#6f7570]">
                <span>Home</span>
                <span>Explore</span>
                <span>Practice</span>
                <span>You</span>
              </div>
              <div className="mx-auto mt-4 h-1 w-24 rounded-full bg-[#263f35]" />
            </div>

            <div>
              <p className="text-[11px] font-medium tracking-[0.16em] text-[#5f665f] uppercase">
                Featured practice
              </p>
              <h3 className="mt-5 text-[44px] leading-none tracking-[-0.03em]">
                A fresh start
              </h3>
              <p className="mt-6 text-xl leading-snug text-[#6f7570]">
                Unroll your mat and ease into a gentle sequence. A small ritual
                to make the morning yours.
              </p>
              <p className="mt-5 text-[11px] font-medium tracking-[0.06em] uppercase">
                15 minutes / All levels
              </p>
              <Pill tone="plain" className="mt-6">
                Download the app
              </Pill>
              <Photo
                src="/landing/v2/breathe.webp"
                alt="A woman breathing with her eyes closed in a forest"
                className="mt-8 aspect-[1/1.15]"
                sizes="(min-width: 1024px) 33vw, 100vw"
                position="60% 50%"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Philosophy band ────────────────────────────────── */}
      <section id="philosophy" className="bg-[#f4f2ee] px-2 pb-24 sm:px-5">
        <div className="mx-auto max-w-[1280px] rounded-[30px] bg-[#263f35] p-5 text-white sm:p-6">
          <p className="pt-4 text-[11px] font-medium tracking-[0.16em] text-white/80 uppercase">
            / Philosophy
          </p>
          <h2 className="mt-10 text-[40px] leading-[1.05] tracking-[-0.035em] sm:text-[58px]">
            More than a practice. A kinder way to show up.
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-[0.62fr_1.38fr]">
            <Photo
              src="/landing/v2/founder.webp"
              alt="Founder portrait"
              className="aspect-[1/1.3] lg:aspect-auto lg:h-full lg:min-h-[460px]"
              sizes="(min-width: 1024px) 30vw, 100vw"
              position="45% 40%"
            />
            <QuoteSlider />
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────── */}
      <section id="pricing" className="bg-[#f4f2ee] pb-24">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
          <p className="text-[11px] font-medium tracking-[0.16em] text-[#5f665f] uppercase">
            / Find your rhythm
          </p>
          <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-end">
            <h2 className="text-5xl leading-[1.05] tracking-[-0.035em] sm:text-[60px]">
              A little commitment.
              <br />
              More room for you.
            </h2>
            <p className="pb-2 text-lg text-[#4d5550] lg:text-right">
              Begin for free, or make Souma part of your everyday. Choose your
              plan in the app.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1fr_1.18fr]">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={cn(
                  "flex flex-col rounded-[22px] p-8",
                  p.dark ? "bg-[#263f35] text-white" : "bg-white",
                )}
              >
                <div className="flex items-start justify-between">
                  <p className="text-[28px] tracking-[-0.02em]">{p.name}</p>
                  <span
                    className={cn(
                      "rounded-full px-3 py-1.5 text-[10px] font-medium tracking-[0.06em] uppercase",
                      p.dark ? "bg-[#d9eaa3] text-[#23332b]" : "bg-[#f1f1ee]",
                    )}
                  >
                    {p.badge}
                  </span>
                </div>
                <p
                  className={cn(
                    "mt-3 text-[15px]",
                    p.dark ? "text-white/80" : "text-[#5f665f]",
                  )}
                >
                  {p.blurb}
                </p>
                <p className="mt-8 flex items-baseline gap-3">
                  <span className="text-5xl tracking-[-0.03em]">{p.price}</span>
                  <span
                    className={cn(
                      "text-[15px]",
                      p.dark ? "text-white/80" : "text-[#5f665f]",
                    )}
                  >
                    {p.per}
                  </span>
                </p>
                <ul
                  className={cn(
                    "mt-7 space-y-3.5 border-t pt-7 text-[15px]",
                    p.dark ? "border-white/15" : "border-[#e4e4df]",
                  )}
                >
                  {p.items.map((it) => (
                    <li key={it} className="flex items-center gap-3">
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          p.dark ? "bg-[#d9eaa3]" : "bg-[#23332b]",
                        )}
                      />
                      {it}
                    </li>
                  ))}
                </ul>
                <a
                  href="#"
                  className={cn(
                    "mt-8 flex h-12 items-center justify-center gap-5 rounded-[16px] text-[15px] font-medium transition-colors",
                    p.dark
                      ? "bg-white text-[#23332b] hover:bg-white/90"
                      : "bg-[#263f35] text-white hover:bg-[#1f342b]",
                  )}
                >
                  {p.cta}
                  <span
                    className={cn(
                      "grid size-7 place-items-center rounded-[8px]",
                      p.dark
                        ? "bg-[#263f35] text-white"
                        : "bg-white text-[#23332b]",
                    )}
                  >
                    <ArrowUpRight className="size-4" />
                  </span>
                </a>
                <p
                  className={cn(
                    "mt-6 text-[13px]",
                    p.dark ? "text-white/80" : "text-[#5f665f]",
                  )}
                >
                  {p.note}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-12 text-center text-[15px] text-[#5f665f]">
            A gentler price for a longer rhythm. Save $15 a year with the yearly
            plan.
          </p>
        </div>
      </section>

      {/* ── 006 FAQ ────────────────────────────────────────── */}
      <section id="faq" className="mx-auto max-w-[1280px] px-5 py-24 sm:px-6">
        <Label n="006">A few good questions</Label>
        <div className="mt-16 grid grid-cols-1 gap-12 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <h2 className="text-5xl leading-[1.05] tracking-[-0.035em] sm:text-[60px]">
              Everything you need to begin.
            </h2>
            <p className="mt-6 text-xl text-[#6f7570]">
              A little clarity before your first moment on the mat.
            </p>
            <Pill tone="light" className="mt-8">
              Download the app
            </Pill>
          </div>
          <Faq />
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="bg-[#121a16] px-5 pt-20 pb-10 text-white sm:px-6">
        <div className="mx-auto max-w-[1360px]">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.3fr_0.7fr_0.7fr_1fr]">
            <div>
              <p className="text-[44px] leading-[1.08] tracking-[-0.03em]">
                Begin your journey.
                <br />
                Find your own rhythm.
              </p>
              <Pill tone="white" className="mt-8">
                Download the app
              </Pill>
            </div>
            <div>
              <p className="text-[11px] font-medium tracking-[0.12em] text-white/70 uppercase">
                Explore
              </p>
              <ul className="mt-5 space-y-4 text-[17px]">
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
                    <a href="#" className="hover:text-white/70">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-medium tracking-[0.12em] text-white/70 uppercase">
                Follow Souma
              </p>
              <ul className="mt-5 space-y-4 text-[17px]">
                {["Instagram", "Pinterest", "Twitter"].map((l) => (
                  <li key={l}>
                    <a href="#" className="hover:text-white/70">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-medium tracking-[0.12em] text-white/70 uppercase">
                Made for real life
              </p>
              <p className="mt-5 text-[22px] leading-snug">
                A little movement. A deeper breath. More room for you.
              </p>
            </div>
          </div>
          <div className="mt-24 flex flex-col gap-6 border-t border-white/15 pt-8 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-6xl tracking-[-0.04em] text-[#d9eaa3]">
              Souma<span className="text-[#7fa66a]">*</span>
            </p>
            <p className="text-xs text-white/70">
              Designed by <span className="text-white">Gennady Muzych</span>
            </p>
            <p className="text-[11px] tracking-[0.06em] text-white/70 uppercase">
              © 2026 Souma. Find your own rhythm.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
