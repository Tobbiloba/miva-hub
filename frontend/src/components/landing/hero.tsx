import React from "react";
import Navbar from "./navbar";
import Image from "next/image";
import { Button } from "../ui/button";
import { ArrowRight } from "lucide-react";
const Hero = () => {
  return (
    <div className="p-1 sm:p-2 h-screen w-screen">
      <div className="w-full h-full rounded-l py-6 sm:py-10 relative overflow-hidden border">
        <Image
        src="https://cdn.dribbble.com/userupload/16818082/file/original-0a147bad495fe3fa9ea99ae5d26d795a.jpg?resize=2048x2560&vertical=center"
        // src="https://cdn.dribbble.com/userupload/11736598/file/original-3a62dd2a0d6433017070f3d0a50f34a8.jpg?resize=1504x1128&vertical=center"
        // src="https://cdn.dribbble.com/userupload/3714265/file/original-e6a504bfed34bef1c6f5c4e288d50bc8.jpg?resize=1504x1128&vertical=center"
        //   src="https://cdn.dribbble.com/userupload/43027934/file/original-f2245cb2314fb9c4430f7284072cf366.png?resize=1024x1024&vertical=center"
          alt="hero-bg"
          fill
          className="object-cover absolute top-0 left-0 w-full h-full"
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="container mx-auto relative z-10 h-full px-4 sm:px-6">
          <Navbar />
          <div className="flex-1 h-full flex flex-col justify-center items-start max-w-5xl pt-8 md:pt-0">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-normal leading-tight">Askly — your AI study copilot</h1>
            <p className="text-base sm:text-lg max-w-2xl text-neutral-300 py-4 sm:py-6 leading-relaxed">
              Ask questions about your courses and get instant answers with trusted sources. Generate comprehensive study guides from lecture notes, create targeted practice quizzes, and track your learning progress — all in one focused platform built for students who want to study smarter, not harder.
            </p>
            <Button className="mt-4 sm:mt-6 rounded gap-2 p-1.5 pl-4 sm:pl-6 h-fit hover:gap-3 transition-all text-sm sm:text-base">Try Askly free <div className="p-2 sm:p-3 bg-black text-white rounded"><ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" /></div></Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
