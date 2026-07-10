# MIVA Hub — Complete Feature Inventory

What the platform does today, end to end. One university OS: an AI-native LMS
where every student gets an AI professor, every submission can be AI-graded with
human governance, and every credential is publicly verifiable.

_Last updated: 2026-07-09 (feat/onboarding). Source of truth: `src/app/` routes._

---

## 1. The AI Core (the XPRIZE story)

| Feature | What it does | Where |
| --- | --- | --- |
| **AI Professor per course** | A persona-driven AI professor for each course — office hours, tone, proactive outreach to struggling students | `/student/professor`, `api/professor` |
| **AI Chat (course-aware)** | Full chat workspace: threads, model picker (OpenAI/Anthropic/Google/Groq/xAI/OpenRouter/Ollama), tool calling, mentions, voice input, file attachments | `/chat`, `api/chat` |
| **Snap-to-Solve grading** | Student photographs handwritten work → Gemini vision grades against the rubric → auto-posts only above confidence threshold AND after the course is calibrated (5 faculty approvals); otherwise queues for review | `api/student/assignments/[id]/snap` |
| **AI grading (typed submissions)** | Same grader for regular submissions; faculty approve/adjust from a review queue | `api/faculty/grade/ai`, `/faculty/review-queue` |
| **AI decision ledger** | Every AI decision (grade, outreach, plan) recorded with model, confidence, reasoning, status (pending/approved/overridden/rejected) — full governance trail | `/admin/ai-operations` |
| **AI study plans** | Weekly personalized study plan generated from live performance signals (grades, activity, deadlines) | `/student/plan` |
| **AI Tutor** | Socratic practice tutor distinct from the professor persona | `/student/tutor` |
| **Viva (oral exams)** | AI-conducted oral examination sessions with per-session tokens and completion flow | `/student/viva` |
| **Verifiable micro-credentials** | AI-graded credentials with public verification page (QR/code) — no login needed to verify | `/student/credentials`, `/verify/[code]` |
| **Lecture Studio (faculty)** | Faculty upload lecture media → AI processes into structured study material | `/faculty/lecture-studio` |
| **Lecture Study (student)** | Students consume processed lectures as interactive study sessions | `/student/lecture-study` |
| **Flashcards** | AI-generated flashcard decks from course content | `/student/flashcards`, `api/flashcards` |
| **Custom Agents** | User-built AI agents (instructions + tools), shareable | `/agents`, `/agent/[id]` |
| **MCP integration** | Add/test/modify MCP servers; tools exposed to chat | `/mcp/*` |
| **Content ingestion (RAG)** | Course materials processed into searchable, citable knowledge the AI references in answers | `api/ingest`, `api/content`, admin processing |

## 2. Student experience

- **Dashboard** — GPA, deadlines, courses, recent grades, announcements (`/student/dashboard`)
- **Courses & materials** — enrolled courses, weeks, downloadable/streamable materials (S3+CloudFront)
- **Assignments** — list, submit (text/file), late-submission rules, Snap-to-Solve path
- **Grades & progress** — per-course grades, progress tracking (`/student/grades`, `/student/progress`)
- **Calendar & schedule** — academic calendar + personal schedule
- **Announcements & notifications** — university + course announcements, in-app notifications
- **WhatsApp companion** — chat with the AI professor over WhatsApp Cloud API (`/student/whatsapp`, `api/whatsapp`)
- **Faculty directory** (`/student/faculty`)
- **Support** (`api/support`)

## 3. Faculty experience

- **Dashboard** — teaching load, grading queue, at-risk students (`api/faculty/dashboard`)
- **Course management** — courses, weekly content, materials upload
- **Assignments** — create (with rubrics), manage, grade manually or via AI
- **Review queue** — approve/adjust/reject AI-suggested grades (feeds calibration)
- **Grades** — gradebook per course
- **Students** — roster views, per-student performance
- **Announcements, schedule, materials** — standard LMS surfaces
- **Lecture Studio** — see AI Core

## 4. University admin

- **Analytics dashboard** — enrollment, engagement, performance (tenant-scoped)
- **AI Operations** — the decision ledger UI: filter, inspect, audit AI actions
- **Courses / Programs / Departments / Academic sessions** — full academic structure CRUD, curriculum builder, course-creation wizard
- **Students & Faculty management** — accounts, invites (token-based onboarding), roles
- **Admissions** — application review pipeline (`/admin/admissions`, public `/apply`)
- **Content** — upload, manage, moderation, processing status
- **Announcements, calendar, schedule, reports, settings, billing**

## 5. Platform / super-admin

- **Multi-tenant** — universities as tenants; every query scoped by `university_id` from session
- **University registration** — self-serve onboarding (`/university/register`)
- **Super-admin** — cross-tenant platform administration (`api/super-admin`, `/admin/universities`)
- **Waitlist** (`api/waitlist`)

## 6. Commerce & auth

- **Subscriptions** — Paystack plans (Pro/Max), usage metering, billing pages (`/pricing`, `/billing`)
- **Auth** — better-auth: email/password, Google/GitHub/Microsoft OAuth, password reset, invite acceptance, role-based routing (`/post-sign-in`)
- **Profile** — user profile + photo upload

## 7. Cross-cutting guarantees

- **Governance**: confidence thresholds + per-course calibration gates + human review queues + immutable decision ledger
- **Rate limiting** on all AI-cost endpoints (per-user, in-memory fixed window)
- **Tenant isolation**: session-derived tenant FK on every read/write; IDOR-checked `[id]` routes
- **File pipeline**: S3 storage with role/course-scoped access options
- **i18n-ready** (next-intl), dark/light theming, `/design` living design-system reference

---

## Surfaces count (for redesign scoping)

- **Student**: 19 page areas · **Faculty**: 9 · **Admin**: 18 · **Chat**: 5 · **Auth/public**: ~10 (landing, pricing, apply, verify, privacy, terms)
- Demo-critical path (XPRIZE): student chat → snap grading → review queue → AI operations ledger → study plan → credentials/verify
