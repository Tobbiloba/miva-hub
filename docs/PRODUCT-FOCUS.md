# Askly — Product Focus: What Students Get

_Date: 2026-10-09 · Status: decision document · Supersedes the keep/cut list in `ARCHITECTURE-AUDIT.md` §4 for the student launch_

> **The one sentence.** Askly is the study partner that has already read your course content: you
> capture it with the extension, then you ask, revise, get tested and stay on top of deadlines, all
> from one chat.

---

## 1. The rules for deciding what ships

1. **Chat first.** If a feature can be a chat action, it is a chat action. A page only exists when
   the student needs to *come back* to something: saved decks, deadlines, a logbook.
2. **Their content, not generic content.** Every feature must get better because Askly has read
   *their* materials. If ChatGPT does it equally well, it is not a priority.
3. **The extension is the front door.** No content means no product. Anything that makes capture
   easier or more visible outranks anything new.
4. **Fewer, finished.** One feature that works every time beats five that work in the demo.
5. **Help them do the work, don't do it for them.** Askly explains, structures, reviews and quizzes.
   It doesn't ghostwrite submissions. That protects the student, and it is the only stance a
   university will accept later.

---

## 2. Priorities at a glance

| Tier | What | Why now |
|---|---|---|
| **P0: Launch** | Capture → grounded chat → quiz / flashcards / exam / assignment help → deadlines | This is the product. Without it nothing else matters. |
| **P1: Weeks after launch** | Study planner, exam prep mode, CGPA tracker, weekly brief | Turns a tool they use before exams into one they open every week. |
| **P2: Next term** | SIWES logbook + technical report, group project space, final-year project companion | Big pain points with no good tool today. Strong word-of-mouth. |
| **Archived** | Everything else (see §6) | Hidden behind a flag, not deleted. |

---

## 3. P0: The launch product

The loop a student has to experience in their **first 10 minutes**:

> install extension → capture one lecture → ask a question about it → get an answer that cites the
> lecture → turn it into a quiz → see their next deadline.

### 3.1 Capture (Chrome extension)
- **What exists:** captures LMS videos (Vimeo transcripts), PDFs, quiz pages and assignment pages.
  Bearer-token auth (v0.3.0).
- **Gaps to close before launch:**
  - **Onboarding:** after sign-up, the first screen must be "install the extension", with a check
    that turns green on the first capture. Today nothing tells a new student this is step one.
  - **Status the student can see:** "12 items captured · 2 processing · 1 failed (retry)". Failed and
    stuck capture jobs need recovery (phase 5 ops work).
  - **A "Capture this whole course" button**, so they don't have to capture page by page.
    Highest-leverage extension change.
  - **Distribution:** Chrome Web Store listing, plus the final domain for the extension origin.

### 3.2 Grounded chat
- **What exists:** `search-course-materials` (pgvector over the student's enrolled + own captured
  content), citations `[S1]..[Sn]`, enrollment scoping, model allowlist.
- **Gaps:**
  - **Course picker in the composer** ("Ask about: COS102 ▾"). This narrows retrieval and makes
    grounding visible.
  - **Clickable citations** that open the source at the passage, or the timestamp for video.
  - **Honest empty state:** "I don't have COS102 materials yet. Capture them with the extension →".
    No guessing.

### 3.3 Practice: quiz, flashcards, mock exam
- **What exists:** the chat tools `createQuiz`, `createFlashcards` and `createExam` (timed). There
  are also saved flashcard decks with spaced repetition (`/api/flashcards/**`, review intervals).
- **Gap:** **the chat's flashcards and the saved decks aren't connected.** Nothing in the chat
  tools writes to `flashcard_deck`, so a deck made in chat is lost when the thread scrolls away.
  - Add a **"Save deck"** action on chat flashcards.
  - Keep one **Flashcards** page: "due today", review.
  - Quiz results feed a simple "weak topics" list that the chat can use: "Quiz me on what I keep
    getting wrong".

### 3.4 Assignments and deadlines
- **What exists:** the extension captures assignment pages, including due dates, as
  `course_material` (`materialType = assignment_external`). The chat tool
  `get-upcoming-assignments` reads the **faculty `assignment` table**.
- **Gap:** captured LMS deadlines never reach the deadline tool. A student who captured three
  assignments still gets "no upcoming assignments" (local data shows this today).
  - Root-cause fix: the tracker reads captured assignments (due dates from capture metadata).
  - Add a **Deadlines** view: this week / next week / overdue.
- **Assignment help, the right way:** break down the brief, map it to the relevant lecture passages,
  outline, then review the student's own draft against the brief and rubric. No "write my
  assignment" button.

### 3.5 Account and billing
- **What exists:** Paystack checkout, paywall (`checkPaidAccess`), trial.
- **Gap:** the prod rollout (env vars, migrations 0041/0042, live key) is phase 6, already planned.

**P0 student navigation (the entire sidebar):**

```
Chat  ·  My Courses (captured content)  ·  Deadlines  ·  Flashcards  ·  Billing  ·  Profile
```

---

## 4. P1: Organize their study life (weeks after launch)

These turn Askly from "the thing I open before exams" into "the thing I open every Monday".

| Feature | What the student gets | Built on |
|---|---|---|
| **Study planner** | "I have exams in 3 weeks, plan my revision." It produces a day-by-day plan from their actual courses, deadlines and weak topics, and the chat checks in on it. | `study_plan` table + `lib/ai/study-plan.ts` exist; regenerate from deadlines + quiz results. |
| **Exam prep mode** | Pick a course: Askly builds a mock exam from the captured content plus captured LMS quiz questions, times it, marks it and explains mistakes. Past questions can be uploaded too. | `createExam` + captured `quiz` materials. |
| **CGPA tracker** | Enter grades per course (5-point Nigerian scale), see current CGPA, ask "what do I need this semester to reach a 2:1?" | New, small: one table + chat tool. Highly shareable. |
| **Weekly brief** | Monday message: deadlines this week, flashcards due, one suggested revision block. Email first; WhatsApp later if it earns its place. | Deadlines + flashcards + planner. |
| **Writing coach** | Paste a draft: get feedback on structure, clarity, argument and referencing (APA/Harvard formatting). Feedback, not rewrite. | Chat prompt + a citation-format tool. |

