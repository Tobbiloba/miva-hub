"use client";

import { cn } from "lib/utils";
import {
  BookOpen,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Layers,
  PenTool,
  Quote,
  Sparkles,
} from "lucide-react";
import { createElement } from "react";
import {
  A11y,
  Autoplay,
  Keyboard,
  Navigation,
  Pagination,
} from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import { Shot, type ShotName } from "./shot";
import { card, eyebrow, heading, reveal } from "./styles";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

const slides: {
  icon: typeof Quote;
  title: string;
  description: string;
  points: string[];
  shot: ShotName;
  alt: string;
}[] = [
  {
    icon: Quote,
    title: "Answers with sources",
    description:
      "Every answer comes from your own course notes, with numbered sources you can open.",
    points: [
      "Cites the exact lecture or reading",
      "Says so when your notes don't cover it",
    ],
    shot: "answer",
    alt: "An Askly answer citing COS101 week 2 sources",
  },
  {
    icon: PenTool,
    title: "Practice quizzes",
    description:
      "A quiz from any lesson in seconds. Pick an answer, move on, and see your score at the end.",
    points: ["Questions from your own materials", "Marked as you go"],
    shot: "quiz",
    alt: "A COS101 practice quiz question in Askly",
  },
  {
    icon: Layers,
    title: "Flashcard decks",
    description:
      "Flip through cards in chat, then save the set as a deck for spaced review.",
    points: [
      "Shuffle, or see every card at once",
      "Cards you miss come back sooner",
    ],
    shot: "flashcards",
    alt: "A COS101 flashcard deck in Askly",
  },
  {
    icon: CalendarClock,
    title: "Deadlines",
    description:
      "Assignments and quizzes you capture land here with their due dates. Add anything else yourself.",
    points: ["Grouped into this week and later", "Ask Askly what's due"],
    shot: "deadlines",
    alt: "Askly's deadlines list",
  },
  {
    icon: BookOpen,
    title: "My Courses",
    description:
      "Your courses, credits and timetable in one place, with one tap to ask about any of them.",
    points: ["Ask about a course in one tap", "See what's coming up"],
    shot: "courses",
    alt: "Askly's My Courses page with four enrolled courses",
  },
  {
    icon: Sparkles,
    title: "Start from a prompt",
    description:
      "Not sure where to begin? Start from what's due, a quiz before the test, or your last lecture.",
    points: ["Picks up your setup progress", "One tap to your next step"],
    shot: "home",
    alt: "Askly's home screen with study starters",
  },
];

const navButton =
  "grid size-11 place-items-center rounded-full border border-white/15 bg-white/[0.04] text-white transition-colors hover:bg-white/10 disabled:opacity-40";

const FeaturesCarousel = () => {
  return (
    <section className="py-24 sm:py-32">
      <div
        data-reveal
        className={cn(
          reveal,
          "mx-auto flex max-w-6xl flex-col justify-between gap-6 px-5 sm:px-8 md:flex-row md:items-end",
        )}
      >
        <div>
          <p className={eyebrow}>Inside Askly</p>
          <h2
            className={cn(
              heading,
              "mt-3 max-w-xl text-4xl sm:text-5xl leading-[1.05]",
            )}
          >
            Everything you need, from lecture to exam.
          </h2>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className={cn(navButton, "landing-prev")}
            aria-label="Previous slide"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            className={cn(navButton, "landing-next")}
            aria-label="Next slide"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>

      <div className="mt-12">
        <Swiper
          centeredSlides
          loop
          speed={700}
          spaceBetween={20}
          slidesPerView={1.08}
          autoplay={{
            delay: 7000,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          }}
          keyboard={{ enabled: true }}
          navigation={{ nextEl: ".landing-next", prevEl: ".landing-prev" }}
          pagination={{ clickable: true, el: ".landing-pagination" }}
          modules={[Navigation, Pagination, Autoplay, Keyboard, A11y]}
          breakpoints={{ 768: { slidesPerView: 1.25, spaceBetween: 28 } }}
          className="!px-5 sm:!px-0"
        >
          {slides.map((slide) => (
            <SwiperSlide key={slide.title} className="!h-auto">
              {({ isActive }) => (
                <div
                  className={cn(
                    card,
                    "grid h-full grid-cols-1 overflow-hidden rounded-3xl transition-opacity duration-500 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]",
                    isActive ? "opacity-100" : "opacity-40",
                  )}
                >
                  <div className="flex flex-col p-7 sm:p-10">
                    <span className="grid size-11 place-items-center rounded-xl border border-white/10 bg-white/[0.04]">
                      {createElement(slide.icon, {
                        className: "size-5 text-white",
                      })}
                    </span>
                    <h3 className={cn(heading, "mt-6 text-3xl sm:text-4xl")}>
                      {slide.title}
                    </h3>
                    <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground sm:text-base">
                      {slide.description}
                    </p>
                    <ul className="mt-6 space-y-2 text-sm text-white/80">
                      {slide.points.map((p) => (
                        <li key={p} className="flex items-center gap-2.5">
                          <span className="size-1 rounded-full bg-white/60" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="relative flex items-end bg-gradient-to-br from-white/[0.06] via-transparent to-transparent px-6 pt-8 sm:px-10 sm:pt-12">
                    <Shot
                      name={slide.shot}
                      alt={slide.alt}
                      bleed
                      sizes="(min-width: 768px) 640px, 100vw"
                      className={cn(
                        "w-full",
                        slide.shot === "courses" && "max-w-none",
                      )}
                    />
                  </div>
                </div>
              )}
            </SwiperSlide>
          ))}
        </Swiper>
        <div className="landing-pagination mt-8 flex justify-center gap-2" />
      </div>

      <style jsx global>{`
        .landing-pagination .swiper-pagination-bullet {
          width: 6px;
          height: 6px;
          margin: 0 !important;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.25);
          opacity: 1;
          transition: width 0.3s ease, background 0.3s ease;
        }
        .landing-pagination .swiper-pagination-bullet-active {
          width: 22px;
          background: #fff;
        }
      `}</style>
    </section>
  );
};

export default FeaturesCarousel;
