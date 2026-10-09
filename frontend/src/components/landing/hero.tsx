import { cn } from "lib/utils";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Navbar from "./navbar";
import { Shot } from "./shot";
import { btnPrimary, btnSecondary, heading } from "./styles";

const Hero = () => {
  return (
    <div className="w-full p-1.5 sm:p-2">
      <div className="relative h-svh min-h-[680px] w-full overflow-hidden rounded-[20px] border border-white/10 py-4 sm:py-6">
        <Image
          src="https://cdn.dribbble.com/userupload/16818082/file/original-0a147bad495fe3fa9ea99ae5d26d795a.jpg?resize=2048x2560&vertical=center"
          alt=""
          priority
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-background" />
        <div className="relative z-10 mx-auto flex h-full max-w-6xl flex-col px-5 sm:px-8">
          <Navbar />
          <div className="flex flex-1 flex-col justify-center pb-24 sm:pb-40 animate-in fade-in-0 slide-in-from-bottom-4 duration-1000">
            <span className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-[13px] font-medium text-white/85 backdrop-blur">
              <span className="size-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
              Built for MIVA students
            </span>
            <h1
              className={cn(
                heading,
                "max-w-4xl text-[44px] leading-[1.02] sm:text-6xl md:text-7xl lg:text-[88px]",
              )}
            >
              Your course,{" "}
              <span className="bg-gradient-to-b from-white/50 to-white/20 bg-clip-text text-transparent">
                answered.
              </span>
            </h1>
            <p className="max-w-xl py-5 text-base leading-relaxed text-white/70 sm:text-lg">
              Ask anything about your lectures and get answers from your own
              course notes, with the source for every one. Capture lessons from
              the LMS in one click, then practise with quizzes and flashcards.
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              <a href="#waitlist" className={btnPrimary}>
                Join the waitlist
                <ArrowRight className="size-4" />
              </a>
              <a href="#how-it-works" className={btnSecondary}>
                See how it works
              </a>
            </div>
          </div>
        </div>
      </div>
      {/* The product, rising out of the hero */}
      <div className="relative z-10 mx-auto -mt-20 max-w-5xl px-5 sm:-mt-40 sm:px-8 animate-in fade-in-0 slide-in-from-bottom-8 duration-1000 [animation-delay:250ms] [animation-fill-mode:both]">
        <div className="[transform:perspective(2400px)_rotateX(8deg)] [transform-origin:50%_100%]">
          <Shot
            name="home"
            alt="Askly's home screen: a greeting, study starters and the chat box"
            priority
            sizes="(min-width: 1024px) 1024px, 100vw"
          />
        </div>
      </div>
    </div>
  );
};

export default Hero;
