# Admin End-to-End Test Guide

This guide walks the **entire admin side** of Askly from a cold start (no users, fresh
`askly_local` DB) through every admin capability, in the exact order the system's
dependency gates require. It also flags everything that is broken, half-finished, or
will block an E2E run.

All paths are relative to `frontend/`. Line numbers were accurate at the time of writing
(branch `feat/onboarding`).

---

## 0. Why order matters (read this first)

The admin surface is **not** a flat menu you can poke at in any order. There is a hard
dependency chain enforced at runtime. If you test out of order you will hit confusing
403/503 errors that look like bugs but are actually gates.

```
1. Bootstrap a super_admin           (CLI script — no UI exists)
2. Register a university             → created in status = "pending"
3. super_admin APPROVES university   → status = "active"   ← students blocked until here
4. Admin creates + ACTIVATES an
   academic session                  ← student signup 503s without this
5. Admin builds academic structure:
   departments → programs → courses → curriculum
6. Onboard people:
     • faculty  → invite flow
     • students → self-signup by email domain (needs steps 3+4+5)
7. Day-to-day admin: enrollment, content, announcements, billing, analytics
```

Each numbered step below maps to this chain.

---

## 1. Environment prerequisites

Before any UI testing:

- [ ] Dev server running on **http://localhost:4001** (`pnpm dev`), pointed at the
      isolated `askly_local` DB (the `.env.local` override).
- [ ] DB migrated (58 tables) and subscription plans seeded
      (`pnpm tsx scripts/seed-subscription-plans.ts`).
- [ ] **Email delivery** (`RESEND_API_KEY`, `EMAIL_FROM`) configured if you want to test
      invite / welcome / password-reset emails. These are all **best-effort** — the app
      will not crash without them, and the faculty-invite endpoint returns the invite
      link in its JSON response so you can proceed manually.
- [ ] **Python services** (ports 8080 / 8082 / 8083) running *only if* you intend to test
      content processing, "AI Processing", or anything that indexes uploaded material.
      Pure admin CRUD does not need them.

> ⚠️ **Flag — the DB the app uses is not the DB the Python AI services use.** The
> Python stack (`mcp-server/.env`) points at a different database with a legacy schema.
> Students/courses you create in `askly_local` will **not** be visible to the AI tutor
> until those are aligned. Keep AI-tutoring E2E out of scope for this admin pass.

---

## 2. Step 1 — Bootstrap the first super_admin (CLI only)

There is **no UI** to mint a super_admin. The very first platform operator must be
promoted from the command line.

1. [ ] Sign up a normal account at **`/sign-up`** (or `/university/register`) using the
       email you want to be the platform operator.
2. [ ] Promote it:
   ```bash
   pnpm tsx scripts/promote-super-admin.ts <that-email>
   ```
   This sets `role = super_admin` and `universityId = null`.
3. [ ] Sign out and back in. After sign-in you should land on **`/admin`**
       (`post-sign-in/page.tsx:17` dispatches admin & super_admin to `/admin`).

**Verify:** the admin sidebar now shows a **"Universities"** entry between Dashboard and
Academic Management — it is rendered only for super admins
(`components/admin/admin-sidebar.tsx:142`).

> 🚩 **Flag:** super_admin bootstrap is script-only and undocumented in-app. Fine for an
> operator, but note it — a fresh deploy has zero way to create the first platform admin
> through the UI.

---

## 3. Step 2 — Register a university (creates a university admin)

This is the self-serve tenant onboarding path, and the **correct** way to create a
university admin.

Route: **`/university/register`** → `POST /api/university/register`
(`app/api/university/register/route.ts`).

Test cases:

- [ ] Happy path: fill university name, slug, ≥1 email domain (e.g. `school.edu.ng`),
      support email, admin name/email/password, accept terms. Admin email **must** be on
      one of the claimed domains (`route.ts:70-79`) — try a mismatching domain and
      confirm the 400.
- [ ] Duplicate slug → 409 (`route.ts:82-88`).
- [ ] Domain already claimed by another tenant → 409 (`route.ts:91-99`). Note: a
      `pending` or `suspended` tenant **still owns its domains** (`findClaimedDomain`,
      `university-repository.pg.ts:46`).
