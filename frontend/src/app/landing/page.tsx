import { LandingMotion } from "@/components/landing/motion";
import { WaitlistForm } from "@/components/landing/waitlist-form";
import { BookOpenCheck, FileSearch, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import { Instrument_Serif } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import "./landing.css";

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Askly · Your course, answered",
  description:
    "Askly answers from your own lectures with sources, turns them into quizzes and flashcards, and keeps every deadline in one place. Capture a lesson from Chrome in one click.",
  openGraph: {
    title: "Askly · Your course, answered",
    description: "A study partner that answers from your own lectures.",
    images: ["/landing/art/hero.webp"],
  },
};

const INSTALL_URL = process.env.NEXT_PUBLIC_EXTENSION_INSTALL_URL;

const FAQ = [
  {
    q: "Where do Askly's answers come from?",
    a: "From the lessons you capture: lecture videos (transcribed), PDFs, quizzes and assignments from your courses. Every answer shows the sources it used, so you can open the exact note. When your materials don't cover something, Askly says so instead of guessing.",
  },
  {
    q: "What can the Chrome extension capture?",
    a: "Video lessons, PDF notes, quiz pages and assignment pages on the MIVA LMS. It reads the course code, week and lesson title from the page for you; you just press Capture.",
  },
  {
    q: "Do I need the extension to use Askly?",
    a: "No. You can chat, make quizzes and track deadlines without it. The extension is what lets Askly answer from your own lectures instead of general knowledge.",
  },
  {
    q: "Which browsers does it work in?",
    a: "Google Chrome on a laptop or desktop. The web app itself works in any modern browser, on your phone too.",
  },
  {
    q: "Who can see my captures?",
    a: "Only you. Askly reads content for the courses you've added, and you can remove any capture at any time from My Courses.",
  },
  {
    q: "When can I start?",
    a: "We're letting students in in small groups. Join the waitlist and we'll send one email when your spot opens.",
  },
];

const SCREENS = [
  { src: "/landing/screens/mobile-chat-light.webp", label: "Ask anything" },
  {
    src: "/landing/screens/mobile-answer-light.webp",
    label: "Answers with sources",
  },
  { src: "/landing/screens/mobile-flashcards-light.webp", label: "Flashcards" },
  { src: "/landing/screens/mobile-deadlines-light.webp", label: "Deadlines" },
];

function Brand() {
  return (
    <Link href="/landing" className="brand" aria-label="Askly home">
      <span className="brand-mark" aria-hidden>
        a<i />
      </span>
      Askly
    </Link>
  );
}

