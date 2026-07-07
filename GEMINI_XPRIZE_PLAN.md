# Build with Gemini XPRIZE — Battle Plan for Askly

**Competition:** Build with Gemini XPRIZE ($2,000,000 pool, backed by Google)
**Category:** Education & Human Potential ($50k category prize; grand prize $500k)
**Deadline:** **August 17, 2026, 1:00 PM PT** — ~6 weeks from today (Jul 7)
**Judging (equal weight):** Business Viability · AI-Native Operations · Category Impact

---

## 1. Read the rules like a lawyer — what actually wins

This is **not a demo hackathon**. To reach the final you must:

1. **Launch a real business** during the window (May 19 – Aug 17, 2026)
2. **Acquire real users** (arms-length, not friends/family — related-party revenue is disclosed separately)
3. **Generate real revenue** (Stripe/Paystack dashboard, bank statement, P&L required as evidence)
4. Show **AI live in production executing key business decisions** — not AI as a feature, AI as the *operator*
5. Use **Gemini API for at least one LLM call** in the deployed app + **at least one Google Cloud product**

**Submission package:** repo access (testing@devpost.com + judging@hacker.fund), <3-min video of AI executing decisions in production, 500–1,000 word narrative on AI-vs-human roles, revenue evidence, expense/marketing docs, agent logs + API records, customer testimonials with contact info.

**The pre-existing code problem (must handle honestly):** Projects must be "newly created during the submission window"; pre-existing frameworks/code must be *explained* and *built upon*. Our strategy: position Askly's existing codebase as the open-source-style foundation ("we built on our own LMS scaffold") and make everything competition-worthy — the Gemini agent layer, the AI-native operations, the business itself — **demonstrably built inside the window with commit history to prove it**. Start a clean, dated branch/repo now; every Gemini feature lands after today with clear commits.

**What kills most entries:** great demos with zero users and zero dollars. What wins: a smaller product that is *actually alive* — 200 paying students beats 50 unlaunched features.

---

## 2. Positioning — the one-liner

> **"Askly: the university that runs itself."**
> An AI-native university platform for African higher education where Gemini agents don't just tutor students — they run admissions, grading, support, scheduling, and even the company's own marketing and pricing. Humans set policy; AI executes.

Why this framing wins all three criteria:

- **Category Impact:** Africa's lecturer-to-student ratios are catastrophic (Nigeria: often 1:100+). "Personalized learning + alternative credentialing + workforce upskilling" is literally the category definition. A platform serving students where universities are oversubscribed and strikes shut campuses for months is a *fundamental workflow redefinition*, not an incremental tool.
- **AI-Native Operations:** we don't just ship an AI tutor — Gemini agents make *operational decisions*: grading with appeal handling, enrollment approvals, support triage, content generation, marketing copy + campaign decisions, churn interventions. That's the "AI executes key decisions" bar most teams will miss.
- **Business Viability:** freemium student subscriptions (₦/monthly via Paystack + Stripe for diaspora) + B2B tenant licensing to tutorial centers/private institutions. Multi-tenant architecture already exists — every tenant is a revenue line.

---

## 3. Compliance checklist (do these first, non-negotiable)

- [ ] **Gemini as the core brain.** Swap/add Gemini 2.5 Pro + Flash as the primary provider (`@google/genai`). Keep multi-provider, but every core flow must hit Gemini. Log every call — API usage records are required evidence.
- [ ] **Google Cloud product in production.** Deploy on **Cloud Run** (or at minimum use Vertex AI / Cloud Storage / Firebase). Pick one, screenshot the dashboards.
- [ ] **Clean competition branch/repo** created this week; all XPRIZE work lands there with dated commits.
- [ ] **Payments live**: Paystack (Nigeria) + Stripe (international). Revenue evidence must be exportable.
- [ ] **Analytics + agent audit log** from day one: every AI decision recorded (who/what/why/when) — this doubles as the "agent logs" evidence AND a governance story for judges.
- [ ] **Devpost registration** + team roster locked.

---

## 4. Feature roadmap — tiered by "wins the judging" value

### P0 — The AI-Native Core (weeks 1–2) — *must ship, this IS the submission*

