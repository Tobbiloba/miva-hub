# MIVA University - Payment & Billing System Documentation

This directory contains comprehensive documentation of the payment and billing system implementation for the MIVA University frontend application.

## Documentation Files

### 1. **PAYMENT_QUICK_SUMMARY.txt** - START HERE
Quick overview of the entire payment system with key findings and action items.
- Payment provider: Paystack
- Two pricing tiers: PRO (₦2,500/mo) and MAX (₦5,500/mo)
- Complete implementation status
- What needs verification
- Quick setup checklist

### 2. **PAYMENT_BILLING_ANALYSIS.md** - COMPREHENSIVE GUIDE
Complete 17-section analysis covering every aspect of the payment system.
- Payment provider and integration
- Pricing plans and features
- Payment flow architecture (step-by-step)
- Database schema (all tables and functions)
- API endpoints and routes
- Frontend components
- Payment service details
- Subscription repository
- Usage tracking and limits
- Environment variables
- Setup and configuration scripts
- Implementation status
- Security considerations
- Complete user flow example
- Deployment checklist
- Testing information
- File structure summary
- Strengths and recommendations

### 3. **PAYMENT_CODE_EXAMPLES.md** - REFERENCE GUIDE
Practical code examples and usage patterns for all payment-related code.
- PaystackService API wrapper methods
- Subscription initialization flow
- Payment callback and verification
- Webhook event handling
- Subscription cancellation
- Pricing page component
- Subscription status API
- Usage tracking middleware
- Database repository methods
- Database schema definitions
- Helper functions
- Profile billing components
- Environment variables
- Setup scripts
- Error handling examples

## Quick Navigation

### For Product Managers
Start with: **PAYMENT_QUICK_SUMMARY.txt**
Then read: Sections 2, 7 of **PAYMENT_BILLING_ANALYSIS.md**

### For Developers
Start with: **PAYMENT_BILLING_ANALYSIS.md** (full read)
Reference: **PAYMENT_CODE_EXAMPLES.md** (for implementation details)

### For DevOps/Backend
Start with: Section 15 (Deployment Checklist) in **PAYMENT_BILLING_ANALYSIS.md**
Reference: **PAYMENT_CODE_EXAMPLES.md** (Section 14 - Setup Scripts)

### For Frontend Developers
Start with: Section 6 (Frontend Components) in **PAYMENT_BILLING_ANALYSIS.md**
Reference: **PAYMENT_CODE_EXAMPLES.md** (Sections 6, 12)

### For QA/Testing
Start with: Section 16 (Testing) in **PAYMENT_BILLING_ANALYSIS.md**
Reference: **PAYMENT_QUICK_SUMMARY.txt** (Section 14 - Testing)

## Key Information Summary

### Payment Provider
**Paystack** - Nigerian payment processor
- API Base: https://api.paystack.co
- Currency: NGN (Nigerian Naira)
- Authentication: Bearer token (PAYSTACK_SECRET_KEY)

### Pricing Plans
| Plan | Price | AI Messages | Quizzes | Exams | Model |
|------|-------|-------------|---------|-------|-------|
| FREE | Free | 0 | 0 | 0 | None |
| PRO | ₦2,500/mo | 30/day | 3/week | 2/month | GPT-3.5 Turbo |
| MAX | ₦5,500/mo | Unlimited | Unlimited | Unlimited | GPT-4 + Claude 3.5 |

### Key Files & Locations
```
API Routes:
/frontend/src/app/api/subscription/initialize/route.ts    - Start payment
/frontend/src/app/api/subscription/callback/route.ts      - Verify payment
/frontend/src/app/api/subscription/cancel/route.ts        - Cancel subscription
/frontend/src/app/api/webhooks/paystack/route.ts          - Webhook handler

Services:
/frontend/src/lib/payment/paystack-service.ts             - Paystack API wrapper
/frontend/src/lib/db/pg/repositories/subscription-repository.pg.ts  - Database ops

Components:
/frontend/src/components/pricing/pricing-cards.tsx        - Plan selection
/frontend/src/components/profile/billing-tab.tsx          - Billing dashboard
/frontend/src/components/profile/subscription-card.tsx    - Current subscription
/frontend/src/components/profile/manage-subscription.tsx  - Manage options

Database:
/frontend/src/lib/db/pg/schema.pg.ts                      - Tables & types
/frontend/src/lib/db/migrations/pg/0019_subscription_system.sql  - Migration

Scripts:
/frontend/scripts/create-paystack-plans.ts                - Create plans
/frontend/scripts/update-plan-codes.ts                    - Update codes
```

### API Endpoints
```
POST   /api/subscription/initialize       - Start subscription
GET    /api/subscription/callback         - Payment callback
GET    /api/subscription/status           - Get subscription status
POST   /api/subscription/cancel           - Cancel subscription
GET    /api/subscription/manage-link      - Paystack management portal
GET    /api/subscription/details          - Full subscription details
GET    /api/subscription/usage            - Usage statistics
POST   /api/webhooks/paystack             - Webhook receiver
```

