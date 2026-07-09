"use client";
import { ArrowRight } from "lucide-react";
import React, { useState } from "react";
import { Button } from "ui/button";

interface Testimonial {
  id: number;
  quote: string;
  name: string;
  title: string;
  image: string;
  tags: string[];
}

const avatarUrl = (name: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=80&background=e5e7eb&color=6b7280`;

const Testimonials: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  const testimonials: Testimonial[] = [
    {
      id: 1,
      quote:
        "Askly turned my lecture notes into a guide I could actually study. I went from cramming to understanding.",
      name: "Tori Handoko",
      title: "CS Undergraduate",
      image: avatarUrl("Tori Handoko"),
      tags: ["Study Guides", "Clarity"],
    },
    {
      id: 2,
      quote:
        "The quiz generator saved me hours. I practiced exactly what my exam covered and boosted my confidence.",
      name: "Sarah Johnson",
      title: "Business Student",
      image: avatarUrl("Sarah Johnson"),
      tags: ["Quizzes", "Confidence"],
    },
    {
      id: 3,
      quote:
        "Askly explains tough concepts from multiple angles. It finally clicked for me.",
      name: "Michael Chen",
      title: "Engineering Student",
      image: avatarUrl("Michael Chen"),
      tags: ["Explanations", "Understanding"],
    },
  ];

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-20">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-12 items-center">
        {/* Left Side - Content */}
        <div className="space-y-4 sm:space-y-6">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-normal leading-tight">
            Students are learning better with Askly
          </h1>
          <p className="text-neutral-200 text-sm sm:text-base md:text-lg leading-relaxed">
            Real stories from students using Askly to study efficiently,
            understand deeply, and prepare with confidence.
          </p>

          <Button className="mt-4 rounded gap-2 p-1.5 pl-4 sm:pl-6 h-fit hover:gap-3 transition-all text-sm sm:text-base">
            Case study
            <div className="p-2 sm:p-3 bg-lime-400 text-black rounded">
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </Button>
        </div>

        {/* Right Side - Testimonial Card */}
        <div className="relative col-span-2">
          <div className="bg-black/30 rounded p-5 sm:p-6 md:p-8 lg:p-10 shadow-sm">
            <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-normal mb-4 sm:mb-6 text-white">
              &ldquo;Studying finally feels manageable.&rdquo;
            </h2>

            <p className="text-neutral-300 text-sm sm:text-base leading-relaxed mb-6 sm:mb-8">
              &ldquo;{testimonials[activeIndex].quote}&rdquo;
            </p>

            <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
              <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                <img
                  src={testimonials[activeIndex].image}
                  alt={testimonials[activeIndex].name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      testimonials[activeIndex].name,
                    )}&size=80&background=e5e7eb&color=6b7280`;
                  }}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h3 className="font-semibold text-base sm:text-lg">
                      {testimonials[activeIndex].name}
                    </h3>
                    <p className="text-neutral-300 text-sm">
                      {testimonials[activeIndex].title}
                    </p>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    {testimonials[activeIndex].tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-white text-black rounded text-xs sm:text-sm font-medium border border-gray-200"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Pagination Dots */}
            <div className="flex justify-center gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === activeIndex
                      ? "bg-black w-8"
                      : "bg-gray-300 hover:bg-gray-400"
                  }`}
                  aria-label={`Go to testimonial ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Testimonials;
