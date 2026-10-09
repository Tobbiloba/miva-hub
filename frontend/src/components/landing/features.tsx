import { cn } from "lib/utils";
import { CalendarClock, Layers, MousePointerClick, Quote } from "lucide-react";
import type { ReactNode } from "react";
import { Shot, type ShotName } from "./shot";
import { card, eyebrow, heading, reveal } from "./styles";

function Feature({
  icon,
  label,
  title,
  body,
  shot,
  alt,
  className,
  shotClassName,
  delay = 0,
}: {
  delay?: number;
  icon: ReactNode;
  label: string;
  title: string;
  body: string;
  shot: ShotName;
  alt: string;
  className?: string;
  shotClassName?: string;
}) {
  return (
    <article
      data-reveal
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        reveal,
        card,
        "group flex flex-col md:min-h-[520px] overflow-hidden transition-colors hover:border-white/20",
        className,
      )}
    >
      <div className="p-6 sm:p-8">
        <p className={cn(eyebrow, "flex items-center gap-2 [&_svg]:size-4")}>
          {icon}
          {label}
        </p>
        <h3
          className={cn(heading, "mt-3 text-2xl sm:text-[28px] leading-tight")}
        >
          {title}
        </h3>
        <p className="mt-2 max-w-md text-[15px] leading-relaxed text-muted-foreground">
          {body}
        </p>
      </div>
      <div className="mt-auto max-h-[300px] overflow-hidden px-6 sm:px-8">
        <Shot
          name={shot}
          alt={alt}
          bleed
          className={cn(
            "transition-transform duration-700 ease-out group-hover:-translate-y-1.5",
            shotClassName,
          )}
        />
      </div>
    </article>
  );
}

const Features = () => {
  return (
    <section
      id="features"
      className="mx-auto max-w-6xl scroll-mt-6 px-5 py-24 sm:px-8 sm:py-32"
    >
      <div data-reveal className={reveal}>
        <p className={eyebrow}>What Askly does</p>
        <h2
          className={cn(
            heading,
            "mt-3 max-w-3xl text-4xl sm:text-5xl md:text-6xl leading-[1.05]",
          )}
        >
          Built around your own lectures.
        </h2>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Answers with sources from your course notes, one-click lesson capture,
          practice from any lesson, and every deadline in one list.
        </p>
      </div>

      <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Feature
          icon={<Quote />}
          label="Ask Askly"
          title="Ask questions. Get answers with sources."
          body="Ask about any lecture in your own words. Every answer shows the note or slide it came from, so you can check it."
          shot="answer"
          alt="Askly answering a question about the parts of a computer system, citing two COS101 sources"
        />
        <Feature
          icon={<MousePointerClick />}
          label="Askly Capture"
          title="Capture lessons from Chrome."
          body="Save lecture videos, PDFs, quizzes and assignments from the MIVA LMS. Askly reads them and answers from them."
          shot="popup"
          alt="The Askly Capture extension with a COS101 week 2 video lesson ready to capture"
          shotClassName="mx-auto max-w-[300px]"
          delay={100}
        />
        <Feature
          icon={<Layers />}
          label="Flashcards"
          title="Flashcards that come back."
          body="Turn any lesson into a deck. Askly brings each card back just before you'd forget it."
          shot="flashcards"
          alt="A COS101 flashcard deck in Askly"
          delay={50}
        />
        <Feature
          icon={<CalendarClock />}
          label="Deadlines"
          title="Every deadline in one list."
          body="Assignment and quiz dates come in with your captures. Add your own, or just ask Askly what's due."
          shot="deadlines"
          alt="Askly's deadlines list with assignments, a quiz, an essay and a lab report"
          delay={150}
        />
      </div>
    </section>
  );
};

export default Features;
