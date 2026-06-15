# Askly — Manual QA Checklist

> **Branch**: `feat/onboarding` at `8bc8c79`
> **Generated**: 2026-06-15
> **Dev server**: `cd frontend && PORT=4001 pnpm dev`
> **Test accounts**:
> - Faculty: `adebayo.olumide@miva.edu.ng` / `Facultyy7hcto7m!`
> - Student: `ada.okonkwo@miva.edu.ng` / `StudentTest123!`
> - Admin: use your own admin account (or promote one: `npx tsx --env-file=.env scripts/promote-super-admin.ts <email>`)

---

## A. Public Pages (no login required)

### Sign In (`/sign-in`)
- [ ] Page loads with "Welcome Back" card
- [ ] Email and Password fields visible
- [ ] "Forgot password?" link → goes to `/reset-password`
- [ ] "Sign up" link → goes to `/sign-up`
- [ ] Empty submit shows "Invalid email" toast
- [ ] Wrong password shows error toast
- [ ] Valid faculty login → redirects to `/faculty`
- [ ] Valid student login → redirects to `/` (chat)
- [ ] Valid admin login → redirects to `/admin`

### Sign Up (`/sign-up`)
- [ ] Step 1: Full Name, Email, Password, Confirm Password fields
- [ ] "Next" with empty fields stays on Step 1
- [ ] Non-university email shows domain validation error
- [ ] Valid university email (e.g. `@miva.edu.ng`) proceeds to Step 2
- [ ] Step 2: Level, semester fields appear
- [ ] Submit creates account and shows verification prompt
- [ ] "Sign In" link works

### Reset Password (`/reset-password`)
- [ ] Email field + "Send Reset Link" button render
- [ ] "Remember your password? Sign In" link works
- [ ] Submit with valid email sends reset email (check Resend dashboard)

### Pricing (`/pricing`)
- [ ] Page title: "Pricing - Askly"
- [ ] Three plans visible: Student (₦2,500/mo), Premium (₦5,000/mo), Faculty (₦7,500/mo)
- [ ] Feature lists render for each plan
- [ ] "Why Students Choose Us" section at bottom (NOT "MIVA Students")
- [ ] Subscribe buttons redirect to sign-in if not logged in

### Terms (`/terms`)
- [ ] Terms of Service content loads
- [ ] Page is scrollable

### Privacy (`/privacy`)
- [ ] Privacy Policy content loads

### Landing (`/landing`)
- [ ] Hero section renders
- [ ] Multiple content sections load
- [ ] Note: `/bento/*.png` images may 404 (pre-existing missing assets)

### University Registration (`/university/register`)
- [ ] Step 1: University name, URL identifier (auto-slug), email domains, support email
- [ ] Slug auto-generates from name
- [ ] "Continue" validates required fields
- [ ] Step 2: Admin name, email, password, ToS checkbox
- [ ] Admin email must match one of the claimed domains
- [ ] Submit shows "pending approval" success screen
- [ ] "A student? Sign up here" link works

### Invalid Invite (`/invite/not-a-real-token`)
- [ ] Shows "Invitation unavailable" card (no crash)
- [ ] "Go to sign in" button works

### Unauthorized (`/unauthorized`)
- [ ] Shows "Access Denied" card
- [ ] "Return to Dashboard" and "Sign In with Different Account" buttons work

---

## B. Student Experience (login as `ada.okonkwo@miva.edu.ng`)

### Chat (`/`)
- [ ] "Where would you like to start?" greeting
- [ ] Chat input with placeholder "Ask anything or @mention"
- [ ] Model selector (gpt-4.1 default) clickable
- [ ] Tools button visible
- [ ] "New Chat" in sidebar works
- [ ] Send a message → AI responds (requires OPENAI_API_KEY)
- [ ] Older chats appear in sidebar
- [ ] Can click into an older chat and see history

### Student Dashboard (`/student/dashboard`)
- [ ] Personalized greeting with student name and time of day
- [ ] Current level/course shown (e.g. "200L - COS201 in progress")
- [ ] Quick action buttons: Study guide, Practice quiz, Explain a topic, etc.
- [ ] "For you today" cards render
- [ ] Study streak + weekly goal counters at bottom

### Student Courses (`/student/courses`)
- [ ] Enrolled courses listed with details
- [ ] Course cards link to course detail

### Student Assignments (`/student/assignments`)
- [ ] Assignments listed (may be empty)
- [ ] Assignment detail page (`/student/assignments/[id]`) loads

### Student Grades (`/student/grades`)
- [ ] Grades summary loads
- [ ] Grade data displayed correctly

### Student Materials (`/student/materials`)
- [ ] Course materials listed
- [ ] File links work (stream/download)

### Student Flashcards (`/student/flashcards`)
- [ ] Flashcard decks listed
- [ ] Can click into a deck (`/student/flashcards/[deckId]`)
- [ ] Flashcard review UI works (flip, rate)

