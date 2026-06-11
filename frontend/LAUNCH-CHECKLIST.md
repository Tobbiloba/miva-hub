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

## Paystack

- [ ] Webhook URL set in Paystack dashboard: `https://<domain>/api/webhooks/paystack`
- [ ] Send a test charge and confirm `webhook_event` rows are created and marked processed
- [ ] Org billing per-seat prices reviewed (`src/lib/billing/org.ts` — stored in kobo)
- [ ] Student plan rows exist (`subscription_plan`: ASKLY_MONTHLY / ASKLY_YEARLY with live plan codes)

## Database

- [ ] Run `pnpm db:migrate` (never `db:push` against prod)
- [ ] Bootstrap a super admin: `npx tsx --env-file=.env scripts/promote-super-admin.ts <email>`
- [ ] Verify MIVA tenant row is `active` and its `emailDomains` are correct

## Known limitations / follow-ups

- **Rate limiting is in-memory** (`src/lib/rate-limit.ts`) — resets on deploy and
  is per-instance. Fine for one instance; move to Redis/Upstash before scaling out.
- **Seat limits are soft** — students at an over-limit university stay covered;
  admins see a warning on `/admin/billing`. Revisit if enforcement is needed.
- **Invite expiry is lazy** — invites are marked expired when viewed, not by cron.
- **No error monitoring** — consider Sentry (or Vercel observability) before launch.
- Pre-existing `tsc` baseline (~425 errors) — does not block builds but worth
  burning down (notably `src/app/admin/faculty/page.tsx` schema drift).

## Smoke test (per deploy)

- [ ] University self-signup at `/university/register` → success screen, tenant `pending`
- [ ] Super admin approves tenant at `/admin/universities` → student signup with that domain works
- [ ] Faculty invite send → accept link → faculty account created
- [ ] Org billing checkout reaches Paystack and activates on return
- [ ] Student covered by org subscription is not paywalled; `/billing` shows
      "Covered by your university"
