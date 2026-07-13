# Askly MIVA Pilot — Onboarding Guide

Production: **https://askly-miva.vercel.app** (Neon DB, verified live 2026-07-13)

## For students (share this)

1. Go to https://askly-miva.vercel.app/sign-up
2. Sign up with your **@miva.edu.ng** email (other domains are rejected), pick your program + level, accept terms.
   - You are auto-enrolled in your program's curriculum courses for 2025/2026 first semester.
3. Check your inbox and click **Verify Email** (sign-in is blocked until verified).
4. Sign in. Add more courses via **My Courses → Course Registration** (search, one-click enroll/drop).
5. Study tools live in the sidebar: AI Tutor, My Professor, Viva Coach, Study Plan, Flashcards, Credentials, WhatsApp.

## For volunteers (content capture)

1. Get the extension zip (`askly-capture-v0.2.0.zip` in repo root) → Chrome → `chrome://extensions` → Developer mode → **Load unpacked** (unzipped folder).
2. Ask Tobi to flip your **Volunteer** switch (Admin → Student Management).
3. Sign in to Askly inside the extension popup, browse `lms.miva.university`, open a lesson — the extension auto-detects the video/PDF and course code → **Capture**.
4. Captured content lands in the admin moderation queue before students see it. The course (e.g. COS201) must already exist in Askly — all 551 MIVA courses are pre-loaded.

## Admin runbook (Tobi)

- Admin account: `oluwatobi.salau@miva.edu.ng` (reset password via /reset-password if needed — SMTP works).
- Flip volunteer flags: **Admin → Student Management → Volunteer column**.
- Approve captured content: **Admin → Content → Moderation** (approval notifies enrolled students).
- Watch AI activity: **Admin → AI Operations** (ledger, confidence, overrides).
- Deploys: `cd frontend && vercel --prod`. Env vars already set on the Vercel project (`frontend`, team tobbilobas-projects).
- DB: prod = Neon (`.env` POSTGRES_URL); local dev = `askly_local` (`.env.local` wins). Migrations to Neon: `POSTGRES_URL=<neon> pnpm db:migrate` — deliberate step, never automatic.

## ⚠️ Before inviting more than a handful of students

- **Gemini key is FREE TIER** — the AI features (tutor, snap grading, viva, plans) will hit quota fast. Upgrade to a paid key and update `GOOGLE_GENERATIVE_AI_API_KEY` + `GEMINI_API_KEY` on Vercel, then redeploy.
- WhatsApp tutor needs `WHATSAPP_ACCESS_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` env vars (currently unset — feature degrades gracefully).
- Real student emails must be on `miva.edu.ng`. If students use personal Gmail, add their actual domain to the university's `email_domains` (or collect school addresses).
