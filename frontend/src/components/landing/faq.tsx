import { cn } from "lib/utils";
import { card, eyebrow, heading } from "./styles";

const faqs = [
  {
    q: "Where do Askly's answers come from?",
    a: "From the lessons you capture: lecture videos, PDFs, quizzes and assignments from your courses. Every answer shows its sources, and when your materials don't cover something, Askly says so instead of guessing.",
  },
  {
    q: "What can the Chrome extension capture?",
    a: "Video lessons, PDF notes, quiz pages and assignment pages on the MIVA LMS. It reads the course, week and lesson title from the page; you just press Capture.",
  },
  {
    q: "Do I need the extension to use Askly?",
    a: "No. You can chat, make quizzes and flashcards and track deadlines without it. The extension is what lets Askly answer from your own lectures.",
  },
  {
    q: "Which browsers does it work in?",
    a: "The extension runs in Google Chrome on a laptop or desktop. The Askly web app works in any modern browser, on your phone too.",
  },
  {
    q: "Who can see my captures?",
    a: "Only you. Askly reads content for the courses you've added, and you can remove a capture at any time from My Courses.",
  },
  {
    q: "When can I start?",
    a: "We're letting students in in small groups. Join the waitlist and we'll email you when your spot opens.",
  },
];

const Faq = () => {
  return (
    <section
      id="faq"
      className="mx-auto max-w-6xl scroll-mt-6 px-5 py-24 sm:px-8 sm:py-32"
    >
      <p className={eyebrow}>FAQ</p>
      <h2 className={cn(heading, "mt-3 text-4xl sm:text-5xl leading-[1.05]")}>
        Questions, answered.
      </h2>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        How Askly works, the Chrome extension, and who can see your notes.
      </p>
      <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2">
        {faqs.map((item) => (
          <div key={item.q} className={cn(card, "p-6 sm:p-7")}>
            <h3 className="text-[17px] font-semibold tracking-[-0.015em]">
              {item.q}
            </h3>
            <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
              {item.a}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Faq;
