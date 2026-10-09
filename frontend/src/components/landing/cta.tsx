import { cn } from "lib/utils";
import { Shot } from "./shot";
import { eyebrow, heading } from "./styles";
import { ScrollVelocityContainer, ScrollVelocityRow } from "./ui/text-scroll";
import { WaitlistForm } from "./waitlist-form";

const Cta = () => {
  return (
    <section
      id="waitlist"
      className="mx-auto max-w-6xl scroll-mt-6 px-5 py-12 sm:px-8"
    >
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 -right-40 size-[520px] rounded-full bg-brand/20 blur-[120px]"
        />
        <div className="relative grid grid-cols-1 items-center gap-10 p-7 sm:p-12 lg:grid-cols-2 lg:gap-12">
          <div>
            <p className={eyebrow}>Early access</p>
            <h2
              className={cn(
                heading,
                "mt-3 text-4xl sm:text-5xl leading-[1.05]",
              )}
            >
              Study smarter. Stress less.
            </h2>
            <p className="mt-4 max-w-md text-lg leading-relaxed text-muted-foreground">
              Answers, quizzes and flashcards from your own lectures, and every
              deadline in one list. Join the waitlist and be among the first
              students in.
            </p>
            <div className="mt-8">
              <WaitlistForm source="landing" />
            </div>
          </div>
          <Shot
            name="flashcards"
            alt="A COS101 flashcard deck in Askly"
            className="hidden lg:block"
          />
        </div>
      </div>

      <div className="relative mt-10 flex w-full flex-col items-center justify-center overflow-hidden">
        <ScrollVelocityContainer className="text-4xl font-semibold tracking-[-0.04em] text-white/15 md:text-6xl lg:text-7xl md:leading-[5rem]">
          <ScrollVelocityRow baseVelocity={6} direction={1}>
            Askly answers from what you were actually taught.
          </ScrollVelocityRow>
        </ScrollVelocityContainer>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-background" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-background" />
      </div>
    </section>
  );
};

export default Cta;