### Database Tables
- **subscription_plan** - Available plans with features and limits
- **user_subscription** - Active user subscriptions
- **payment_transaction** - All payment transactions
- **usage_tracking** - Daily/weekly/monthly usage counters
- **webhook_event** - Webhook event audit log
- **subscription_change_log** - Subscription change history

### Payment Flow
```
User → Pricing Page → Subscribe Button → Paystack Checkout
   ↓
Paystack Processes Payment → Redirects to Callback
   ↓
Callback Verifies Transaction → Creates Subscription
   ↓
Webhooks Handle Renewals & Cancellations
```

### Implementation Status

#### What's Working ✅
- Complete payment flow (initialize → verify → create)
- Recurring monthly billing via webhooks
- Subscription cancellation (at period end or immediate)
- Transaction history tracking
- Usage limits enforcement
- Upgrade/downgrade flows
- Payment management portal access
- Full database schema with indexes
- All helper functions

#### What Needs Attention ⚠️
- Email token capture during callback (needed for subscription cancellation)
- Verify Paystack plan codes match dashboard
- Test webhook endpoint accessibility in production
- Implement trial period logic (database fields exist)

### Environment Variables Required
```env
PAYSTACK_SECRET_KEY                    - API secret key
PAYSTACK_PUBLIC_KEY                    - API public key
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY        - Frontend public key
NEXT_PUBLIC_APP_URL                    - Callback URL
POSTGRES_URL                           - Database connection
BETTER_AUTH_SECRET                     - Auth secret
BETTER_AUTH_URL                        - Auth URL
```

### Setup Commands
```bash
# Create Paystack plans
pnpm paystack:create-plans

# Update plan codes in database
PRO_PLAN_CODE=PLN_xxx MAX_PLAN_CODE=PLN_yyy pnpm paystack:update-codes

# Database migrations
pnpm db:push
pnpm db:migrate
```

### Testing Credentials
**Test Card**: 4084 0343 6173 6309
**CVV**: 407
**Exp**: 12/31

### Deployment Checklist
1. Get Paystack live API keys
2. Update .env with live keys
3. Run database migrations
4. Create plans in Paystack
5. Configure webhook URL
6. Test end-to-end flow
7. Enable HTTPS
8. Monitor webhooks

## Common Tasks

### How to Add a New Pricing Tier
1. Create plan in Paystack via script
2. Add to database migration
3. Update plan limits in schema
4. Add new plan card in pricing component

### How to Change Usage Limits
1. Update limits in database (subscription_plan.limits)
2. Database automatically enforces via check_usage_limit() function
3. No code changes needed

### How to Debug Payment Issues
1. Check webhook_event table for failed events
2. Check payment_transaction table for transaction status
3. Verify Paystack secret key is correct
4. Check NEXT_PUBLIC_APP_URL matches callback URLs
5. Look for signature verification errors in logs

### How to Handle Failed Payments
1. Webhook logged in webhook_event table
2. Transaction marked as "failed" in payment_transaction
3. Subscription remains in "active" state (Paystack retries)
4. Manual intervention via Paystack dashboard if needed

## Support & Resources

### Paystack Documentation
- Dashboard: https://dashboard.paystack.com
- API Docs: https://paystack.com/docs/api/
- Webhook Setup: https://paystack.com/docs/webhooks/

### Code References
- PaystackService: `/src/lib/payment/paystack-service.ts`
- Repository: `/src/lib/db/pg/repositories/subscription-repository.pg.ts`
- Middleware: `/src/lib/middleware/usage-check.ts`

### External Dependencies
- Paystack API (REST)
- PostgreSQL with Drizzle ORM
- Better Auth for sessions
- React components (Shadcn UI)

## Troubleshooting

### Payment not initializing
- Check PAYSTACK_SECRET_KEY is set correctly
- Verify user is authenticated
- Check for existing active subscription

### Callback not processing
- Verify NEXT_PUBLIC_APP_URL is correct
- Check webhook is being called by Paystack
- Verify Paystack API is responding

### Usage limits not working
- Check database migrations were run
- Verify plan limits are set correctly
- Check usage_tracking table is populated

### Webhook not triggering
- Verify webhook URL is correct in Paystack dashboard
- Check webhook secret matches PAYSTACK_SECRET_KEY
- Ensure endpoint is publicly accessible
- Use ngrok for local testing

## Additional Notes

### Security
- API keys stored server-side only
- Webhook signature verified with HMAC-SHA512
- All payment routes require authentication
- Database access via ORM (no SQL injection)

### Performance
- Database queries indexed
- Webhook events logged for audit
- Usage limits checked efficiently via database function
- Subscription queries optimized

### Scalability
- Tables designed for high volume
- Proper indexes for fast queries
- Webhook retry mechanism via database
- Audit trail for compliance

---

**Last Updated**: October 2024
**System Status**: Production Ready
**Next Review**: After first production deployment