---

## 5. P2: The big pain points (next term)

These are where students struggle most and have no tool built for them. Each one ships as **chat +
one page**.

### 5.1 SIWES companion (logbook + technical report)
Students dread SIWES paperwork: the daily/weekly logbook gets filled from memory at the end, and the
technical report is a scramble.
- **Logbook:** a 30-second daily entry ("what did you do today?") in chat or by voice note. Askly
  turns it into a properly worded logbook entry (date, activity, skills learned) and keeps it in a
  week-by-week logbook they can export to match the ITF format.
- **Supervisor-ready weekly summaries**, generated from the daily entries.
- **Technical report builder:** chapter structure (introduction, company profile, work done, skills
  and experience, challenges, conclusion and recommendations), drafted **from their own logbook
  entries**, which is why it's theirs and not ghostwritten. Export to DOCX/PDF.
- **Reminders:** "You haven't logged since Tuesday."
- **Data:** `siwes_placement` (company, dates, supervisor) and `siwes_log_entry` (date, raw note,
  formatted entry, week).
- ⚠️ **Validate first:** which MIVA programmes need SIWES and the exact logbook/report format. Get
  a real logbook page and report template from 2–3 students before building.

### 5.2 Group project space
Group work fails on coordination: who does what, by when, and "I already did my part".
- Create a group, invite classmates by link, attach the assignment brief.
- Askly splits the brief into tasks, suggests a fair split and timeline, and tracks who has done what.
- **Shared grounded chat:** the group asks questions against the brief and the course content.
- **Contribution log:** a neutral record of who submitted what and when. It settles disputes.
- **Data:** `study_group`, `study_group_member`, `group_task`.
- Note: this is the first **multi-user** feature, so tenant and membership checks apply to every
  read and write.

### 5.3 Final-year project / seminar companion
- Topic ideas narrowed by their department and interests, then a proposal outline.
- Chapter-by-chapter structure, literature review help (find sources via web search, summarize, keep
  a reference list), and methodology explanations.
- **Milestones with supervisor deadlines**, which feed Deadlines and the weekly brief.
- Same integrity rule: Askly structures, explains and reviews. The student writes.

---

## 6. Archive (hide, don't delete)

Hide everything below behind one feature flag (`STUDENT_LAUNCH_SURFACE=lean`): nav removed, routes
redirect to `/`, APIs return 404 when the flag is on. The code and tables stay, so turning any of it
back on is a config change.

| Archive | Why |
|---|---|
| **Student SIS pages:** grades, schedule, calendar, faculty directory, announcements, notifications, progress, performance dashboard, assignment submit | They depend on the **school** entering data. Students are signing up on their own, so these pages will be empty. Empty pages make the product look broken. |
| **AI Tutor page** (`/student/tutor`) | The main chat does this now, with better retrieval. Redirect to `/`. |
| **Materials page** | Merged into **My Courses** (captured content per course). |
| **Study Plan page (old)** | Comes back as the P1 planner, chat-driven. |
| **Viva Coach, AI Professor (voice)** | Strong demos, but voice costs and reliability aren't launch-ready. Bring back after P1. |
| **Credentials + public verify** | Depends on grades and mastery data students won't have. |
| **WhatsApp tutor** | Possibly the weekly-brief channel later. Not at launch. |
| **Agents, MCP config, workflows** (inherited from the chat fork) | Power-user/developer features. Students don't need them; hide from non-admins. |
| **Faculty portal, admin SIS, admissions** | B2B product for when a university buys. Keep working (just fixed), not part of the student launch. |
| **Study Buddy MCP study tools** (7 broken) | Fix or retire: the decision is still open. The P0 features don't need them. |

---

## 7. Order of work

1. **Phase A: Lean surface.** Feature flag, a 6-item sidebar, redirects, extension onboarding step.
   _Verify:_ a fresh student sees only the P0 nav, and archived URLs redirect.
2. **Phase B: Close the P0 gaps.**
   - Captured deadlines → tracker + Deadlines view.
   - Save chat flashcards to decks.
   - Course picker + clickable citations.
   - Honest empty states.
   - Capture status + job recovery.

   _Verify:_ Playwright journey: capture → ask → cite → quiz → save deck → see deadline.
3. **Phase C: Launch.** Prod rollout (phase 6), Web Store listing, first cohort.
4. **Phase D: P1**, ordered by what the first cohort actually asks for in chat (log and read the
   questions).
5. **Phase E: P2**, starting with SIWES (after validating the format with real students), then group
   projects.

---

## 8. How we know it's working

- **Activation:** % of sign-ups who capture ≥1 item within 24h. _The number that matters most._
- **Grounding:** % of chat answers that cite at least one of the student's own sources.
- **Habit:** weekly active students; flashcards reviewed per week.
- **Value:** students who've seen ≥3 deadlines in Askly before they were due.
- **Revenue:** trial → paid conversion.

---

## 9. Open questions

- Is MIVA the only LMS at launch? The extension's content script is MIVA-specific; other schools
  mean new site adapters.
- SIWES format and which programmes need it (validate before P2).
- Pricing: do P2 features (SIWES, final-year project) belong in a higher plan?
- Study Buddy: fix or retire.
