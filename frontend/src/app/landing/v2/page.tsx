import { cn } from "lib/utils";
import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Faq, QuoteSlider, WaitlistForm } from "./interactive";

/*
 * Landing v2: the editorial reference layout in design/ (f0811f5a…webp),
 * rebuilt section by section with Askly's product, copy and real screens.
 */

export const metadata: Metadata = {
  title: "Askly · Your AI study partner",
  description:
    "Answers from your own lecture notes, with sources. Quizzes, flashcards and deadlines in one place. Built for MIVA students.",
};

/** "Join the waitlist" pill with the dark square arrow (52px tall). */
function Pill({
  children,
  tone = "light",
  className,
  href = "#waitlist",
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
        "group inline-flex h-[52px] shrink-0 items-center gap-8 rounded-[18px] pr-2.5 pl-[22px] text-base whitespace-nowrap transition-colors",
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
  ["About", "about"],
  ["Study", "study"],
  ["Features", "features"],
  ["Capture", "capture"],
  ["Screens", "inside"],
  ["FAQ", "faq"],
] as const;

const FEATURES = [
  [
    "Ask about any lecture",
    "Answers come from the lessons you capture, with numbered sources you can open.",
    "Chat · With sources",
  ],
  [
    "Quiz yourself before the test",
    "A practice quiz from any lesson in seconds, marked as you go.",
    "Quizzes · Instant feedback",
  ],
  [
    "Remember it for longer",
    "Flip flashcards in chat, then save them as a deck. Cards you miss come back sooner.",
    "Flashcards · Spaced review",
  ],
  [
    "Snap a question",
    "Take a photo of a problem from a textbook or past paper and get it worked through step by step.",
    "Snap-to-Solve · Step by step",
  ],
  [
    "Never miss a due date",
    "Assignments and quizzes you capture land in one list, with their due dates.",
    "Deadlines · One list",
  ],
] as const;

/**
 * Real Askly screens (light theme, 2x), cropped to the one piece of UI that
 * matters and duotoned into the page's ink and cream so they sit in the
 * design instead of on top of it.
 */
const SCREENS = {
  answer: { src: "/landing/v2/screens/answer.webp", w: 1605, h: 1170 },
  flashcards: { src: "/landing/v2/screens/flashcards.webp", w: 1605, h: 1000 },
  quiz: { src: "/landing/v2/screens/quiz.webp", w: 1605, h: 1070 },
  deadlines: { src: "/landing/v2/screens/deadlines.webp", w: 1603, h: 1030 },
  courses: { src: "/landing/v2/screens/courses.webp", w: 2200, h: 1130 },
  home: { src: "/landing/v2/screens/home.webp", w: 1605, h: 1120 },
  popup: { src: "/landing/v2/screens/popup.webp", w: 1080, h: 1161 },
  mAnswer: { src: "/landing/v2/screens/m-answer.webp", w: 1170, h: 2532 },
  mSources: { src: "/landing/v2/screens/m-sources.webp", w: 1050, h: 870 },
  mFlashcards: {
    src: "/landing/v2/screens/m-flashcards.webp",
    w: 1170,
    h: 2532,
  },
  mDeadlines: { src: "/landing/v2/screens/m-deadlines.webp", w: 1170, h: 2532 },
} as const;

const INSIDE: {
  screen: keyof typeof SCREENS;
  tag: string;
  title: string;
  body: string;
  alt: string;
}[] = [
  {
    screen: "answer",
    tag: "Chat",
    title: "Answers with their sources",
    body: "Every answer cites the lecture or reading it came from, so you can open it and check.",
    alt: "An Askly answer about the parts of a computer, citing two COS101 week 2 sources",
  },
  {
    screen: "flashcards",
    tag: "Flashcards",
    title: "A deck from your notes",
    body: "Flip through cards in chat, then save the set as a deck for spaced review.",
    alt: "A five-card COS101 flashcard deck on the anatomy of a computer system",
  },
  {
    screen: "quiz",
    tag: "Quizzes",
    title: "A quiz before the test",
    body: "Five questions from any lesson, marked as you go, with a score at the end.",
    alt: "A five-question COS101 practice quiz on the history of computing",
  },
  {
    screen: "deadlines",
    tag: "Deadlines",
    title: "Everything that's due",
    body: "Assignments and quizzes you capture land here, grouped into this week and later.",
    alt: "Askly's deadlines list with four upcoming assignments and quizzes",
  },
];

/**
 * A real app screen on a sage panel, sized like the photo slot it fills.
 * phone: a mobile screen, centred, bleeding off the bottom.
 * inset: a desktop screen tucked into the top-left, bleeding right and down.
 * fit: the whole screen, centred with breathing room.
 */
function ScreenTile({
  name,
  alt,
  variant,
  className,
  sizes = "(min-width: 1024px) 40vw, 100vw",
}: {
  name: keyof typeof SCREENS;
  alt: string;
  variant: "phone" | "inset" | "fit";
  className?: string;
  sizes?: string;
}) {
  const s = SCREENS[name];
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[22px] bg-[#e3e8d9]",
        className,
      )}
    >
      <div
        className={cn(
          "absolute",
          variant === "phone" && "top-[8%] left-1/2 w-[64%] -translate-x-1/2",
          variant === "inset" && "top-[10%] left-[8%] w-[118%]",
          variant === "fit" &&
            "top-1/2 left-1/2 w-[84%] -translate-x-1/2 -translate-y-1/2",
        )}
      >
        <Image
          src={s.src}
          alt={alt}
          width={s.w}
          height={s.h}
          sizes={sizes}
          className={cn(
            "block h-auto w-full shadow-[0_24px_60px_-24px_rgba(29,42,35,0.4)] ring-1 ring-[#1d2a23]/[0.06]",
            variant === "phone" && "rounded-[26px]",
            variant === "inset" && "rounded-tl-[16px]",
            variant === "fit" && "rounded-[16px]",
          )}
        />
      </div>
    </div>
  );
}

