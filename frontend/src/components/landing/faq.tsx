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
    <div
      id="faq"
      className="container mx-auto my-16 sm:my-20 md:my-24 px-4 sm:px-6"
    >
      <div className="bg-black/20 rounded p-6 sm:p-8 md:p-12 border">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-normal">
            Frequently asked questions
          </h2>
          <p className="text-sm sm:text-base text-neutral-500 mt-3 max-w-2xl">
            Quick answers about how Askly works, the Chrome extension, and who
            can see your notes.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {faqs.map((item) => (
            <div
              key={item.q}
              className="rounded border border-neutral-800 p-4 sm:p-5 bg-neutral-900/40"
            >
              <div className="text-sm sm:text-base md:text-lg font-medium mb-2">
                {item.q}
              </div>
              <div className="text-xs sm:text-sm md:text-base text-neutral-300">
                {item.a}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Faq;