| # | Feature | Gemini capability used | Why it wins |
|---|---------|------------------------|-------------|
| 1 | **Gemini Tutor with whole-course context** — ingest an entire course (PDFs, slides, past questions) into Gemini's 1M+ token context; the tutor answers *from the student's actual syllabus*, cites the exact page/slide | Long context + File API | Every rival will have "chat with AI." Ours knows *your* course, *your* lecturer's slides, *your* past exam questions. |
| 2 | **Snap-to-Solve grading** — student photographs handwritten work; Gemini grades against the rubric, shows marginal annotations, and flags for faculty review above a confidence threshold | Multimodal vision + structured output | Visceral 10-second demo moment for the 3-min video. AI making a real decision (a grade) with human-on-the-loop governance. |
| 3 | **AI Admissions & Enrollment Officer** — applicant submits documents; a Gemini agent verifies transcripts, checks prerequisites, makes the admit/waitlist/reject decision, sends the offer, and provisions the account. Human reviews only escalations | Multimodal doc understanding + function calling + agent loop | This is the purest "AI executes key business decisions" demo — an agent that *onboards paying customers end-to-end*. |
| 4 | **AI Support Desk** — Gemini agent resolves student tickets (password, enrollment, billing) with tool access to the actual platform APIs; escalates <10% to humans; full audit trail | Function calling against our own MCP tools | "AI-native operations" — the business support function is AI. We already have an MCP tool layer; the agent gets real levers. |
| 5 | **Payments + subscription tiers** — Free (limited tutor msgs) / Student Pro ₦2,500–5,000/mo / Institution licensing | — | No revenue = no prize. Ship in week 1. |

### P1 — The "Crazy Guys" Layer (weeks 2–4) — *what makes judges forward the video to colleagues*

| # | Feature | Gemini capability | The wow |
|---|---------|-------------------|---------|
| 6 | **Live Viva / Oral Exam Coach** — real-time voice conversation: Gemini conducts a mock oral defense or exam viva on the student's actual course material, interrupts, probes, scores rubric-based | **Gemini Live API** (native audio, real-time) | Nobody else will have a *real-time examiner*. Killer video moment: student defending a thesis to an AI that pushes back. |
| 7 | **Lecture-to-Everything pipeline** — upload a 2-hour lecture recording → Gemini produces: timestamped notes, flashcards, a quiz, a 5-min audio recap ("podcast mode"), and updates the tutor's context | Video/audio understanding + native audio out (TTS) | NotebookLM-grade magic, but wired into an actual degree program. Solves the #1 African bandwidth problem: 2-hr video → 5-min audio. |
| 8 | **AI Professor per course** — each course gets a persistent agent with personality, office hours (Live API voice), that proactively messages struggling students (detected from grade/engagement signals) | Live API + long context + scheduled agent runs | Proactive AI, not reactive chat. "The AI noticed you failed quiz 3 and scheduled a session" — demo gold. |
| 9 | **Personalized learning paths + spaced repetition** — Gemini continuously re-plans each student's weekly study plan from performance data; adaptive difficulty | Structured output + reasoning | "Personalized learning" is verbatim in the category definition. |
| 10 | **WhatsApp learning channel** — full tutor + quiz + reminders over WhatsApp (where African students actually live); low-bandwidth mode | Gemini via WhatsApp Business API | Massive distribution + category-impact story. Also our cheapest user-acquisition channel. |
| 11 | **Verifiable AI-graded micro-credentials** — completion certificates with a public verification page showing the AI-assessed competency evidence | Structured assessment + public ledger page | "Alternative credentialing" — verbatim category language again. |

### P2 — Moonshots (weeks 4–5, only if P0+P1 are stable) — *pick max two*

| # | Feature | Why |
|---|---------|-----|
| 12 | **AI-generated explainer videos** — Veo/Imagen turns any concept the student struggles with into a 30-sec visual explainer | Pure spectacle for the video; Google will love their own stack being showcased |
| 13 | **Integrity Sentinel** — multimodal exam proctoring: Gemini watches submissions for AI-written text patterns, plagiarism, and (opt-in) camera-based exam monitoring | Addresses the elephant in the room ("doesn't AI enable cheating?") — judges will ask |
| 14 | **Career Bridge** — Gemini mock interviews (Live API), CV builder from actual coursework evidence, matching to real job posts | "Workforce upskilling" — the third verbatim category phrase |
| 15 | **The Self-Running Company Dashboard** — public/judge-visible dashboard showing every decision AI made this week: N students admitted, N assignments graded, N tickets resolved, N marketing posts published, N churn saves — with human-override counts | This is the *thesis made visible*. Ship a lightweight version even if P2 slips — it's the centerpiece of the 3-min video. |

### The meta-feature: AI runs Askly-the-company too

The judges' rubric says "AI governance scope across operations." So beyond the product:

- **Marketing agent:** Gemini drafts + schedules all social/WhatsApp/email campaigns, A/B tests copy, reallocates the (small) ad budget weekly. Log every decision.
- **Pricing/churn agent:** monitors usage, issues win-back discounts within policy bounds.
- **Ops digest:** daily Gemini-written investor-style report of the business (users, revenue, incidents) — screenshot these for the submission narrative.

Humans (you) approve policy and handle escalations. Everything else: agents. **Document this split explicitly — it's the required 500–1,000 word narrative, pre-written.**

---

## 5. Business viability plan — the part most teams skip

**Target users (arms-length, provable):**
1. Nigerian university students (UNILAG, UI, OAU, MIVA, NOUN) — exam season & resumption timing is favorable
2. Tutorial/prep centers (JAMB/WAEC/professional exams) — B2B tenant licensing, faster revenue
3. Diaspora students — Stripe, higher ARPU