### Student Progress (`/student/progress`)
- [ ] Progress dashboard with charts/stats
- [ ] Per-course progress breakdown

### Student Schedule (`/student/schedule`)
- [ ] Schedule/timetable renders

### Student Faculty (`/student/faculty`)
- [ ] Faculty directory for student's university

### Student Calendar (`/student/calendar`)
- [ ] Academic calendar renders

### Student Announcements (`/student/announcements`)
- [ ] Announcements listed (may be empty)

### Student Notifications (`/student/notifications`)
- [ ] Notification list renders
- [ ] Bell icon in sidebar/header shows count

### Student Billing (`/billing`)
- [ ] Shows current plan status (plan name, price, status badge)
- [ ] If active: shows plan details + cancel option
- [ ] If canceling: shows end date + re-subscribe options (Monthly/Yearly)
- [ ] If no subscription: shows upgrade cards
- [ ] "Back to dashboard" link works
- [ ] "Choose Monthly" / "Choose Yearly" → redirects to Paystack (requires PAYSTACK_SECRET_KEY)

### Student Profile (`/profile`)
- [ ] Shows student name, email, role badge
- [ ] Tabs: Overview, Personal, Academic, Settings, Billing
- [ ] Overview shows academic stats
- [ ] Personal tab shows editable fields
- [ ] Settings tab works

---

## C. Faculty Experience (login as `adebayo.olumide@miva.edu.ng`)

### Faculty Dashboard (`/faculty`)
- [ ] Welcome message with name + position
- [ ] Stats: Active Courses, Total Students, Pending Grades, Recent Submissions
- [ ] "My Courses" card with course list
- [ ] "Pending Grades" card with submissions to grade
- [ ] "Quick Actions": Create Assignment, Upload Materials, Post Announcement
- [ ] "Action Required" section at bottom

### Faculty Sidebar
- [ ] All links navigate correctly:
  - [ ] Overview → `/faculty`
  - [ ] My Courses → `/faculty/courses`
  - [ ] Assignments → `/faculty/assignments`
  - [ ] Grade Book → `/faculty/grades`
  - [ ] Students → `/faculty/students`
  - [ ] Announcements → `/faculty/announcements`
  - [ ] Materials → `/faculty/materials`
  - [ ] Schedule → `/faculty/schedule`
  - [ ] Profile → `/profile`
- [ ] Active state highlights current page
- [ ] "Active Faculty" green dot at bottom

### Faculty Courses (`/faculty/courses`)
- [ ] Tabs: Current Semester / All Courses
- [ ] All Courses shows COS201, COS205
- [ ] Click course → `/faculty/courses/[courseId]` loads detail page

### Faculty Course Detail (`/faculty/courses/[courseId]`)
- [ ] Course info, enrolled students, materials, assignments sections
- [ ] Links to grade book, add material, create assignment work

### Faculty Assignments (`/faculty/assignments`)
- [ ] Stats: Total Assignments, Published, Drafts, Due This Week
- [ ] Tabs: All, Published, Drafts, Upcoming, Past
- [ ] Each assignment shows: title, description, course tag, points
- [ ] "Grade" button works → `/faculty/assignments/[id]/grade`
- [ ] "View Details" button works
- [ ] "+ Assignment" button in header → `/faculty/assignments/create`

### Create Assignment (`/faculty/assignments/create`)
- [ ] Form: title, description, course select, type, points, due date
- [ ] Submit creates assignment
- [ ] Cancel goes back

### Grade Book (`/faculty/grades`)
- [ ] Tabs: Pending Grades, Gradebook
- [ ] Pending grades list with "Grade" buttons
- [ ] Gradebook tab shows student-assignment grid when a course is selected

### Faculty Students (`/faculty/students`)
- [ ] Student roster for instructor's courses

### Faculty Announcements (`/faculty/announcements`)
- [ ] Announcement list
- [ ] Create Announcement (`/faculty/announcements/create`) form works

### Faculty Materials (`/faculty/materials`)
- [ ] Materials list
- [ ] Upload Materials (`/faculty/materials/upload`) form works

### Faculty Schedule (`/faculty/schedule`)
- [ ] Teaching schedule / office hours display

---

## D. Admin Experience (requires admin account)

### Admin Dashboard (`/admin`)
- [ ] "University Admin Dashboard" heading
- [ ] Stats cards render
- [ ] Quick links to sections

### Admin Sidebar
- [ ] All links present and navigate:
  - [ ] Dashboard, Users, Students, Faculty, Courses, Departments
  - [ ] Programs, Academic, Schedule, Calendar, Announcements
  - [ ] Content Management, Analytics, Reports
  - [ ] **Billing** (new), Settings

### Admin Users (`/admin/users`)
- [ ] User list scoped to admin's university
- [ ] Create user (`/admin/users/create`) works

### Admin Students (`/admin/students`)
- [ ] Student list scoped to admin's university