- [ ] Admin email already a user → 409 (`route.ts:101-112`).
- [ ] Rate limit: 5 attempts / hour / IP → 429 (`route.ts:55`).
- [ ] On success: response says "pending approval". DB: university `status = "pending"`,
      a new user with `role = "admin"`, `universityId` set, `termsAcceptedAt` set
      (`route.ts:156-164`).

**Expected post-state:** the admin account exists and can log in, **but the university is
pending.** Logging in as this admin now lands on `/admin` — confirm the dashboard renders
even in pending state.

> ✅ This path uses `auth.api.signUpEmail` and sets `universityId` correctly, so the
> account is fully functional and tenant-scoped. (Contrast with §10 "create user", which
> is not.)

---

## 4. Step 3 — Approve the university (super_admin)

Until this happens, **no student can self-register** for that tenant
(`findByEmailDomain` filters `status = 'active'`, `university-repository.pg.ts:36`).

UI: sign in as the super_admin → sidebar **Universities** (`/admin/universities`, gated to
super admins at `app/admin/universities/page.tsx:15`).

API behind it:
- List: `GET /api/super-admin/universities?status=pending` (`route.ts:9`).
- Approve / suspend / edit: `PATCH /api/super-admin/universities/[id]` with
  `{ "status": "active" }` (`app/api/super-admin/universities/[id]/route.ts:18`).

Test cases:
- [ ] Filter the list by `pending` and find the new tenant.
- [ ] Approve it → status flips to `active`; status-change is logged
      (`[id]/route.ts:49-57`).
- [ ] Try the same PATCH while signed in as a plain `admin` → expect the
      `requireSuperAdmin` 401/403 (`[id]/route.ts:23`).
- [ ] Suspend a tenant and confirm downstream effects (suspended tenants block invite
      acceptance — see §8).

---

## 5. Step 4 — Create & activate an academic session (REQUIRED gate)

This is the most commonly-missed gate. Student self-signup calls
`getActiveAcademicSession()` and returns **503 "No active academic session. Contact
admin."** if none is active (`app/api/auth/register/route.ts:68-74`).

UI: **Academic Management → Academic Sessions** (`/admin/academic`), create at
`/admin/academic/create-session`. API: `/api/admin/academic/sessions`.

Test cases:
- [ ] Create a session (e.g. `2025/2026`) with a current semester (`first`/`second`).
- [ ] Activate it. Confirm exactly one active session.
- [ ] End-session / end-semester confirmation flows exist
      (`/admin/academic/end-session-confirmation.tsx`,
      `end-semester-confirmation.tsx`) — exercise the confirmation dialogs but understand
      the consequences before confirming on shared data.

---

## 6. Step 5 — Build the academic structure

Order: **Departments → Programs → Courses → Curriculum**. Each admin API scopes to the
caller's university via `getUserUniversity()` (verified in `departments`, `users`,
`faculty/invites` routes), so everything you create is tenant-owned.

### 6a. Departments — `/admin/departments`
- [ ] Create a department (name, code). API `POST /api/admin/departments` resolves your
      university and stamps `universityId` (`app/api/admin/departments/route.ts:36`).
- [ ] Confirm a second tenant's admin cannot see your departments (tenant isolation).

### 6b. Programs — `/admin/programs`
- [ ] Create a program tied to a department.
- [ ] Open a program's **curriculum** (`/admin/programs/[id]/curriculum`) and add/remove
      courses (`add-course-dialog.tsx`, `remove-course-button.tsx`).
      Compulsory-course curriculum is what drives student **auto-enrollment** at signup
      (`autoEnrollStudent`, called from `auth/register/route.ts:136`).

### 6c. Courses — `/admin/courses`
- [ ] Create a course (`/admin/courses/create`), edit it (`/admin/courses/[id]/edit`).
- [ ] Assign instructors (`/admin/courses/[id]/edit/course-instructors.tsx` →
      `/api/admin/courses/[id]/instructors`).
- [ ] Manage course content (`/admin/courses/[id]/content`).

**Checkpoint:** at this point a student on your domain *could* register and be
auto-enrolled into the compulsory courses of the program they pick.

---

## 7. Step 6a — Onboard faculty (invite flow — the working path)

UI: **Faculty** (`/admin/faculty`), invites at `/admin/faculty/invites` and
`/admin/faculty/create`.

API: `POST /api/admin/faculty/invites` (`app/api/admin/faculty/invites/route.ts:57`).

