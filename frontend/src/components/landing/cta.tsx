import Image from "next/image";
import { ScrollVelocityContainer, ScrollVelocityRow } from "./ui/text-scroll";
import { WaitlistForm } from "./waitlist-form";
const Cta = () => {
  return (
    <div
      id="waitlist"
      className="grid grid-cols-1 md:grid-cols-3 gap-4 px-4 sm:px-6 md:px-8 scroll-mt-6"
    >
      <div className="relative h-[280px] sm:h-[350px] md:h-[35rem] border overflow-hidden rounded">
        <Image
          src="/landing/screens/flashcards-dark.webp"
          alt="A flashcard deck in Askly"
          fill
          sizes="(min-width: 768px) 33vw, 100vw"
          className="object-cover object-[62%_45%]"
        />
        {/* <div className='absolute inset-0 bg-black/50' /> */}
      </div>
      <div className="md:col-span-2">
        <div className="bg-white/[0.06] p-6 sm:p-8 md:p-12 py-10 sm:py-12 md:py-16 rounded flex flex-col">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-normal leading-tight">
            Study smarter with Askly — answers, quizzes and flashcards from your
            own lectures
          </h1>
          <p className="text-neutral-200 font-[400] max-w-xl my-3 sm:my-4 text-sm sm:text-base md:text-lg">
            Capture your lessons, ask anything about them, practise with quizzes
            and flashcards, and never lose track of a deadline. Join the
            waitlist and be among the first students in.
          </p>
          <div className="mt-6 sm:mt-8 md:mt-10">
            <WaitlistForm source="landing" />
          </div>
        </div>
        <div className="relative flex w-full flex-col items-center justify-center overflow-hidden mt-4 sm:mt-6">
          <ScrollVelocityContainer className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-[-0.02em] lg:text-6xl xl:text-7xl md:leading-[5rem]">
            <ScrollVelocityRow baseVelocity={10} direction={1}>
              Askly answers from what you were actually taught.
            </ScrollVelocityRow>
            {/* <ScrollVelocityRow baseVelocity={20} direction={-1}>
          Velocity Scroll
        </ScrollVelocityRow> */}
          </ScrollVelocityContainer>
          <div className="from-black pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r"></div>
          <div className="from-black pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l"></div>
        </div>
      </div>
    </div>
  );
};

export default Cta;
