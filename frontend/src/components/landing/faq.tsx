import React from "react";

const faqs = [
  {
    q: "What makes Askly different?",
    a: "Askly gives cited answers, turns lectures into guides, and creates targeted quizzes in seconds.",
  },
  {
    q: "Can I upload my course materials?",
    a: "Yes. Upload slides, notes, and readings. Askly organizes them and answers with sources.",
  },
  {
    q: "Does Askly work for any subject?",
    a: "Askly supports a wide range of courses, including STEM, business, and humanities.",
  },
  {
    q: "Is my data private?",
    a: "We prioritize privacy. Your materials are processed securely and never sold.",
  },
  {
    q: "How much does it cost?",
    a: "Start free. Upgrade for more content, longer context, and advanced features.",
  },
];

const Faq = () => {
  return (
    <div className="container mx-auto my-16 sm:my-20 md:my-24 px-4 sm:px-6">
      <div className="bg-black/20 rounded p-6 sm:p-8 md:p-12 border">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-normal">
            Frequently asked questions
          </h2>
          <p className="text-sm sm:text-base text-neutral-500 mt-3 max-w-2xl">
            Quick answers about how Askly works, what you can upload, and how we
            handle privacy.
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