Test cases:
- [ ] Create an invite (email on your domain, position enum, departmentId). Email **must**
      match a university domain (`route.ts:73`) — try a foreign domain → 400.
- [ ] Duplicate pending invite → 409 (`route.ts:108`); existing user → 409 (`route.ts:89`).
- [ ] If email delivery is down, the response still returns `inviteUrl` — copy it
      (`route.ts:140,168`).
- [ ] Open `/invite/[token]` (the public accept page). `GET /api/invite/[token]` previews
      the invite (`app/api/invite/[token]/route.ts:67`).
- [ ] Accept with name + password (≥8). This creates the user via `auth.api.signUpEmail`,
      sets `role = faculty` + `universityId`, creates the `Faculty` profile with a
      generated employee ID, and marks the invite `accepted` (`route.ts:143-188`).
- [ ] Expired invite (TTL 7 days) → 410 and auto-marks `expired` (`route.ts:50-56`).
- [ ] Reused invite → 410 (`route.ts:41-49`).
- [ ] Sign in as the new faculty → should dispatch to `/faculty`
      (`post-sign-in/page.tsx:20`).

> 🚩 **Flag (minor):** invite acceptance only blocks `suspended` universities, **not**
> `pending` ones (`route.ts:57-62`). A faculty member can accept an invite before the
> tenant is approved. Decide whether that's intended.

---

## 8. Step 6b — Onboard students (self-signup by domain)

Students are **not** created by the admin directly (see §10 for why the "create user"
button is unsafe). They self-register at **`/sign-up`** → `POST /api/auth/register`.

This is the path that exercises all the gates from steps 3–5. Test cases:

