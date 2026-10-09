import { Layers, MousePointerClick, Quote } from "lucide-react";
import Image from "next/image";
import React from "react";

const steps = [
  {
    tag: "Step 1",
    header: ["Add Askly Capture", "to Chrome"],
    listItems: [
      "Install the Askly Capture extension",
      "Pin it to your toolbar and sign in with your Askly account",
      "Add your courses in Askly",
      "Works in Google Chrome on a laptop or desktop",
    ],
    image: "/landing/screens/chat-dark.webp",
    imageLeft: false,
    bgGradient: "from-neutral-900/50 to-neutral-800/30",
    imageSize: "w-full h-full",
    multipleImages: false,
  },
  {
    tag: "Step 2",
    header: ["Open a lesson and", "press Capture"],
    listItems: [
      "Open a lecture video, PDF, quiz or assignment on the MIVA LMS",
      "The extension fills in the course, week and lesson title",
      "Press Capture this lesson",
      "Askly reads it in the background, ready in a few minutes",
    ],
    image: "/landing/screens/extension-popup.webp",
    imageLeft: true,
    bgGradient: "from-neutral-900/50 to-neutral-800/30",
    imageSize: "popup",
    multipleImages: false,
  },
  {
    tag: "Step 3",
    header: ["Ask, practise and", "stay on track"],
    listItems: [
      "Ask questions and get answers with sources from your notes",
      "Make a quiz or a set of flashcards from any lesson",
      "Save decks and review them when they're due",
      "See every deadline in one list",
    ],
    images: [
      "/landing/screens/answer-dark.webp",
      "/landing/screens/flashcards-dark.webp",
    ],
    imageLeft: false,
    bgGradient: "from-neutral-900/50 to-neutral-800/30",
    imageSize: "w-full h-full",
    multipleImages: true,
  },
];

const stats = [
  { text: "Click to capture a lesson", stat: "1", icon: MousePointerClick },
  {
    text: "Kinds of lessons: video, PDF, quiz and assignment",
    stat: "4",
    icon: Layers,
  },
  { text: "Answers cite the note they came from", stat: "Every", icon: Quote },
];

const HowItWorks = () => {
  return (
    <div id="how-it-works" className="p-1 sm:p-2 py-12 sm:py-16 md:py-20">
      <div className="w-full h-fit rounded bg-black/20 p-4 sm:p-6 md:p-10 border">
        {/* Steps */}
        <div className="max-w-7xl mx-auto space-y-12 sm:space-y-16 md:space-y-20 lg:space-y-24 px-4 sm:px-6">
          {steps.map((step, index) => (
            <div
              key={step.tag}
              className={`grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 md:gap-12 items-center`}
            >
              {/* Text */}
              <div className={`${step.imageLeft ? "md:order-2" : ""}`}>
                <div className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 text-xs font-medium mb-4 sm:mb-6 border-b">
                  <span>{step.tag}</span>
                </div>
                <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-normal mb-4 sm:mb-6 leading-tight text-white">
                  {step.header[0]}
                  <br />
                  {step.header[1]}
                </h3>
                <ul className="space-y-2 sm:space-y-3 text-neutral-400 text-sm sm:text-base md:text-lg">
                  {step.listItems.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="text-neutral-300 font-[300] mt-1.5">
                        •
                      </span>
                      <span className="font-[400]">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {/* Image */}
              <div
                className={`${step.imageLeft ? "md:order-1" : ""} relative rounded overflow-hidden min-h-[260px] sm:min-h-[320px] md:min-h-[420px] lg:min-h-[520px] bg-gradient-to-br ${step.bgGradient} border border-neutral-800 flex items-center justify-center p-4 sm:p-6 md:p-8`}
              >
                {step.multipleImages ? (
                  <div className="grid grid-cols-2 gap-4 w-full h-full min-h-[400px]">
                    {step.images?.map((img, i) => (
                      <div
                        key={i}
                        className={`relative rounded overflow-hidden bg-neutral-900 border border-neutral-700 -rotate-12 h-[240px] ${i == 1 && "top-[200px] rotate-12"}`}
                      >
                        <Image
                          src={img}
                          alt={`${step.tag} image ${i + 1}`}
                          fill
                          sizes="(min-width: 768px) 25vw, 50vw"
                          className="object-cover object-left-top opacity-90"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    className={`relative rounded overflow-hidden bg-neutral-900 border border-neutral-700 ${step.imageSize === "popup" ? "w-[300px] max-w-full aspect-[360/385]" : "w-full aspect-[16/10]"} mx-auto`}
                  >
                    <Image
                      src={step.image || "/bento/platform-features.png"}
                      alt={step.header.join(" ")}
                      fill
                      sizes="(min-width: 768px) 50vw, 100vw"
                      className={`object-cover object-left-top ${step.imageSize === "popup" ? "" : "opacity-90"}`}
                    />
                    {/* <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" /> */}
                  </div>
                )}
                {/* Decorative blur */}
                <div
                  className={`absolute ${index % 2 === 0 ? "-top-20 -right-20" : "-bottom-20 -left-20"} w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none`}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 border-t border-neutral-800 pt-8 sm:pt-12 md:pt-16 mt-8 sm:mt-12 md:mt-16 max-w-7xl mx-auto px-4 sm:px-6">
          {stats.map((stat) => (
            <div
              key={stat.text}
              className="bg-neutral-900/50 rounded p-5 sm:p-6 md:p-8 border border-neutral-800 hover:border-neutral-700 transition-colors"
            >
              <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                  {React.createElement(stat.icon, {
                    className: "h-4 w-4 sm:h-5 sm:w-5 text-white",
                    strokeWidth: 2,
                  })}
                </div>
              </div>
              <div className="text-3xl sm:text-4xl md:text-5xl font-normal text-white mb-1.5 sm:mb-2">
                {stat.stat}
              </div>
              <div className="text-xs sm:text-sm text-neutral-400">
                {stat.text}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;