**Pricing hypothesis:**
- Free tier: 20 tutor messages/mo, 1 course
- **Student Pro: ₦3,000/mo (~$2)** — unlimited tutor, Snap-to-Solve, audio recaps, viva coach
- **Center/Institution: ₦150k–500k/mo per tenant** — white-label, admin, analytics

**GTM (weeks 1–6, AI-executed where possible):**
- Campus ambassador program (rev-share codes — trackable arms-length revenue)
- WhatsApp/Telegram student-group seeding with free-tier viral loops ("share your AI-graded result card")
- 2–3 tutorial-center pilot deals closed by *you*, onboarded by the AI admissions agent (film this)
- TikTok/X clips of the Live viva coach and Snap-to-Solve — these features are inherently viral

**Targets by Aug 17 (be realistic, judges value trajectory + sustainability):**
- 1,000–5,000 registered users, 100–300 paying
- ₦500k–2M (~$300–1,300+) verifiable revenue + 1–2 B2B contracts
- <10% human escalation rate on support; >80% of grades issued by AI with <5% appeal overturn rate ← *these operational metrics are as persuasive as revenue*

---

## 6. Evidence pipeline (build in, don't scramble later)

- **Agent decision ledger** (DB table + admin UI): every AI decision, model, input hash, output, confidence, human override — exportable
- Gemini API usage dashboard screenshots, weekly
- Paystack/Stripe exports, weekly
- Testimonial collection flow in-app (with consent + contact info — required)
- Weekly 30-sec screen recordings of the live product — raw material for the 3-min video

---

## 7. Six-week timeline

| Week | Focus |
|------|-------|
| **W1 (Jul 7–13)** | Compliance: Gemini provider integration, Cloud Run deploy, Paystack/Stripe, competition branch, decision ledger. Ship P0-1 (whole-course tutor) + P0-5 (payments) |
| **W2 (Jul 14–20)** | P0-2 Snap-to-Solve, P0-3 AI Admissions Officer, P0-4 Support Desk. **Public launch + first ambassador cohort** |
| **W3 (Jul 21–27)** | P1-6 Live Viva Coach, P1-7 Lecture-to-Everything, P1-10 WhatsApp channel. First B2B pilot signed |
| **W4 (Jul 28–Aug 3)** | P1-8 AI Professor, P1-9 learning paths, P1-11 credentials. Marketing agent live. Growth push |
| **W5 (Aug 4–10)** | Max two P2 items (recommend #15 dashboard + #13 integrity). Hardening: /tenant-audit, /ui-pass, load test. Testimonials |
| **W6 (Aug 11–17)** | **Feature freeze Aug 11.** Video production, narrative writing, evidence compilation, repo access grants, submit **Aug 15** (2-day buffer) |

---

## 8. The 3-minute video script (draft the product around this)

1. **0:00–0:20** — Problem: one lecturer, 400 students, campus closed by strikes. A student opens Askly on WhatsApp.
2. **0:20–1:00** — Snap-to-Solve: handwritten math photographed → graded with annotations in seconds. Live Viva: AI examiner pushes back on her answer *by voice*.
3. **1:00–1:50** — The self-running university: AI admissions officer verifies documents and enrolls a paying student end-to-end; support agent resolves a billing ticket; the decision ledger scrolls.
4. **1:50–2:30** — The business: Paystack dashboard, user growth chart, tutorial-center tenant, testimonial clip.
5. **2:30–3:00** — "Humans set policy. Gemini runs the university. Askly — education that scales to everyone."

---

## 9. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| "Pre-existing project" challenge | Dated competition branch; narrative explicitly discloses the scaffold and itemizes what was built in-window (which will be: the entire Gemini agent layer, ops agents, payments, GTM — i.e., everything judged) |
| Zero/low revenue by deadline | B2B tutorial-center deals are the fastest path to real money; start outreach W1, not W4 |
| Feature sprawl (the classic failure) | P0 is sacred; P1 items are cut before P0 quality slips; feature freeze Aug 11 is hard |
| AI grading errors → trust damage | Confidence thresholds + human-on-the-loop + appeals flow; frame governance as a *feature* to judges |
| Gemini rate limits/cost at demo time | Flash for high-volume paths, Pro for grading/admissions; cache course-context; log costs (expense evidence anyway) |
| Multi-tenant data leaks under press | Run /tenant-audit before launch and before submission — this codebase's known failure class |

---

## 10. Immediate next actions (this week)

1. Register on Devpost, lock the team + category
2. Create competition branch; integrate `@google/genai` (Gemini 2.5 Pro/Flash) as primary provider
3. Deploy to Cloud Run; wire Paystack + Stripe
4. Build the agent decision ledger (schema + write path)
5. Ship the whole-course-context tutor (P0-1)
6. Start B2B outreach to 10 tutorial centers
