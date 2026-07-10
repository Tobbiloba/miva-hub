# Final Design Direction — "Calm Campus"

Reviewed all 9 references. Selected 6, rejected 3. The direction is a **light-first,
airy, card-based system** with a violet primary and a lime "energy" accent used
sparingly. It reads modern-AI (for the XPRIZE judges) without sacrificing the
legibility a university product needs.

---

## The three rejected, and why

| File | Why it's out |
| --- | --- |
| `2d5bf4d2…` (Zyricon, dark purple glass) | Gorgeous, but dark-first + glassmorphism hurts long-form reading (students live in text), and low-contrast glass panels fail accessibility on data-dense screens. |
| `96b9e6b9…` (Qubi, dark sidebar / light main) | Split dark/light chrome is visually jarring and doubles the theming surface. EchoAi achieves the same "hero welcome + agent cards" idea more coherently. |
| `a99960f1…` (Statistic School, icy corporate) | Cold B2B-sales feel; weakest emotional fit for an education product. Its black icon rail wastes the sidebar (no labels). |

---

## The six selected, and exactly what we take from each

### 01 — NexusAI dashboard → **the app-wide foundation** (`01-dashboard-foundation-nexusai.webp`)
The base visual language for EVERY screen (student, faculty, admin):
- Soft off-white page background, white cards, 1px hairline borders, 16px radius, minimal shadow.
- **KPI stat row**: icon-in-circle + label + big number + green/red delta pill + "vs last month". Reuse for student GPA/credits/streak, faculty grading queue, admin AI-ops counts.
- **Grouped sidebar**: section labels ("Main", "Management"), active item = soft violet pill, user card pinned bottom.
- Chart style: rounded-top bars, hatched "remaining" state, dotted reference line, small legend dots.
- Donut + legend list pattern (Model Usage) → reuse for grade distribution / AI decision statuses.
- **Streak calendar** widget → maps directly to student study-streak.
- Violet primary CTA, top-right ("New Chat" placement).

### 02 — EchoAi chat home → **chat empty state + composer** (`02-chat-home-composer-echoai.webp`)
- Centered welcome: logo mark, "Welcome, {name}", one-line guidance.
- **Three suggestion cards** above the composer (icon, title, one-line description) → map to "Ask your AI Professor", "Snap & Solve", "Plan my week".
- Composer as a large rounded card: sparkle placeholder, attach/file icons left, **capability chips** (Reasoning, Writing Style → our tool-mode/model chips), mic + lime send button right.
- The **lime accent** on the upgrade pill / send button is the "energy" color — use it ONLY for the primary chat action and streak/success moments, never for whole surfaces.
- Disclaimer line under composer ("may make errors") — we keep this pattern.

### 03 — Cognivo → **chat sidebar & history** (`03-chat-sidebar-history-cognivo.webp`)
- Date-grouped thread history (TODAY / YESTERDAY / AUGUST) with truncated single-line titles.
- Prominent "New Chat" button with keyboard-shortcut hint (⌘N).
- Secondary nav above history: Explore / Knowledge Base / Templates → maps to Courses / Library / Agents.
- User card bottom with plan badge + expandable menu.
- NOT taking its orange — color stays violet/lime from 01/02.

### 04 — Design-system chat → **AI answer richness** (`04-chat-answer-richness.webp`)
The target for how an AI-professor reply looks:
- User message as a soft grey rounded block with "Show full message" collapse.
- **Artifact/tool chips row** under the message (Component Library Reference, etc.) → our tool-invocation results (Search Course Content, Generate Practice Questions…).
- **Source cards carousel** (favicon, title, snippet, source) → course-material citations from RAG.
- Structured answer: H2/H3 headings, inline tag pills, generous line-height. Our Markdown renderer already does 90% of this — this image sets spacing/typography targets.
- Project sidebar with per-project counts → maps to per-course chat grouping.

### 05 — "five" student details → **analytics widgets** (`05-student-analytics-widgets-five.webp`)
For student profile + performance surfaces (student detail, /student/plan, faculty view of a student):
- Profile card: banner strip + centered avatar + status pills (STU-005 / Active) + contact rows + awards list.
- **Learning Activity** stacked bars with per-course hour chips underneath.
- **Performance gauge** (semicircle, segment legend with %s) + area sparkline with delta badge.
- **Enrolled courses table**: thumbnail, name/category, lessons·hours, progress ring, status pill (Ongoing/Completed), score, certificate link → our enrollment + credentials row.
- Motivational quote strip (yellow tint) → AI professor nudge slot.
- NOT taking: the pastel-lavender page wash and 3D clipart stickers — too playful; foundation stays NexusAI-neutral.

### 06 — FIREBURN → **student dashboard actions** (`06-student-dashboard-cards-fireburn.webp`)
- **Category pill bar** (horizontal scrollable, active = filled) → course/week filter on student dashboard.
- Three-up **activity stat cards** with "Community Average" comparison line → cohort-relative framing ("your accuracy vs class average") — strong XPRIZE story.
- **Action card row** ("Amplify for Cognify"): illustration, title, 3-line description, full-width Play button, ONE card highlighted in primary as the recommended action → maps to AI study-plan "next best action", with the AI-recommended one highlighted.
- Welcome header line in the top bar ("Welcome, Ahmed… What would you like to study today?").
- NOT taking: blue+orange palette; recolor to violet/lime.

---

## Token decisions (globals.css `@theme`)

| Token | Value direction | Source |
| --- | --- | --- |
| `background` | warm off-white `~#F7F7F5` | 01 |
| `card` | pure white, 1px `~#ECECEC` border | 01 |
| `primary` | violet `~#7C6FF0` range | 01 |
| `accent` (energy) | lime `~#C6F432` — send button, streaks, success pills only | 02 |
| `radius` | 16px cards / 24px composer & hero cards | 01/02 |
| Typography | **Neue Montreal** (existing brand font — keep); 32–36px page titles, 13–14px body-secondary | 01/04 |
| Charts | violet primary series, muted yellow secondary, hatched remainders | 01 |
| Dark mode | keep, derived from same tokens — but light becomes the default & demo mode. **Note: this flips the current app default (`layout.tsx` `defaultTheme="dark"`) — a deliberate decision, 5 of 6 kept references are light.** | — |

## Screen → reference map

| Screen | Primary ref | Secondary |
| --- | --- | --- |
| Chat (empty/new) | 02 | 03 sidebar |
| Chat (conversation) | 04 | 02 composer |
| Student dashboard | 01 layout + 06 cards/pills | 05 gauge |
| Student profile / plan | 05 | 01 |
| Faculty dashboard | 01 | 05 table |
| Admin / AI-ops | 01 | 04 chips for ledger entries |

## Rollout (unchanged from our discussion)
1. **Reskin**: retoken `globals.css` to the palette above — propagates app-wide; verify on `/design`.
2. **Chat**: sidebar (03) + empty state/composer (02) + answer typography (04).
3. **Student dashboard**: stat row (01) + pills/action cards (06) + widgets (05).
4. Faculty/admin get the reskin free; targeted card/table polish after.
