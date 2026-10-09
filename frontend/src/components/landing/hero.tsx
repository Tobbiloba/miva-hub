import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { Button } from "../ui/button";
import Navbar from "./navbar";
const Hero = () => {
  return (
    <div className="p-1 sm:p-2 h-screen w-screen">
      <div className="w-full h-full rounded-l py-6 sm:py-10 relative overflow-hidden border">
        <Image
          src="https://cdn.dribbble.com/userupload/16818082/file/original-0a147bad495fe3fa9ea99ae5d26d795a.jpg?resize=2048x2560&vertical=center"
          alt=""
          priority
          fill
          className="object-cover absolute top-0 left-0 w-full h-full"
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="container mx-auto relative z-10 h-full px-4 sm:px-6">
          <Navbar />
          <div className="flex-1 h-full flex flex-col justify-center items-start max-w-5xl pt-8 md:pt-0">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-normal leading-tight">
              Askly — your course, answered
            </h1>
            <p className="text-base sm:text-lg max-w-2xl text-neutral-300 py-4 sm:py-6 leading-relaxed">
              Ask anything about your courses and get answers from your own
              lecture notes, with the source for every answer. Capture lessons
              from the MIVA LMS in one click, turn them into quizzes and
              flashcards, and keep every deadline in one list.
            </p>
            <Button
              asChild
              className="mt-4 sm:mt-6 rounded gap-2 p-1.5 pl-4 sm:pl-6 h-fit hover:gap-3 transition-all text-sm sm:text-base"
            >
              <a href="#waitlist">
                Join the waitlist{" "}
                <span className="p-2 sm:p-3 bg-black text-white rounded">
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </span>
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
