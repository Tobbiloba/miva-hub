"use client";

import {
  ArrowRight,
  BookOpen,
  Brain,
  CalendarClock,
  Layers,
  Lightbulb,
  MousePointerClick,
  PenTool,
  Quote,
} from "lucide-react";
import Image from "next/image";
import React from "react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import { Button } from "../ui/button";

// Import Swiper styles
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

const carouselItems = [
  {
    id: 1,
    icon: Quote,
    title: "Answers with sources",
    description:
      "Every answer comes from your own course notes and shows the source",
    bgGradient: "from-neutral-900 to-neutral-800",
    mediaType: "image",
    mediaSrc: "/landing/screens/answer-dark.webp",
    layout: "bottom-right",
    hasButton: true,
  },
  {
    id: 2,
    icon: MousePointerClick,
    title: "One-click capture",
    description:
      "Save lessons from the MIVA LMS with the Askly Capture extension",
    bgGradient: "from-neutral-900 to-neutral-800",
    mediaType: "video",
    mediaSrc:
      "https://cdn.dribbble.com/userupload/12213795/file/original-b1d851b100c529464d02f999bf75d858.mp4",
    layout: "top-left",
    hasButton: false,
  },
  {
    id: 3,
    icon: PenTool,
    title: "Practice quizzes",
    description: "A quiz from any lesson, marked as you go",
    bgGradient: "from-neutral-900 to-neutral-800",
    mediaType: "image",
    mediaSrc: "/landing/screens/quiz-dark.webp",
    layout: "bottom-left",
    hasButton: true,
  },
  {
    id: 4,
    icon: Layers,
    title: "Flashcard decks",
    description:
      "Save any set to a deck and review each card just before you'd forget it",
    bgGradient: "from-neutral-900 to-neutral-800",
    mediaType: "video",
    mediaSrc:
      "https://cdn.dribbble.com/userupload/17865107/file/original-9f8b53156579274b19ba602ecbf8a949.mp4",
    layout: "top-right",
    hasButton: false,
  },
  {
    id: 5,
    icon: CalendarClock,
    title: "Every deadline in one list",
    description:
      "Due dates come in with your captures. Add your own, or just ask Askly",
    bgGradient: "from-neutral-900 to-neutral-800",
    mediaType: "none",
    layout: "center",
    hasButton: true,
  },
  {
    id: 6,
    icon: BookOpen,
    title: "My Courses",
    description:
      "Your courses, timetable and what's coming up, with one tap to ask",
    bgGradient: "from-neutral-900 to-neutral-800",
    mediaType: "image",
    mediaSrc: "/landing/screens/courses-dark.webp",
    layout: "bottom-right",
    hasButton: true,
  },
  {
    id: 7,
    icon: Lightbulb,
    title: "Explain my last lecture",
    description: "The key ideas from your latest lesson, in plain language",
    bgGradient: "from-neutral-900 to-neutral-800",
    mediaType: "none",
    layout: "center",
    hasButton: false,
  },
  {
    id: 8,
    icon: Brain,
    title: "Remembers your progress",
    description:
      "Askly keeps track of what you asked and studied, so it can help you revise",
    bgGradient: "from-neutral-900 to-neutral-800",
    mediaType: "image",
    mediaSrc: "/landing/screens/flashcards-dark.webp",
    layout: "top-left",
    hasButton: true,
  },
];