function Phone({
  src,
  alt,
  className = "",
  eager = false,
}: { src: string; alt: string; className?: string; eager?: boolean }) {
  return (
    <div className={`phone ${className}`}>
      <Image
        src={src}
        alt={alt}
        width={390}
        height={844}
        sizes="270px"
        priority={eager}
      />
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className={`lp ${serif.variable}`}>
      {/* ── nav: floating pill ── */}
      <header className="nav">
        <div className="nav-pill">
          <Brand />
          <nav className="nav-links" aria-label="Main">
            <a href="#features">Features</a>
            <a href="#capture">Capture</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="nav-actions">
            <Link href="/sign-in" className="nav-signin">
              Sign in
            </Link>
            <a href="#join" className="btn btn-ink btn-sm">
              Join the waitlist
            </a>
          </div>
        </div>
      </header>

      <main>
        {/* ── hero: painted sunrise, headline, the app rising out of it ── */}
        <section className="hero">
          <div className="hero-bg" aria-hidden>
            <div className="hero-art" />
          </div>
          <div className="wrap hero-copy">
            <span className="pill" data-reveal>
              <i />
              Built for MIVA students
            </span>
            <h1 data-reveal>
              Your course, <em>answered.</em>
            </h1>
            <p className="lede" data-reveal>
              Ask anything about your lectures and get answers from your own
              course notes, with the source on every line. Then turn them into
              quizzes, flashcards and a list of what&apos;s due.
            </p>
            <div data-reveal>
              <WaitlistForm source="landing-hero" />
            </div>
          </div>

          <div className="hero-stage">
            <div className="float-card left" data-reveal aria-hidden>
              <small>From your notes</small>
              <strong>COS101 · Week 2: Anatomy of a computer</strong>
              <span className="src-chip">S1 · Lecture notes</span>
            </div>
            <div className="browser hero-window" data-reveal>
              <div className="browser-bar" aria-hidden>
                <div className="browser-dots">
                  <i />
                  <i />
                  <i />
                </div>
                <div className="browser-url">askly.app</div>
              </div>
              <Image
                src="/landing/screens/desktop-answer-light.webp"
                alt="Askly answering a question about the parts of a computer system, with sources from the student's course notes"
                width={1440}
                height={900}
                sizes="(max-width: 1020px) 100vw, 980px"
                priority
              />
            </div>
            <div className="float-card right" data-reveal aria-hidden>
              <small>Due Friday</small>
              <strong>COS102 Assignment 2</strong>
              <span
                className="src-chip"
                style={{ background: "#fde6da", color: "#ff5a1f" }}
              >
                3 days left
              </span>
            </div>
            <Phone
              src="/landing/screens/mobile-flashcards-light.webp"
              alt=""
              className="hero-phone"
              eager
            />
          </div>
        </section>

        {/* ── statement + numbers ── */}
        <section className="statement">
          <div className="wrap">
            <div className="ornament" aria-hidden>
              <span />
              <i />
              <span />
            </div>
            <p className="big-line" data-reveal>
              Most study tools answer from the whole internet. Askly answers
              from <b>your</b> lectures, shows <b>exactly</b> where each answer
              came from, and reminds you <b>before</b> things are due.
            </p>
            <div className="stats" data-reveal>
              <div>
                <strong>1</strong>
                <span>click to capture a lesson</span>
              </div>
              <div>
                <strong>4</strong>
                <span>kinds of lessons: video, PDF, quiz, assignment</span>
              </div>
              <div>
                <strong>
                  24<em>/7</em>
                </strong>
                <span>a tutor that knows your course</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── bento features ── */}
        <section id="features">
          <div className="wrap">
            <div className="sec-head" data-reveal>
              <h2>
                Everything you need to <em>keep up</em>
              </h2>
              <p className="sub">
                From the first lecture to exam week, Askly turns what you were
                taught into what you need next.
              </p>
            </div>
            <div className="bento">
              <article className="bento-card" data-reveal>
                <div className="bento-copy">
                  <h3>Ask your course anything</h3>
                  <p>
                    Like a classmate who never missed a lecture. Ask in your own
                    words and get a clear answer, at any hour.
                  </p>
                </div>
                <div className="bento-art">
                  <Image
                    src="/landing/art/chat.webp"
                    alt=""
                    width={800}
                    height={1000}
                    sizes="380px"
                  />
                  <div className="glass chat" aria-hidden>
                    <span className="me">
                      What&apos;s the difference between RAM and ROM?
                    </span>
                    <span className="ai">
                      RAM holds what the CPU is working on and clears when the
                      power goes off. ROM keeps the start-up instructions.
                      <span className="cite">S1</span>
                    </span>
                  </div>
                </div>
              </article>

              <article
                className="bento-card"
                data-reveal
                style={{ ["--d" as string]: "80ms" }}
              >
                <div className="bento-copy">
                  <h3>Answers you can check</h3>
                  <p>
                    Every answer cites the lecture, note or slide it came from.
                    Tap a source to read the exact passage.
                  </p>
                </div>
                <div className="bento-art">
                  <Image
                    src="/landing/art/lens.webp"
                    alt=""
                    width={800}
                    height={1000}
                    sizes="380px"
                  />
                  <div className="glass source" aria-hidden>
                    <small>
                      <i className="dot" style={{ background: "#3f88bf" }} />
                      S1 · COS101 Week 1
                    </small>
                    <q>
                      The second generation of computers replaced vacuum tubes
                      with transistors.
                    </q>
                  </div>
                </div>
              </article>

              <article
                className="bento-card"
                data-reveal
                style={{ ["--d" as string]: "160ms" }}
              >
                <div className="bento-copy">
                  <h3>Quizzes and flashcards in one tap</h3>
                  <p>
                    Turn any lesson into a practice quiz or a deck. Askly brings
                    cards back just before you&apos;d forget them.
                  </p>
                </div>
                <div className="bento-art" aria-hidden>
                  <div className="deck-art">
                    <div className="fc" />
                    <div className="fc" />
                    <div className="fc">
                      <small>COS101 · 3 of 12</small>
                      <p>What does the ALU do?</p>
                      <div className="fc-foot">
                        <span className="on" />
                        <span className="on" />
                        <span className="on" />
                        <span />
                        <span />
                      </div>
                    </div>
                  </div>
                </div>
              </article>

              <article
                className="bento-card"
                data-reveal
                style={{ ["--d" as string]: "240ms" }}
              >
                <div className="bento-copy">
                  <h3>Every deadline, in one list</h3>
                  <p>
                    Assignment and quiz dates come in with your captures. Add
                    your own too, and just ask Askly what&apos;s due.
                  </p>
                </div>
                <div className="bento-art" aria-hidden>
                  <div className="cal-art">
                    <div className="cal">
                      <div className="cal-head">
                        <b>This week</b>
                        <span>3 due</span>
                      </div>
                      <ul>
                        <li className="urgent">
                          <i
                            className="dot"
                            style={{ background: "#ff5a1f" }}
                          />
                          COS102 Assignment 2<em>Tomorrow</em>
                        </li>
                        <li>
                          <i
                            className="dot"
                            style={{ background: "#3f88bf" }}
                          />
                          MTH101 Quiz 3<em>Thu</em>
                        </li>
                        <li>
                          <i
                            className="dot"
                            style={{ background: "#3a9467" }}
                          />
                          GST111 Essay<em>Sat</em>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* ── capture with Chrome ── */}
        <section id="capture" className="journey">
          <div className="wrap">
            <div className="journey-panel">
              <div className="sec-head" data-reveal>
                <p className="eyebrow">The Chrome extension</p>
                <h2>
                  Capture a lesson in <em>one click</em>
                </h2>
                <p className="sub">
                  Askly Capture saves your lessons from the MIVA LMS, so every
                  answer comes from what you were actually taught.
                </p>
              </div>
              <ol className="steps">
                <li data-reveal style={{ ["--d" as string]: "0ms" }}>
                  <span className="step-n">1</span>
                  <h3>Add it to Chrome</h3>
                  <p>
                    Install Askly Capture, pin it to your toolbar, and sign in
                    with your Askly email and password.
                  </p>
                  <div className="mock" aria-hidden>
                    <div className="mock-bar">
                      <div className="url">chrome://extensions</div>
                      <span className="ext-icon pulse">a</span>
                    </div>
                    <div className="mock-body">
                      <div className="mock-head">
                        <span className="ext-icon">a</span>
                        Askly Capture
                      </div>
                      <p className="mock-muted">
                        Sign in to save lessons to Askly.
                      </p>
                      <div className="mock-field">
                        <span>Email</span>you@miva.edu.ng
                      </div>
                      <div className="mock-btn">Sign in</div>
                    </div>
                  </div>
                </li>
                <li data-reveal style={{ ["--d" as string]: "120ms" }}>
                  <span className="step-n">2</span>
                  <h3>Open any lesson</h3>
                  <p>
                    Go to a lecture video, PDF, quiz or assignment on the LMS.
                    The extension spots it and fills in the course and week.
                  </p>
                  <div className="mock" aria-hidden>
                    <div className="mock-bar">
                      <div className="url">lms.miva.university/mod/page</div>
                      <span className="ext-icon">a</span>
                    </div>
                    <div className="mock-body">
                      <span className="mock-badge">
                        <i className="dot" style={{ background: "#3a9467" }} />
                        Video lesson found
                      </span>
                      <div className="mock-video" />
                      <div className="mock-lines">
                        <span style={{ width: "90%" }} />
                        <span style={{ width: "70%" }} />
                      </div>
                    </div>
                  </div>
                </li>
                <li data-reveal style={{ ["--d" as string]: "240ms" }}>
                  <span className="step-n">3</span>
                  <h3>Press Capture</h3>
                  <p>
                    Askly transcribes and reads it in the background. In a few
                    minutes you can ask about it, with sources.
                  </p>
                  <div className="mock" aria-hidden>
                    <div className="mock-body">
                      <div className="mock-head">
                        <span className="ext-icon">a</span>
                        Askly Capture
                      </div>
                      <div className="mock-field">
                        <span>Course</span>COS101
                      </div>
                      <div className="mock-field">
                        <span>Week</span>2
                      </div>
                      <div className="mock-field">
                        <span>Lesson</span>Anatomy of a computer
                      </div>
                      <div className="mock-progress">
                        <i />
                      </div>
                      <div className="mock-btn done">Captured ✓</div>
                    </div>
                  </div>
                </li>
              </ol>
              <div className="capture-cta" data-reveal>
                {INSTALL_URL ? (
                  <a
                    href={INSTALL_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ink"
                  >
                    Add Askly Capture to Chrome
                  </a>
                ) : (
                  <a href="#join" className="btn btn-ink">
                    Get early access
                  </a>
                )}
                <p className="fine">
                  Works on the MIVA LMS in Google Chrome on a laptop or desktop.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── revision (ink) ── */}
        <section>
          <div className="wrap">
            <div className="ink-band" data-reveal>
              <div>
                <p className="eyebrow">Revision that sticks</p>
                <h2>
                  Remember it on <em>exam day.</em>
                </h2>
                <p className="sub">
                  Save any set of flashcards to a deck. Askly spaces your
                  reviews, so the cards you miss come back sooner and the ones
                  you know wait longer.
                </p>
              </div>
              <div className="review-card" aria-hidden>
                <small>COS101 · Anatomy of a computer</small>
                <p className="review-q">
                  What cycle does the CPU repeat for every instruction?
                </p>
                <div className="review-a">
                  Fetch, decode, execute: it reads the instruction, works out
                  what it means, then carries it out.
                </div>
                <div className="review-btns">
                  <span>Again</span>
                  <span>Got it</span>
                </div>
                <div className="review-next">
                  <span>4 of 12 reviewed</span>
                  <span>
                    Next review <b>in 3 days</b>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── the app, screen by screen ── */}
        <section className="screens-sec">
          <div className="wrap">
            <div className="sec-head" data-reveal>
              <h2>
                Calm, <em>clear</em>, and on your phone
              </h2>
              <p className="sub">
                Built for a quick question between lectures, not an hour of
                scrolling.
              </p>
            </div>
          </div>
          <div className="screens" data-reveal>
            {SCREENS.map((s) => (
              <figure key={s.src} className="screen">
                <Phone src={s.src} alt={`Askly: ${s.label}`} />
                <figcaption>{s.label}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* ── trust ── */}
        <section>
          <div className="wrap">
            <div className="sec-head" data-reveal>
              <h2>
                Your notes stay <em>yours</em>
              </h2>
              <p className="sub">
                Askly is built to help you learn your course, not to replace it.
              </p>
            </div>
            <div className="trust-grid">
              {[
                {
                  icon: BookOpenCheck,
                  h: "Only your courses",
                  p: "Askly reads content for the courses you've added, and nothing else.",
                },
                {
                  icon: FileSearch,
                  h: "Sources, not guesses",
                  p: "Every answer links to the note it came from. If your materials don't cover it, Askly tells you.",
                },
                {
                  icon: Trash2,
                  h: "Remove anything",
                  p: "Delete a capture whenever you like, right from My Courses.",
                },
              ].map((c, i) => (
                <div
                  key={c.h}
                  className="trust-card"
                  data-reveal
                  style={{ ["--d" as string]: `${i * 80}ms` }}
                >
                  <span className="glyph" aria-hidden>
                    <c.icon size={20} strokeWidth={1.8} />
                  </span>
                  <h3>{c.h}</h3>
                  <p>{c.p}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── faq ── */}
        <section id="faq">
          <div className="wrap narrow">
            <div className="sec-head" data-reveal>
              <h2>
                Questions, <em>answered</em>
              </h2>
              <p className="sub">
                Everything you might want to know before your first lesson.
              </p>
            </div>
            <div className="faq" data-reveal>
              {FAQ.map((f, i) => (
                <details key={f.q} open={i === 0}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── join, over the meadow (the footer continues the painting) ── */}
        <section id="join" className="closing">
          <div className="closing-art" aria-hidden />
          <div className="wrap">
            <div className="sec-head" data-reveal>
              <h2>
                Study smarter. <em>Stress less.</em>
              </h2>
              <p className="sub">
                Join the waitlist and be among the first students in.
              </p>
            </div>
            <div className="join-card" data-reveal>
              <p className="eyebrow">Early access</p>
              <p className="join-line">
                Your course, <em>answered</em>
              </p>
              <ul>
                <li>Answers from your own lectures, with sources</li>
                <li>Quizzes and flashcards from any lesson</li>
                <li>Every deadline in one list</li>
                <li>One-click capture from Chrome</li>
              </ul>
              <WaitlistForm source="landing-closing" />
            </div>
          </div>
          <footer className="footer">
            <div className="wrap">
              <div className="footer-grid">
                <div>
                  <Brand />
                  <p className="footer-note">
                    A study partner for university students. Always check
                    important details against your course materials.
                  </p>
                  <p className="footer-note">© 2026 Askly</p>
                </div>
                <nav aria-label="Product" className="footer-col">
                  <b>Product</b>
                  <a href="#features">Features</a>
                  <a href="#capture">Chrome extension</a>
                  <a href="#faq">FAQ</a>
                </nav>
                <nav aria-label="Account" className="footer-col">
                  <b>Account</b>
                  <Link href="/sign-in">Sign in</Link>
                  <a href="#join">Join the waitlist</a>
                </nav>
              </div>
            </div>
          </footer>
        </section>
      </main>

      <LandingMotion />
    </div>
  );
}
