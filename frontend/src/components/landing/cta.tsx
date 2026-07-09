import { ArrowRight } from "lucide-react";
import Image from "next/image";
import React from "react";
import { Button } from "ui/button";
import { ScrollVelocityContainer, ScrollVelocityRow } from "./ui/text-scroll";
const Cta = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-4 sm:px-6 md:px-8">
      <div className="relative h-[280px] sm:h-[350px] md:h-[35rem] border overflow-hidden rounded">
        <Image
          src="https://cdn.dribbble.com/userupload/7724019/file/original-4853578a2b5ba1e804265f7ee878875f.png?resize=1504x1504&vertical=center"
          alt="smart-home"
          fill
          className="object-cover"
        />
        {/* <div className='absolute inset-0 bg-black/50' /> */}
      </div>
      <div className="h-[280px] sm:h-[350px] md:h-[30rem] col-span-2 ">
        <div className="bg-black/30 p-6 sm:p-8 md:p-12 py-10 sm:py-12 md:py-16 rounded h-full flex flex-col">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-normal leading-tight">
            Study smarter with Askly — your AI copilot for guides, quizzes, and
            citations
          </h1>
          <p className="text-neutral-200 font-[400] max-w-xl my-3 sm:my-4 text-sm sm:text-base md:text-lg">
            Turn lectures and notes into study guides, create targeted quizzes
            in seconds, and get clear, cited explanations. Askly keeps all your
            study in one focused flow so you learn faster and remember longer.
          </p>
          <div className="flex items-center gap-3 sm:gap-4 mt-6 sm:mt-8 md:mt-12 justify-between flex-wrap">
            <Button className="mt-4 rounded gap-2 p-1.5 pl-4 sm:pl-6 h-fit hover:gap-3 transition-all text-sm sm:text-base">
              Get started free
              <div className="p-2 sm:p-3 bg-lime-400 text-black rounded">
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </Button>
            <div className="border bg-white w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded" />
          </div>
        </div>
        <div className="relative flex w-full flex-col items-center justify-center overflow-hidden mt-4 sm:mt-6">
          <ScrollVelocityContainer className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-[-0.02em] lg:text-6xl xl:text-7xl md:leading-[5rem]">
            <ScrollVelocityRow baseVelocity={10} direction={1}>
              Askly helps you understand faster and remember longer.
            </ScrollVelocityRow>
            {/* <ScrollVelocityRow baseVelocity={20} direction={-1}>
          Velocity Scroll
        </ScrollVelocityRow> */}
          </ScrollVelocityContainer>
          <div className="from-background pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r"></div>
          <div className="from-background pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l"></div>
        </div>
      </div>
    </div>
  );
};

export default Cta;