### Admin Faculty (`/admin/faculty`)
- [ ] Faculty list scoped to admin's university
- [ ] "Invites" button → `/admin/faculty/invites`
- [ ] "Add Faculty" button → `/admin/faculty/create`

### Admin Faculty Invites (`/admin/faculty/invites`)
- [ ] Invite form: email, position, department
- [ ] Email domain must match university
- [ ] Send invite → shows in pending list
- [ ] Invite status tracking (pending/accepted/expired)

### Admin Courses (`/admin/courses`)
- [ ] Course list scoped to admin's university

### Admin Departments (`/admin/departments`)
- [ ] Department list scoped to admin's university

### Admin Billing (`/admin/billing`) — NEW
- [ ] Coverage card: seats used / seat limit
- [ ] Over-seat-limit amber warning (if applicable)
- [ ] Purchase form: seats input + interval (Monthly/Yearly)
- [ ] Price calculation: seats × per-seat price
- [ ] "Pay with Paystack" → redirects to Paystack checkout
- [ ] After payment: success toast, subscription active
- [ ] Renewal when already active: extends period (no lost days)

### Admin Analytics (`/admin/analytics`)
- [ ] Academic performance insights render

### Admin Content Management
- [ ] `/admin/content/manage` — content moderation queue
- [ ] `/admin/content/moderation` — pending content list
- [ ] `/admin/content/upload` — upload form

---

## E. Super Admin Experience (requires super_admin role)

### University Management (`/admin/universities`)
- [ ] Lists all universities with status filter (pending/active/suspended)
- [ ] Pending universities show "Approve" action
- [ ] Approve calls PATCH `/api/super-admin/universities/[id]`
- [ ] University status changes to "active"
- [ ] Can suspend/reactivate universities

### Comp Seat Grants (API-only, no UI)
- [ ] `POST /api/super-admin/universities/[id]/subscription`
- [ ] Body: `{"seatLimit": 50, "months": 12, "notes": "Launch grant"}`
- [ ] Creates active subscription with no payment

---

## F. Cross-Cutting Features

### Branding
- [ ] Title bar says "Askly" on every page
- [ ] No "MIVA Hub" or "MIVA University" visible anywhere in the UI
- [ ] Auth hero text says "Welcome to Askly" (not "miva-hub")
- [ ] Pricing says "Why Students Choose Us" (not "MIVA Students")
- [ ] Error page says `support@askly.com` (not `miva-hub.com`)

### Email Templates (check Resend dashboard)
- [ ] Welcome email says "Askly" (not "MIVA Hub")
- [ ] Password reset email says "Askly"
- [ ] Payment receipt says "Askly"
- [ ] Faculty invite email sends correctly

### Authorization (verified programmatically, spot-check)
- [ ] Student cannot access `/admin/*` (redirects to unauthorized)
- [ ] Faculty cannot access `/admin/*` (gets 403)
- [ ] Anonymous users redirected to `/sign-in` from protected pages
- [ ] File routes (`/api/files/*`) require login
- [ ] Admin APIs scoped to admin's university (can't see other universities' data)

### Paystack Webhooks
- [ ] Webhook URL configured: `https://<domain>/api/webhooks/paystack`
- [ ] Signature verification works (check Paystack webhook logs)
- [ ] Student subscription activation via webhook
- [ ] University subscription activation via webhook

### Environment Validation
- [ ] App refuses to start in production without `POSTGRES_URL` and `BETTER_AUTH_SECRET`
- [ ] Warns at boot if `PAYSTACK_SECRET_KEY`, `RESEND_API_KEY`, `OPENAI_API_KEY` are missing
- [ ] Warns if `PAYSTACK_SECRET_KEY` starts with `sk_test` in production

---

## G. Pre-Production Ops

- [ ] **Rotate credentials** in `mcp-server/.env` (AWS, OpenAI, Resend, Neon) — they were in git history
- [ ] Set `PAYSTACK_SECRET_KEY` to live key (`sk_live_...`)
- [ ] Set `NEXT_PUBLIC_APP_URL` to production domain
- [ ] Set `RESEND_API_KEY` for production email sending
- [ ] Set `OPENAI_API_KEY` (at minimum) for AI features
- [ ] Run `pnpm db:migrate` (NOT `db:push`) against production
- [ ] Bootstrap super admin: `npx tsx --env-file=.env scripts/promote-super-admin.ts <email>`
- [ ] Configure Paystack webhook URL in Paystack dashboard
- [ ] Send a test charge and confirm `webhook_event` rows are created
- [ ] Verify MIVA tenant row is `active` with correct `emailDomains`
- [ ] Consider adding Sentry/error monitoring before launch
- [ ] Consider moving rate limiting to Redis before scaling past 1 instance

---

**Total items: ~160 checkpoints across 85+ pages**

*All automated checks (build, types, auth probes, route scanning) have passed.
The items above are the manual verification steps for human eyes.*