const FeaturesCarousel = () => {
  return (
    <div className="mx-auto my-16 sm:my-24 md:my-32 px-4 sm:px-6">
      <div className="text-center mb-8 sm:mb-12 md:mb-16 flex flex-col md:flex-row justify-between gap-4 md:gap-0 max-w-7xl mx-auto">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-normal mb-4 max-w-md text-start">
          Everything Askly does for your course
        </h2>
        <p className="text-base sm:text-lg text-neutral-500 mx-auto md:mx-0 max-w-lg text-left md:text-right">
          From the first lecture to exam week — answers, practice and reminders,
          all from what you were actually taught.
        </p>
      </div>

      <div className="relative">
        <Swiper
          centeredSlides={true}
          slidesPerView={1.4}
          spaceBetween={30}
          loop={true}
          speed={800}
          autoplay={{
            delay: 8000,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          }}
          navigation={{
            nextEl: ".custom-next",
            prevEl: ".custom-prev",
          }}
          pagination={{
            clickable: true,
            el: ".custom-pagination",
          }}
          modules={[Navigation, Pagination, Autoplay]}
          className="mySwiper"
          breakpoints={{
            320: {
              slidesPerView: 1,
            },
            768: {
              slidesPerView: 1.4,
            },
          }}
        >
          {carouselItems.map((item) => (
            <SwiperSlide key={item.id}>
              {({ isActive, isNext }) => {
                const getLayoutClasses = () => {
                  switch (item.layout) {
                    case "top-left":
                      return "justify-start items-start";
                    case "top-right":
                      return "justify-start items-end";
                    case "bottom-left":
                      return "justify-end items-start";
                    case "bottom-right":
                      return "justify-end items-end";
                    default:
                      return "justify-center items-center";
                  }
                };

                return (
                  <div
                    className={`relative rounded bg-gradient-to-br ${item.bgGradient} border border-neutral-700 flex flex-col ${getLayoutClasses()} overflow-hidden transition-all duration-500 ${
                      isActive
                        ? "h-[40rem] opacity-100"
                        : "h-[30rem] opacity-40"
                    } ${isNext ? "mt-[10rem]" : ""}`}
                  >
                    {/* Background Image or Video */}
                    {item.mediaType === "image" && item.mediaSrc && (
                      <>
                        <Image
                          src={item.mediaSrc}
                          alt={item.title}
                          fill
                          sizes="70vw"
                          className="object-cover object-left-top"
                        />
                        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/70" />
                      </>
                    )}

                    {item.mediaType === "video" && item.mediaSrc && (
                      <>
                        <video
                          autoPlay
                          loop
                          muted
                          playsInline
                          className="absolute inset-0 w-full h-full object-cover"
                        >
                          <source src={item.mediaSrc} type="video/mp4" />
                        </video>
                        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-black/20 to-black/70" />
                      </>
                    )}

                    {/* Decorative blurred circle for non-media slides */}
                    {item.mediaType === "none" && (
                      <div className="absolute -top-20 -right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
                    )}

                    {/* Content Container */}
                    <div
                      className={`relative z-10 p-8 flex flex-col ${item.layout === "center" ? "items-center text-center" : "items-start"} max-w-xl transition-all duration-500`}
                    >
                      {/* Icon container */}
                      <div
                        className={`rounded flex items-center justify-center mb-4 bg-white/10 backdrop-blur-sm border border-white/20 transition-all duration-500 ${
                          isActive ? "w-16 h-16" : "w-14 h-14"
                        }`}
                      >
                        {React.createElement(item.icon, {
                          className: `text-white transition-all duration-500 ${isActive ? "w-8 h-8" : "w-7 h-7"}`,
                        })}
                      </div>

                      {/* Title */}
                      <h3
                        className={`font-normal text-white transition-all duration-500 mb-3 ${
                          isActive ? "text-5xl" : "text-3xl"
                        }`}
                      >
                        {item.title}
                      </h3>

                      {/* Description */}
                      <p
                        className={`leading-relaxed text-neutral-400 transition-all duration-500 mb-4 ${
                          isActive ? "text-base" : "text-sm"
                        }`}
                      >
                        {item.description}
                      </p>

                      {/* Button */}
                      {item.hasButton && isActive && (
                        <Button
                          asChild
                          className="rounded gap-2 p-1.5 pl-6 h-fit bg-white text-black hover:bg-neutral-100"
                        >
                          <a href="#waitlist">
                            Join the waitlist
                            <span className="p-2.5 bg-black text-white rounded">
                              <ArrowRight className="w-4 h-4" />
                            </span>
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              }}
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Custom Navigation Buttons - Asymmetric Design */}
        {/* Previous Button - Bottom Left */}
        <button className="custom-prev absolute left-36 bottom-24 z-20 group">
          <div className="relative w-12 h-12 rounded bg-white border border-neutral-200 flex items-center justify-center transition-all duration-300 hover:bg-neutral-50 hover:scale-110">
            <svg
              className="w-7 h-7 text-neutral-900 transition-transform duration-300 group-hover:-translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </div>
        </button>

        {/* Next Button - Top Right */}
        <button className="custom-next absolute right-36 top-0 z-20 group">
          <div className="relative w-12 h-12 rounded bg-neutral-900 border border-neutral-700 flex items-center justify-center transition-all duration-300 hover:bg-neutral-800 hover:scale-110">
            <svg
              className="w-7 h-7 text-white transition-transform duration-300 group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </button>

        {/* Custom Pagination - Below carousel */}
        <div className="custom-pagination flex justify-center gap-3 mt-16"></div>
      </div>

      {/* Custom Pagination Styles */}
      <style jsx global>{`
        .custom-pagination .swiper-pagination-bullet {
          width: 12px;
          height: 12px;
          background: #d4d4d4;
          opacity: 1;
          transition: all 0.3s ease;
          border-radius: 2%;
          cursor: pointer;
        }
        .custom-pagination .swiper-pagination-bullet-active {
          width: 40px;
          background: #525252;
          border-radius: 1px;
        }
        .custom-pagination .swiper-pagination-bullet:hover {
          background: #a3a3a3;
          transform: scale(1.1);
        }
      `}</style>
    </div>
  );
};

export default FeaturesCarousel;
