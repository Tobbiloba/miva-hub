# XPRIZE Submission Kit — Video Script + Narrative

Companion to `GEMINI_XPRIZE_PLAN.md`. Everything here is grounded in screens
that exist and demo state that is already seeded — no vaporware shots.

**Deadlines:** feature freeze Aug 11 · submit Aug 15 (buffer) · hard deadline Aug 17, 1:00 PM PT.

---

## 1. The 3-minute video — production script

Rules: <3 minutes, must show **AI executing decisions in production**. Record
at 1080p+, real product, real data. One narrator voice (calm, fast), captions
burned in (judges skim muted).

### Shot list

| # | Time | Screen / footage | Narration + notes |
|---|------|------------------|-------------------|
| 1 | 0:00–0:15 | Stock/phone footage: packed Nigerian lecture hall → padlocked campus gate. Cut to a phone opening WhatsApp. | "One lecturer. Four hundred students. Campuses closed for months by strikes. This is university for millions of African students. So we built a university that runs itself." |
| 2 | 0:15–0:35 | **WhatsApp tutor**: student texts a COS201 question, Gemini answers citing the actual lecture slide. Then **Snap-to-Solve**: photo of handwritten work → graded with marginal annotations in seconds. | "Askly's tutor knows *your* course — your lecturer's slides, your past questions. Photograph handwritten work; Gemini grades it against the rubric in seconds." Show the confidence score + "flagged for faculty review" state once. |
| 3 | 0:35–1:00 | **Live Viva Coach** (screen + student on mic): AI examiner asks a follow-up, student answers, AI pushes back by voice, rubric score appears. | "This is a live oral exam. The examiner is Gemini — it probes, interrupts, and scores in real time." Let the AI's pushback line play unedited — this is the forward-to-a-colleague moment. |
| 4 | 1:00–1:30 | **The AI admissions officer**: /apply form submitted → cut to /admin/admissions. Show a decided application ("Admitted — account provisioned") AND the escalated one (Amina Yusuf: unfamiliar Sudanese grading system → "escalate to human", 100% confident). Admin clicks a decision. | "Applicants are verified, decided, and enrolled end-to-end by a Gemini agent. It admits most on its own. When it meets something outside policy — an unfamiliar grading system — it doesn't guess. It escalates. Humans see only the edge cases." |
| 5 | 1:30–1:55 | **/admin/ai-operations** dashboard: total decisions counter, decisions-by-type bars (grading, support, admissions, tutoring), avg confidence, human-override rate, the Recent Decisions ledger scrolling. | "Every decision the AI makes — a grade, an admission, a resolved ticket, a study plan — lands in one auditable ledger, with confidence and human overrides tracked. This is the whole company's operations, visible." |
| 6 | 1:55–2:20 | **Proactive layer**: AI Professor (Dr. Nneka Eze) office-hours voice session; the auto-generated weekly study plan ("your average score of 40% suggests…"); the credential page + public /verify link scanning to "Verified authentic". | "Each course has its own AI professor that notices struggling students and reaches out first. Completed work becomes a verifiable, AI-assessed micro-credential anyone can check." |
| 7 | 2:20–2:45 | **The business**: Paystack/Stripe dashboard, user growth chart, tenant list (tutorial center logo), 5–8s testimonial clip (real student, name + consent on file). | "Students pay ₦3,000 a month. Institutions license tenants. Real users, real revenue, acquired during the competition window." |
| 8 | 2:45–3:00 | Logo card over the ops dashboard still ticking. | "Humans set policy. Gemini runs the university. **Askly — education that scales to everyone.**" |

### Pre-record checklist
- [ ] Seed a fresh escalated application + one auto-admitted one (states verified working 2026-07-08)
- [ ] Confirm ops dashboard numbers are non-trivial (>50 decisions reads better than 24 — accumulate real usage before filming)
- [ ] Viva + office-hours voice takes need a human with a mic (blocked item — schedule)
- [ ] Film Paystack dashboard only after first arms-length payments land
- [ ] Testimonial consent + contact info captured before using the clip
- [ ] Mobile shots use a real phone frame (mobile nav verified working post-91497f6)

---

## 2. The AI-vs-human narrative (500–1,000 words) — draft

> Submission requires 500–1,000 words on what AI does vs. what humans do.
> Current draft ~700 words. Update the numbers in [brackets] with real figures
> the week of submission — every claim must match the exported ledger.

---

