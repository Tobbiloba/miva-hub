# Askly Launch Checklist

Production readiness for the multi-university SaaS. Items marked `(code)` are
enforced/warned automatically by `src/lib/env-check.ts` at boot.

## Environment

- [ ] `POSTGRES_URL` — production Postgres `(code: required)`
- [ ] `BETTER_AUTH_SECRET` — strong random secret, never reused from dev `(code: required)`
- [ ] `NEXT_PUBLIC_APP_URL` — public https URL; used in invite/reset emails and Paystack callbacks `(code: warn)`
- [ ] `PAYSTACK_SECRET_KEY` — **live** key (`sk_live_…`); boot warns if a test key is detected in production `(code: warn)`
- [ ] `RESEND_API_KEY` — email sending (invites, receipts, password resets) `(code: warn)`
- [ ] AI provider keys (`OPENAI_API_KEY` at minimum) `(code: warn)`
- [ ] Rotate any credentials previously committed in `mcp-server/.env`
- [ ] Python services reachable and locked: `MCP_SERVER_URL`, `STUDY_BUDDY_API_URL`,
      `CONTENT_PROCESSOR_URL`, plus `MCP_SHARED_SECRET`, `STUDY_BUDDY_SHARED_SECRET`,
      `CONTENT_PROCESSOR_SHARED_SECRET` (same values on the services; they refuse
      requests without them)
- [ ] `CRON_SECRET` set, and `/api/cron/process-captures` scheduled every ~10 min
      with `Authorization: Bearer $CRON_SECRET` (Vercel Cron on Pro sends it
      itself; on Hobby use an external pinger). It finishes captures a timeout
      left behind and re-indexes failed materials
- [ ] `NEXT_PUBLIC_EXTENSION_INSTALL_URL` — Chrome Web Store link for Askly
      Capture; the student setup card and captures panel show no install button
      without it
- [ ] `NEXT_PUBLIC_CHAT_FIRST` unset (default: lean student product). `APP_TIMEZONE`
      only if students aren't in Africa/Lagos

## Paystack

- [ ] Webhook URL set in Paystack dashboard: `https://<domain>/api/webhooks/paystack`
- [ ] Send a test charge and confirm `webhook_event` rows are created and marked processed
- [ ] Org billing per-seat prices reviewed (`src/lib/billing/org.ts` — stored in kobo)
- [ ] Student plan rows exist (`subscription_plan`: ASKLY_MONTHLY / ASKLY_YEARLY with live plan codes)

## Database

- [ ] Run `pnpm db:migrate` (never `db:push` against prod)
      (0041–0045 are new since the last prod migration: per-university current
      session, canonical term keys, student deadlines, chat flashcard decks,
      assistant memory activity types)
- [ ] Bootstrap a super admin: `npx tsx --env-file=.env scripts/promote-super-admin.ts <email>`
- [ ] Verify MIVA tenant row is `active` and its `emailDomains` are correct

## Known limitations / follow-ups

- **Rate limiting is in-memory** (`src/lib/rate-limit.ts`) — resets on deploy and
  is per-instance. Fine for one instance; move to Redis/Upstash before scaling out.
- **Seat limits are soft** — students at an over-limit university stay covered;
  admins see a warning on `/admin/billing`. Revisit if enforcement is needed.
- **Invite expiry is lazy** — invites are marked expired when viewed, not by cron.
- **No error monitoring** — consider Sentry (or Vercel observability) before launch.
- **Comp seat grants are API-only** — no UI; super admin grants seats via
  `POST /api/super-admin/universities/<id>/subscription` with
  `{"seatLimit": n, "months": n, "notes": "..."}`.
- `npx tsc --noEmit` is clean; keep it that way.

## Chrome extension

- [ ] Publish Askly Capture 0.3.1 (`extension/`; due-date fix) with the
      production origin, then set `NEXT_PUBLIC_EXTENSION_INSTALL_URL`

## Smoke test (per deploy)

- [ ] New student: sidebar shows only Chat, My Courses, Deadlines, Flashcards;
      the empty chat shows the three-step capture setup
- [ ] Capture an assignment page → it appears under Deadlines and in My Courses
      → Your captures as Ready
- [ ] Ask a course question → answer cites [S1] chips that open the material

- [ ] University self-signup at `/university/register` → success screen, tenant `pending`
- [ ] Super admin approves tenant at `/admin/universities` → student signup with that domain works
- [ ] Faculty invite send → accept link → faculty account created
- [ ] Org billing checkout reaches Paystack and activates on return
- [ ] Student covered by org subscription is not paywalled; `/billing` shows
      "Covered by your university"
