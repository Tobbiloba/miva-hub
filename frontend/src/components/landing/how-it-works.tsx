import { cn } from "lib/utils";
import { Check } from "lucide-react";
import { Shot, type ShotName } from "./shot";
import { card, eyebrow, heading, reveal } from "./styles";

const steps: {
  tag: string;
  title: string;
  items: string[];
  shot: ShotName;
  alt: string;
  narrow?: boolean;
}[] = [
  {
    tag: "Step 1",
    title: "Add Askly Capture to Chrome",
    items: [
      "Install the Askly Capture extension",
      "Pin it to your toolbar and sign in with your Askly account",
      "Add your courses in Askly",
    ],
    shot: "courses",
    alt: "Askly's My Courses page with four enrolled courses",
  },
  {
    tag: "Step 2",
    title: "Open a lesson and press Capture",
    items: [
      "Open a lecture video, PDF, quiz or assignment on the MIVA LMS",
      "The extension fills in the course, week and lesson title",
      "Press Capture this lesson. Askly reads it in the background",
    ],
    shot: "popup",
    alt: "The Askly Capture extension popup, filled in for a COS101 video lesson",
    narrow: true,
  },
  {
    tag: "Step 3",
    title: "Ask, practise and stay on track",
    items: [
      "Ask questions and get answers with sources from your notes",
      "Make a quiz or a deck of flashcards from any lesson",
      "See every deadline in one list",
    ],
    shot: "quiz",
    alt: "A practice quiz question in Askly with Charles Babbage selected",
  },
];

const stats = [
  { stat: "1 click", text: "to capture a lesson from the LMS" },
  { stat: "4 kinds", text: "of lessons: video, PDF, quiz and assignment" },
  { stat: "Every answer", text: "shows the note it came from" },
];

const HowItWorks = () => {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-6 border-y border-border bg-[#0b0b0c] py-24 sm:py-32"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div data-reveal className={reveal}>
          <p className={eyebrow}>How it works</p>
          <h2
            className={cn(
              heading,
              "mt-3 max-w-3xl text-4xl sm:text-5xl md:text-6xl leading-[1.05]",
            )}
          >
            From the LMS to your answers in three steps.
          </h2>
        </div>

        <div className="mt-16 space-y-20 sm:space-y-28">
          {steps.map((step, index) => (
            <div
              key={step.tag}
              data-reveal
              className={cn(
                reveal,
                "grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-16",
              )}
            >
              <div className={index % 2 === 1 ? "md:order-2" : ""}>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/70">
                  <span className="grid size-4 place-items-center rounded-full bg-white text-[10px] font-semibold text-black">
                    {index + 1}
                  </span>
                  {step.tag}
                </span>
                <h3
                  className={cn(
                    heading,
                    "mt-5 text-3xl sm:text-4xl leading-tight",
                  )}
                >
                  {step.title}
                </h3>
                <ul className="mt-6 space-y-3">
                  {step.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 text-[15px] leading-relaxed text-muted-foreground sm:text-base"
                    >
                      <Check className="mt-1 size-4 shrink-0 text-white/70" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className={index % 2 === 1 ? "md:order-1" : ""}>
                <div
                  className={cn(
                    card,
                    "flex items-center justify-center overflow-hidden bg-gradient-to-b from-card to-background p-6 sm:p-10",
                  )}
                >
                  <Shot
                    name={step.shot}
                    alt={step.alt}
                    className={cn("w-full", step.narrow && "max-w-[300px]")}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div
          data-reveal
          className={cn(
            reveal,
            card,
            "mt-24 grid grid-cols-1 divide-y divide-border md:grid-cols-3 md:divide-x md:divide-y-0",
          )}
        >
          {stats.map((s) => (
            <div key={s.stat} className="p-6 sm:p-8">
              <p className={cn(heading, "text-3xl sm:text-4xl")}>{s.stat}</p>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