Askly is an AI-native university platform for African higher education, built
and launched during the competition window on top of our own open LMS
scaffold. The scaffold — auth, multi-tenant schema, course CRUD — predates the
window and is disclosed as such. Everything judged here — the Gemini agent
layer, the AI operations ledger, payments, and the business itself — was built
inside the window, with dated commit history on the competition branch.

**The division of labor is simple: humans set policy; Gemini executes.**

**What the AI runs.** Admissions is operated end-to-end by a Gemini agent. An
applicant submits results (typed or photographed); the agent reads the
documents multimodally, cross-checks the typed grades against the uploaded
transcript, evaluates them against the university's published admission
policy, and issues the decision — admit, waitlist, or reject. On admit, it
provisions the student account and sends the offer without human involvement.
[N]% of applications in our production window were decided entirely by the
agent.

Grading is AI-operated with human-on-the-loop governance. Students photograph
handwritten work; Gemini grades against the instructor's rubric with marginal
annotations and a confidence score. Grades above the confidence threshold are
issued directly; below it, they queue for faculty review. Of [N] grades issued
in production, [N]% were AI-issued, with an appeal-overturn rate of [N]%.

Teaching itself is agentic. Every course has a persistent AI professor with
the full course corpus — slides, readings, past questions — in Gemini's long
context. It holds real-time voice office hours through the Live API, conducts
oral viva examinations that probe and score against rubrics, and acts
proactively: when grade and engagement signals show a student slipping, the
professor reaches out first and the study planner regenerates that student's
week from live performance data. Support runs the same way: a Gemini agent
with function-calling access to our real platform APIs resolves password,
enrollment, and billing tickets, escalating [<10]% to humans.

The company's own operations are also AI-executed within policy bounds:
marketing copy and campaign scheduling, and a daily Gemini-written operations
digest of users, revenue, and incidents.

**What humans do.** Humans write policy: admission criteria, grading rubrics,
confidence thresholds, refund rules, discount bounds, escalation triggers.
Humans handle every escalation the agents raise — and the agents are designed
to escalate rather than guess. Our favorite production example: an applicant
submitted grades in a Sudanese percentage system our policy didn't map to the
Nigerian O'Level credit system. The admissions agent, at full confidence,
declined to decide and escalated to a human with its complete reasoning
attached. Humans also close B2B institutional deals, sign off on credential
issuance disputes, and own final academic accountability.

**Governance is the product, not an afterthought.** Every AI decision — every
grade, admission, resolved ticket, generated study plan, issued credential —
is written to an operations ledger recording the actor, model, input,
decision, confidence, and any human override. The ledger is visible to
university administrators on a live dashboard and exportable as evidence.
Over the window: [N] total AI decisions, [N]% average confidence, [N]% human
override rate, [N]% support escalation rate. Issued micro-credentials carry a
public verification page exposing the AI-assessed competency evidence behind
each award, so the credential's integrity is inspectable by anyone.

**Why this matters here.** Nigeria's lecturer-to-student ratios routinely
exceed 1:100, and strike closures erase whole semesters. The binding
constraint on African higher education is not student demand — it is human
operational capacity: grading hands, admissions clerks, office hours,
support desks. Askly's answer is not an AI feature bolted onto that broken
workflow; it is the workflow, re-founded on AI execution with human policy
and audit. That is what lets one platform deliver personalized tutoring,
real oral examination, verifiable credentials, and same-minute admissions at
a price point (₦3,000/month) that students where we operate can actually pay
— and lets the business itself run with a team you can count on one hand.

---

## 3. Evidence compilation checklist (assemble W6, sources exist today)

| Evidence | Source | Status |
|---|---|---|
| <3-min video | Script above | blocked on mic sessions + revenue shots |
| 500–1,000 word narrative | §2 above | draft done; fill [N]s at submission |
| Repo access | Invite testing@devpost.com + judging@hacker.fund | pending (user action) |
| Agent logs | AI-ops ledger export CSV (button live on /admin/ai-operations) | working |
| Gemini API records | AI Studio / Cloud console usage screenshots, weekly | ongoing |
| Revenue evidence | Paystack + Stripe exports | blocked on live payments |
| Expense/marketing docs | Ad receipts, Cloud invoices, ambassador payouts | collect as incurred |
| Testimonials + contacts | In-app collection flow | needs real users |
| Google Cloud product | Cloud Run deploy | blocked on `gcloud auth login` |
| Devpost registration | devpost.com | pending (user action) |