/** A real app screen bleeding off the bottom of its card. */
function Screen({
  name,
  alt,
  sizes = "(min-width: 1024px) 45vw, 100vw",
}: {
  name: keyof typeof SCREENS;
  alt: string;
  sizes?: string;
}) {
  const s = SCREENS[name];
  return (
    <div className="overflow-hidden rounded-t-[16px] shadow-[0_24px_60px_-28px_rgba(29,42,35,0.45)] ring-1 ring-[#1d2a23]/[0.06]">
      <Image
        src={s.src}
        alt={alt}
        width={s.w}
        height={s.h}
        sizes={sizes}
        className="block h-auto w-full"
      />
    </div>
  );
}

export default function LandingV2() {
  return (
    <div className="min-h-screen bg-white font-sans text-[#1d2a23] antialiased [font-feature-settings:'cv11'] [&_h1,&_h2,&_h3]:font-normal">
      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="p-2.5">
        <div className="relative h-[max(640px,min(100svh,940px))] overflow-hidden rounded-[22px] bg-[#1e2a20]">
          <Image
            src="/landing/v2/askly-hero.webp"
            alt="A hand holding a phone showing an Askly answer with sources among sunlit plants"
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
                Askly<span className="text-[#d6eb9a]">*</span>
              </a>
              <ul className="hidden items-center gap-[26px] text-[13.5px] whitespace-nowrap text-white/90 lg:flex">
                {NAV.map(([label, id]) => (
                  <li key={id}>
                    <a
                      href={`#${id}`}
                      className="transition-colors hover:text-white"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-5">
                <Link
                  href="/sign-in"
                  className="hidden text-[13.5px] whitespace-nowrap text-white/90 transition-colors hover:text-white sm:block"
                >
                  Sign in
                </Link>
                <Pill tone="white">Get early access</Pill>
              </div>
            </nav>
          </header>

          <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-10 px-6 pb-28 text-white sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:pb-[150px]">
            <div>
              <h1 className="max-w-[760px] text-[44px] leading-[1.02] tracking-[-0.02em] sm:text-6xl lg:text-[72px]">
                Your lectures, answered.
                <br />A calmer way to study.
              </h1>
            </div>
            <div className="max-w-[340px]">
              <p className="flex items-center gap-2.5 text-xs tracking-[0.14em] text-[#d9eaa3] uppercase">
                <span className="size-1 rounded-full bg-[#d9eaa3]" />
                Your AI study partner
              </p>
              <p className="mt-7 text-lg leading-[1.5] text-white/90 lg:text-xl">
                Answers from your own lecture notes, with sources. Quizzes,
                flashcards and deadlines in one place.
              </p>
              <Pill tone="white" className="mt-10">
                Join the waitlist
              </Pill>
            </div>
          </div>
          <p className="absolute bottom-[76px] left-6 z-10 hidden gap-6 text-xs tracking-[0.01em] text-white/85 uppercase sm:flex">
            <span>Answers with sources.</span>
            <span>Built for MIVA students.</span>
          </p>
        </div>
      </section>

      {/* ── 001 About ──────────────────────────────────────── */}
      <section
        id="about"
        className="px-6 pt-24 pb-28 lg:pt-[108px] lg:pb-[108px]"
      >
        <Label n="001">A little about Askly</Label>
        <div className="mt-14 grid grid-cols-1 gap-12 lg:mt-[66px] lg:grid-cols-[1fr_1.25fr] lg:gap-[55px]">
          <div>
            <Photo
              src="/landing/v2/study-desk.webp"
              alt="A student studying at a sunlit desk with notes and a laptop"
              className="aspect-[1.1/1]"
              position="50% 40%"
            />
            <p className="mt-10 text-xl">Less guessing. More understanding.</p>
            <p className="mt-5 text-base text-[#6f7570]">
              Built around your own course, not the whole internet.
            </p>
          </div>
          <div>
            <h2 className="text-[32px] leading-[1.08] tracking-[-0.02em] sm:text-[40px] lg:text-[46px]">
              &ldquo;We believe studying should start from your own
              lectures—answers you can trust, with the source one tap
              away.&rdquo;
            </h2>
            <div className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-[0.885fr_1fr] lg:mt-[70px] lg:gap-[49px]">
              <ScreenTile
                name="mFlashcards"
                variant="phone"
                alt="A COS101 flashcard deck on a phone"
                className="aspect-[0.77/1]"
                sizes="(min-width: 1024px) 18vw, 60vw"
              />
              <div className="flex flex-col">
                <p className={lead}>
                  Start with the course you&apos;re on. Capture a lesson, ask a
                  question, and let Askly take it from there.
                </p>
                <Pill tone="light" className="mt-12 w-fit">
                  Join the waitlist
                </Pill>
                <div className="mt-8 rounded-[22px] bg-[#d6eb9a] p-6 lg:mt-auto">
                  <p className="text-xs tracking-[0.14em] text-[#3d4a36] uppercase">
                    Your week in review
                  </p>
                  <p className="mt-5 text-[52px] leading-none tracking-[-0.02em]">
                    42 cards
                  </p>
                  <p className="mt-5 text-sm text-[#3d4a36]">
                    Short sessions. Lasting recall.
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
        id="study"
        className="bg-[#f5f4f0] px-6 pt-24 pb-28 lg:pt-[112px] lg:pb-[132px]"
      >
        <Label n="002">How you study</Label>
        <div className="mt-14 grid grid-cols-1 gap-12 lg:mt-[66px] lg:grid-cols-[1.25fr_1fr] lg:gap-[55px]">
          <div className="flex flex-col">
            <h2 className={h2}>A study partner that fits your week.</h2>
            <div className="mt-8 flex flex-wrap gap-2.5">
              {[
                "Answers with sources",
                "Practice quizzes",
                "Flashcards",
                "Deadlines",
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
              Some days you need a quick answer before a quiz. Some days you
              need week three to finally make sense. Ask, practise or plan, and
              Askly meets you there.
            </p>
            <div className="mt-auto flex flex-col gap-8 pt-16 sm:flex-row sm:items-end">
              <ScreenTile
                name="mSources"
                variant="fit"
                alt="An answer citing its two COS101 sources, S1 and S2"
                className="aspect-[0.9/1] w-[240px] shrink-0"
                sizes="240px"
              />
              <div>
                <p className="max-w-[400px] text-[30px] leading-[1.25] tracking-[-0.01em]">
                  Honest when it doesn&apos;t know.
                </p>
                <p className="mt-6 max-w-[420px] text-[19px] leading-[1.5] text-[#6f7570]">
                  Every answer shows the note it came from. When your materials
                  don&apos;t cover it, Askly says so.
                </p>
                <Pill tone="dark" href="#capture" className="mt-8">
                  See how it works
                </Pill>
              </div>
            </div>
          </div>
          <div>
            <ScreenTile
              name="home"
              variant="inset"
              alt="Askly's home screen: Good morning, Ada, with study starters"
              className="aspect-square"
            />
            <div className="mt-[23px] rounded-[22px] bg-[#c2d5a8] px-[27px] pt-6 pb-[22px]">
              <p className="text-xs tracking-[0.14em] text-[#4d5a48] uppercase">
                Up next
              </p>
              <div className="mt-4 flex items-baseline justify-between">
                <p className="text-[30px] tracking-[-0.01em]">COS101 quiz</p>
                <p className="text-base">Friday</p>
              </div>
              <p className="mt-3 text-lg text-[#4d5a48]">
                9 of 14 lessons captured. You&apos;re on track.
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
        id="features"
        className="px-6 pt-24 pb-28 lg:pt-[108px] lg:pb-[108px]"
      >
        <Label n="003">What you can do</Label>
        <div className="mt-14 grid grid-cols-1 gap-6 lg:mt-[66px] lg:grid-cols-[1fr_1.25fr] lg:items-end lg:gap-[55px]">
          <h2 className={h2}>
            Ask it once.
            <br />
            Know it for good.
          </h2>
          <p className={cn(lead, "pb-1")}>
            Pick what you need today. Askly does the rest.
          </p>
        </div>
        <div className="mt-14 grid grid-cols-1 gap-12 lg:mt-[68px] lg:grid-cols-[1fr_1.25fr] lg:gap-[55px]">
          <div className="relative self-start">
            <ScreenTile
              name="mDeadlines"
              variant="phone"
              alt="Askly's deadlines list on a phone"
              className="aspect-[0.74/1]"
            />
            <div className="absolute inset-x-6 bottom-6 hidden rounded-[18px] bg-[#eef3d2] p-7 lg:block">
              <p className="text-xs tracking-[0.14em] text-[#5f665f] uppercase">
                This week
              </p>
              <p className="mt-6 text-[40px] leading-none tracking-[-0.02em] lg:text-[48px]">
                Two things due.
              </p>
              <p className="mt-6 text-base text-[#5f665f] lg:text-lg">
                COS101 Assignment 2 comes first, then a MTH101 quiz.
              </p>
              <div className="mt-6 flex items-baseline justify-between">
                <span className="text-[30px] tracking-[-0.01em]">2 due</span>
                <span className="text-lg">Next: Monday</span>
              </div>
            </div>
          </div>
          <ul className="flex flex-col">
            {FEATURES.map(([title, body, tag]) => (
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
        id="capture"
        className="bg-[#f5f4f0] px-6 pt-24 pb-28 lg:pt-[108px] lg:pb-[110px]"
      >
        <Label n="004">Askly Capture</Label>
        <h2 className={cn(h2, "mt-14 max-w-[800px] lg:mt-[66px]")}>
          Your course, captured in one click.
        </h2>
        <div className="mt-14 grid grid-cols-1 gap-12 lg:mt-[73px] lg:grid-cols-[1fr_0.87fr_1fr] lg:gap-[51px]">
          <div>
            <ScreenTile
              name="answer"
              variant="inset"
              alt="An Askly answer about the parts of a computer, with its sources"
              className="aspect-[1.39/1]"
              sizes="(min-width: 1024px) 33vw, 100vw"
            />
            <p className="mt-8 text-[30px] tracking-[-0.01em]">
              Your notes. Your answers.
            </p>
            <p className="mt-6 max-w-[440px] text-lg leading-[1.45] text-[#6f7570] lg:text-xl">
              Askly only answers from what you capture, so it speaks your
              course&apos;s language.
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
              askly<span className="text-[#7fa36a]">*</span>
            </p>
            <p className="mt-8 text-[32px] leading-[1.1] tracking-[-0.02em]">
              What do you want to study?
            </p>
            <div className="mt-6 flex gap-3 text-[13px]">
              <span className="rounded-full bg-[#d6eb9a] px-3 py-2">
                Explain
              </span>
              <span className="rounded-full bg-[#ecebe5] px-3 py-2">
                Quiz me
              </span>
              <span className="rounded-full bg-[#ecebe5] px-3 py-2">
                Flashcards
              </span>
            </div>
            <div className="mt-6 flex aspect-[1.14/1] flex-col justify-between rounded-[18px] bg-[#263c32] p-5 text-[#f6f5f1]">
              <span className="w-fit rounded-full bg-white/10 px-2.5 py-1 text-[11px] tracking-[0.04em] uppercase">
                Lecture video · 42 min
              </span>
              <div className="flex items-end justify-between gap-4">
                <p className="text-[22px] leading-[1.15] tracking-[-0.01em]">
                  Algorithms and flowcharts
                </p>
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#d6eb9a] text-[#1d2a23]">
                  <svg
                    viewBox="0 0 12 14"
                    className="ml-0.5 size-3.5"
                    aria-hidden="true"
                  >
                    <path d="M0 0l12 7-12 7z" fill="currentColor" />
                  </svg>
                </span>
              </div>
            </div>
            <p className="mt-6 text-[30px] tracking-[-0.01em]">Algorithms</p>
            <p className="mt-4 text-[15px] text-[#6f7570]">
              COS101&nbsp;&nbsp;·&nbsp;&nbsp;Week 3 lecture
            </p>
            <span className="mt-7 grid h-[55px] place-items-center rounded-[20px] bg-[#263f35] text-base text-white">
              Ask about this lesson
            </span>
            <div className="mt-8 flex justify-center gap-[21px] text-[13px] text-[#6f7570]">
              <span>Chat</span>
              <span>Courses</span>
              <span>Deadlines</span>
              <span>You</span>
            </div>
            <div className="mx-auto mt-8 h-1 w-[115px] rounded-full bg-[#263f35]" />
          </div>

          <div className="flex flex-col">
            <p className="text-xs tracking-[0.14em] text-[#5f665f] uppercase">
              How capture works
            </p>
            <h3 className="mt-9 text-[40px] leading-none tracking-[-0.02em] lg:text-[48px]">
              Open. Capture. Ask.
            </h3>
            <p className={cn(lead, "mt-8")}>
              Open a lecture video, PDF, quiz or assignment on the MIVA LMS and
              press Capture. The extension fills in the course, week and lesson.
            </p>
            <p className={cn(meta, "mt-7")}>
              Chrome&nbsp;&nbsp;/&nbsp;&nbsp;Video, PDF, quiz, assignment
            </p>
            <Pill tone="plain" className="mt-6 w-fit">
              Join the waitlist
            </Pill>
            <ScreenTile
              name="popup"
              variant="fit"
              alt="The Askly Capture extension, filled in for a COS101 video lesson"
              className="mt-10 aspect-[0.87/1] lg:mt-auto"
              sizes="(min-width: 1024px) 30vw, 100vw"
            />
          </div>
        </div>
      </section>

      {/* ── Philosophy band ────────────────────────────────── */}
      <section id="why" className="bg-[#f5f4f0] px-2.5 sm:px-6">
        <div className="rounded-[30px] bg-[#263c32] px-4 pt-14 pb-4 text-[#f6f5f1] sm:px-6 sm:pb-6 lg:pt-[70px]">
          <p className="text-xs tracking-[0.14em] text-white/80 uppercase">
            / Why Askly
          </p>
          <h2 className="mt-12 text-[40px] leading-[1.05] tracking-[-0.02em] sm:text-[52px] lg:mt-[52px] lg:text-[64px]">
            More than a chatbot. A partner you can trust.
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-[22px] lg:mt-20 lg:grid-cols-[1fr_2.2fr]">
            <ScreenTile
              name="mAnswer"
              variant="phone"
              alt="An Askly answer on a phone, with its sources from COS101 week 2"
              className="aspect-[0.87/1]"
              sizes="(min-width: 1024px) 25vw, 70vw"
            />
            <QuoteSlider />
          </div>
        </div>
      </section>

      {/* ── 005 Inside Askly ───────────────────────────────── */}
      <section
        id="inside"
        className="bg-[#f5f4f0] px-6 pt-24 pb-28 lg:pt-[116px] lg:pb-[119px]"
      >
        <Label n="005">Inside Askly</Label>
        <div className="mt-12 grid grid-cols-1 gap-6 lg:mt-12 lg:grid-cols-[1fr_auto] lg:items-end">
          <h2 className={h2}>
            Real screens.
            <br />
            Real coursework.
          </h2>
          <p className="pb-1 text-lg text-[#4d5550] lg:text-[19px]">
            A COS101 student&apos;s week in Askly, from question to deadline.
          </p>
        </div>
        <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {INSIDE.map((item) => (
            <article
              key={item.screen}
              className="group flex flex-col overflow-hidden rounded-[24px] bg-[#e7ebdf]"
            >
              <div className="px-7 pt-8 sm:px-9 sm:pt-9">
                <p className={meta}>{item.tag}</p>
                <h3 className="mt-4 text-[28px] leading-[1.15] tracking-[-0.01em] lg:text-[32px]">
                  {item.title}
                </h3>
                <p className="mt-3 max-w-[460px] text-[17px] leading-[1.5] text-[#5f665f]">
                  {item.body}
                </p>
              </div>
              <div className="mt-auto px-7 pt-10 transition-transform duration-500 ease-out group-hover:-translate-y-1.5 sm:px-12">
                <Screen name={item.screen} alt={item.alt} />
              </div>
            </article>
          ))}
          <article className="group grid grid-cols-1 overflow-hidden rounded-[24px] bg-[#263c32] text-[#f6f5f1] lg:col-span-2 lg:grid-cols-[1fr_1.9fr]">
            <div className="flex flex-col px-7 pt-8 sm:px-9 sm:pt-9 lg:pb-9">
              <p className="text-xs tracking-[0.02em] text-white/70 uppercase">
                My Courses
              </p>
              <h3 className="mt-4 text-[28px] leading-[1.15] tracking-[-0.01em] lg:text-[32px]">
                Every course, one tap from a question
              </h3>
              <p className="mt-3 max-w-[380px] text-[17px] leading-[1.5] text-white/75">
                Your courses and credits in one place, each with a shortcut to
                ask about it.
              </p>
              <Pill tone="white" className="mt-8 w-fit lg:mt-auto">
                Join the waitlist
              </Pill>
            </div>
            <div className="mt-10 pl-7 transition-transform duration-500 ease-out group-hover:-translate-y-1.5 sm:pl-12 lg:mt-12">
              <div className="overflow-hidden rounded-tl-[16px] shadow-[0_24px_60px_-28px_rgba(0,0,0,0.6)]">
                <Image
                  src={SCREENS.courses.src}
                  alt="Askly's My Courses page with four enrolled MIVA courses"
                  width={SCREENS.courses.w}
                  height={SCREENS.courses.h}
                  sizes="(min-width: 1024px) 60vw, 100vw"
                  className="block h-auto w-full"
                />
              </div>
            </div>
          </article>
        </div>
      </section>

      {/* ── 006 FAQ ────────────────────────────────────────── */}
      <section id="faq" className="px-6 pt-24 pb-28 lg:pt-[117px] lg:pb-[90px]">
        <Label n="006">A few good questions</Label>
        <div className="mt-14 grid grid-cols-1 gap-12 lg:mt-[66px] lg:grid-cols-[1fr_1.52fr] lg:gap-[55px]">
          <div>
            <h2 className={cn(h2, "max-w-[480px]")}>
              Everything you need to begin.
            </h2>
            <p className={cn(lead, "mt-8 max-w-[460px] lg:text-[21px]")}>
              How Askly works, the Chrome extension, and who can see your notes.
            </p>
            <Pill tone="light" className="mt-12">
              Join the waitlist
            </Pill>
          </div>
          <Faq />
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer
        id="waitlist"
        className="scroll-mt-4 bg-[#131a15] px-6 pt-20 pb-10 text-[#f6f5f1] lg:pt-[78px]"
      >
        <div className="grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-[787fr_357fr_357fr_431fr] lg:gap-0">
          <div className="col-span-2 lg:col-span-1 lg:pr-12">
            <p className="text-[36px] leading-[1.05] tracking-[-0.015em] lg:text-[48px]">
              Study smarter.
              <br />
              Start from your notes.
            </p>
            <div className="mt-8">
              <WaitlistForm source="landing-v2" />
            </div>
          </div>
          <div>
            <p className="text-xs tracking-[0.02em] text-white/60 uppercase">
              Explore
            </p>
            <ul className="mt-7 space-y-[26px] text-[17px]">
              {NAV.map(([label, id]) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    className="transition-colors hover:text-white/70"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs tracking-[0.02em] text-white/60 uppercase">
              Account
            </p>
            <ul className="mt-7 space-y-[26px] text-[17px]">
              {[
                ["Sign in", "/sign-in"],
                ["Privacy", "/privacy"],
                ["Terms", "/terms"],
              ].map(([label, href]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="transition-colors hover:text-white/70"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="col-span-2 lg:col-span-1">
            <p className="text-xs tracking-[0.02em] text-white/60 uppercase">
              Made for students
            </p>
            <p className="mt-7 max-w-[320px] text-[22px] leading-[1.45]">
              Answers from your lectures. Revision that sticks. Deadlines you
              won&apos;t miss.
            </p>
          </div>
        </div>
        <div className="mt-20 grid grid-cols-1 items-center gap-6 border-t border-[#33443a] pt-9 lg:grid-cols-[787fr_714fr_431fr] lg:gap-0">
          <p className="text-[54px] leading-none tracking-[-0.02em] text-[#d6eb9a]">
            Askly<span className="text-[#5f8a5a]">*</span>
          </p>
          <p className="text-[11px] text-white/60">
            Built for <span className="text-white">MIVA Open University</span>{" "}
            students
          </p>
          <p className="text-[11px] text-white/60 uppercase lg:text-right">
            © {new Date().getFullYear()} Askly. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