- [ ] Email on an **unregistered/non-active** domain → 403 `UNKNOWN_EMAIL_DOMAIN`
      (`auth/register/route.ts:56-65`). (This is what you'll hit if you skipped §4 approval.)
- [ ] No active academic session → 503 (`route.ts:69-74`). (Skipped §5.)
- [ ] Missing program/level → 400 (`route.ts:21`).
- [ ] Happy path: valid school email + program + level + terms. Confirm:
  - user gets `role = student`, `universityId`, academic fields, **7-day trial**
    (`trialStartedAt` / `trialEndsAt`, `route.ts:127-128`).
  - auto-enrollment into compulsory courses ran (`enrolledCourses` in response).
  - lands on `/student/dashboard`.
- [ ] Duplicate email → 409 `USER_EXISTS` (`route.ts:192-199`).

---

## 9. Step 7 — Day-to-day admin features

For each: confirm it loads, performs its action, and stays tenant-scoped.

### Students management — `/admin/students`
- [ ] List/search students (`/api/admin/students`).
- [ ] Per-student academic view `/admin/students/[id]/academic` — enroll/drop via
      `enroll-student-dialog.tsx` + `student-academic-actions.tsx`
      (`/api/admin/students/[id]/academic`).

### All Users — `/admin/users`
- [ ] List/filter by role, status, department, search. Tenant-scoped via `universityId`
      (`app/api/admin/users/route.ts:49`).
- [ ] **See §10 before using "Create User".**

### Content & Communications
- [ ] Upload Content `/admin/content/upload`, Manage `/admin/content/manage`,
      detail `/admin/content/[id]` (`/api/admin/content`, `/api/admin/course-materials`).
- [ ] **AI Processing** `/admin/processing` and **Moderation Queue**
      `/admin/content/moderation` — these depend on the **Python services**; expect empty
      / non-functional results if 8080/8082/8083 aren't running and aligned to this DB.
- [ ] Announcements `/admin/announcements` (+ `/create`) → `/api/admin/announcements`.

### Scheduling
- [ ] Class Schedule `/admin/schedule` (+ `/create`) → `/api/admin/schedule`.
- [ ] Academic Calendar `/admin/calendar` (+ `/create`) → `/api/admin/calendar`.

### Billing — `/admin/billing`
- [ ] View tenant subscription/status (`/api/admin/billing/status`).
- [ ] Checkout flow (`/api/admin/billing/checkout` → Paystack → `/callback`). Test in
      Paystack test mode; do not use real cards.

### Analytics & Reports
- [ ] Analytics Dashboard `/admin/analytics` (`/api/admin/analytics`).
- [ ] Reports Center `/admin/reports` (`/api/admin/reports`) — may depend on Python
      services for generation.

### System Settings — `/admin/settings`
- [ ] Update institution settings (`/api/admin/settings`). Confirm changes persist and
      are tenant-scoped.

---

## 10. 🚩 Critical flags found during review

These are real issues to be aware of while testing — several will look like test failures
but are code defects.

### F1 — `POST /api/admin/users` ("Create User") is broken ✅ VERIFIED LIVE
`app/api/admin/users/route.ts:186-200`:
> **Reproduced end-to-end against the running app + `askly_local`:** an authenticated
> admin POSTed a new student; the endpoint returned `success:true` with
> `"password":"plainpass123"` and `"universityId":null`. The DB row stored the password
> as **plaintext** (`plainpass123`, unhashed), `university_id = NULL`, and **0 `account`
> rows**, and a subsequent sign-in attempt as that user returned
> `401 INVALID_EMAIL_OR_PASSWORD`. **Bonus issue:** the JSON response echoes the plaintext
> password back to the client (info disclosure).
- Inserts `password` as **plaintext** directly into `UserSchema`, bypassing better-auth's
  `account` table. better-auth authenticates against hashed credentials in `account`, so
  **a user created this way cannot log in.** (There's even a `// Note: Should be hashed in
  production` comment, line 192.)
- **Never sets `universityId`**, so the user is orphaned from the tenant and won't appear
  in the tenant-scoped `GET /api/admin/users` list (which filters by `universityId`,
  line 49).
- **Recommendation:** do not use the admin "Create User" button to create testable
  accounts. Use the **faculty invite flow** (§7) and **student self-signup** (§8), which
  both go through `auth.api.signUpEmail` and set the tenant correctly.

### F2 — Admin dashboard shows platform-wide numbers, not per-tenant ✅ VERIFIED (code/SQL)
`app/admin/page.tsx:19-21` calls `getSystemStats()`, `getDepartments()`,
`getAnnouncements()` **with no `universityId`**. `getSystemStats`
(`academic-repository.pg.ts:591`) counts *all* students/courses/faculty/departments/
materials across every tenant. With a single university this is harmless; with 2+ tenants
the dashboard cards and department list are **wrong / cross-tenant**.

### F3 — Dashboard "System Status" is hardcoded
`app/admin/page.tsx:191-213` always renders Database / Content Processing / MCP Server as
green "Operational/Available/Connected" regardless of actual health. Don't trust it as a
real status check.

### F10 — Several admin "create" routes omit `universityId` (NOT NULL → 500) ⚠️ PARTIALLY FIXED
The tenant-scoping-per-route design (see F2) means each POST must resolve
`getUserUniversity()` and pass `universityId` into the insert. Several forget to, so the
insert hits the `NOT NULL` constraint on `university_id` and 500s for **every** admin:
- **Departments** (`api/admin/departments/route.ts` POST) — **FIXED & verified live**: now
  resolves the admin's university, 403s if none, and stamps `universityId`.
- **Courses** (`api/admin/courses/route.ts` POST, ~line 201) — **still broken**:
  `createCourse({...validatedData, ...})` never includes `universityId` (course table has a
  unique `(university_id, course_code)`, so the column is NOT NULL).
- **Academic sessions** (`api/admin/academic/sessions/route.ts` POST, ~line 84/108) —
  **still broken**: both insert branches omit `universityId`. ⚠️ This is the **next blocker**
  you'll hit (step §5) — an active session is required before any student can sign up.
- **Programs** — there is **no top-level `POST /api/admin/programs`** route at all (only
  `[id]` exists); program creation via API appears unimplemented.
- **Announcements** — appears OK (the `announcement` table isn't `universityId`-scoped; it
  uses `courseId`/`departmentId`/`createdById`).

**Fix pattern** (same as the departments fix): after `requireAdmin()`, call
`const university = await getUserUniversity(adminAccess.user.id)`, 403 if falsy, then add
`universityId: university.id` to the insert `.values({...})`.

**Account caveat:** because these routes derive the tenant from the signed-in admin, you
must do steps §5–§6 as a **university-scoped admin** (the one created via
`/university/register`), **not** the platform `super_admin` (whose `universityId` is
`null`). A super_admin now gets a clear 403 instead of a constraint crash.

### F4 — Student signup has invisible prerequisites ✅ VERIFIED LIVE
> Live: `POST /api/auth/register` with an unregistered domain returned
> `403 UNKNOWN_EMAIL_DOMAIN`; missing fields returned `400`.
`/api/auth/register` will 403/503 unless: university is **active** (§4), an academic
session is **active** (§5), and a **program** exists (§6). If you test signup first you'll
get errors that aren't actually signup bugs.

### F5 — super_admin only creatable via CLI
No UI path; `scripts/promote-super-admin.ts` only (§2).

### F6 — Faculty invites accept under `pending` tenants
Invite acceptance blocks only `suspended`, not `pending` (`api/invite/[token]/route.ts:57`).

### F7 — Email-dependent flows degrade silently
Invites, welcome email, and password reset are best-effort. Without `RESEND_API_KEY` they
log and continue. Faculty invite returns the link in JSON so you can still proceed.

### F8 — AI/content features need the Python stack *and* DB alignment
`/admin/processing`, content indexing, moderation, and some reports depend on services on
8080/8082/8083, which currently read a **different database** than the app. Treat these as
out of scope for a pure admin-CRUD pass.

### F9 — Unauthenticated API calls 307-redirect, they don't 401 ✅ VERIFIED LIVE
`/api/admin/*` and `/api/super-admin/*` are matched by `middleware.ts`, so a request with
**no session cookie** gets a `307` redirect to `/sign-in` *before* the route's
`requireAdmin`/`requireSuperAdmin` runs. The JSON `401/403` from those guards only fires
for an authenticated user with the **wrong role**. (Confirmed live: both endpoints returned
`307 → /sign-in` with no cookie.) Keep this in mind when scripting API tests — you need a
real verified+signed-in session cookie, not just any header.

---

## 11. Suggested happy-path run sheet (copy/paste checklist)

```
[ ] 1.  pnpm dev up on :4001, askly_local migrated + plans seeded
[ ] 2.  /sign-up  → create operator account
[ ] 3.  pnpm tsx scripts/promote-super-admin.ts <operator-email>
[ ] 4.  re-login → lands on /admin, "Universities" visible in sidebar
[ ] 5.  /university/register → create "Test University" (domain test.edu.ng), pending
[ ] 6.  as super_admin: /admin/universities → approve → active
[ ] 7.  login as the university admin
[ ] 8.  /admin/academic → create + activate session 2025/2026
[ ] 9.  /admin/departments → create dept
[ ] 10. /admin/programs → create program + add compulsory courses to curriculum
[ ] 11. /admin/courses → create course, assign instructor
[ ] 12. /admin/faculty/invites → invite faculty → accept via /invite/[token]
[ ] 13. /sign-up as student@test.edu.ng → pick program → auto-enrolled, trial active
[ ] 14. back as admin: students, content, announcements, schedule, billing, analytics
[ ] 15. note any deviation against the flags in §10
```

---

## 12. Live verification log (2026-06-28)

Run against the dev server on `:4001` + `askly_local`. Test rows created during
verification were cleaned up afterward (0 `verify-*` rows remain).

| Flag | Method | Result |
|------|--------|--------|
| F4 | `POST /api/auth/register`, unregistered domain | `403 UNKNOWN_EMAIL_DOMAIN` ✅ |
| F4 | `POST /api/auth/register`, missing fields | `400` ✅ |
| Uni reg | admin email off claimed domain | `400` "must use one of the university email domains" ✅ |
| Invite | `GET /api/invite/bogus-token` | `404` "Invalid or unknown invitation" ✅ |
| F9 | `GET /api/admin/users` & `/api/super-admin/universities`, no cookie | `307 → /sign-in` ✅ |
| F1 | authed admin `POST /api/admin/users` → inspect DB | `success:true`; row has **plaintext** `password`, `university_id=NULL`, **0 account rows**; sign-in as that user → `401 INVALID_EMAIL_OR_PASSWORD`; response **echoes plaintext password** ✅ |
| F2 | code/SQL read | `getSystemStats` has no `universityId` predicate; dashboard calls it with no arg ✅ |

**Auth note discovered during testing:** `requireEmailVerification: true`
(`auth/server.ts:42`). Sign-up does **not** create a session, and sign-in is blocked with
`403 EMAIL_NOT_VERIFIED` until the email is verified. For local E2E without working email,
either flip `email_verified=true` in the DB or click the verification link.
