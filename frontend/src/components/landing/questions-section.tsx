const CARDS: (
  | { kind: "quote"; text: string; who: string; span?: string }
  | { kind: "stat"; big: string; small: string }
)[] = [
  {
    kind: "quote",
    text: "“What do I have due this week, and what should I start first?”",
    who: "Planning the week",
    span: "sm:col-span-2",
  },
  { kind: "stat", big: "[S1]", small: "Every answer cites your notes" },
  {
    kind: "quote",
    text: "“Quiz me on this week's lecture, ten questions, feedback after each one.”",
    who: "Before a test",
  },
  { kind: "stat", big: "24/7", small: "Ask at 2am, ask on the bus" },
  {
    kind: "quote",
    text: "“Explain the fetch–decode–execute cycle like I've never seen it before.”",
    who: "When it isn't clicking",
    span: "sm:col-span-2",
  },
];

/** What students actually ask, in the testimonial-grid layout. */
export function QuestionsSection() {
  return (
    <section className="bg-white text-neutral-900">
      <div className="mx-auto max-w-6xl px-5 pb-24 sm:px-8 lg:px-24">
        <span className="text-xs font-medium text-neutral-500">
          In the chat
        </span>
        <h2 className="mt-1 font-display text-4xl font-bold tracking-tight sm:text-5xl">
          Made for real student questions
        </h2>
        <p className="mt-2 text-base text-neutral-600">
          The kind of things students ask Askly every day.
        </p>
        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          {CARDS.map((c) =>
            c.kind === "quote" ? (
              <figure
                key={c.text}
                className={`flex min-h-48 flex-col justify-between rounded-2xl border border-neutral-200 bg-neutral-100 p-6 ${c.span ?? ""}`}
              >
                <blockquote className="font-display text-xl font-semibold leading-snug sm:text-2xl">
                  {c.text}
                </blockquote>
                <figcaption className="mt-6 text-xs font-medium text-neutral-500">
                  {c.who}
                </figcaption>
              </figure>
            ) : (
              <div
                key={c.big}
                className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-100 p-6 text-center"
              >
                <span className="font-display text-5xl font-bold tracking-tight">
                  {c.big}
                </span>
                <span className="mt-2 text-sm text-neutral-600">{c.small}</span>
              </div>
            ),
          )}
        </div>
      </div>
    </section>
  );
}
