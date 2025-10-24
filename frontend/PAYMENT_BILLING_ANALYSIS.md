# MIVA University Frontend - Payment & Billing System Analysis

## Executive Summary
The MIVA University frontend application implements a **comprehensive Paystack-based subscription system** with two-tier pricing (PRO and MAX plans), usage tracking, and webhook handling. The system is fully integrated with Drizzle ORM for database operations and includes complete payment processing flows.

---

## 1. PAYMENT PROVIDER & INTEGRATION

### Primary Provider: **Paystack**
- **Payment Gateway**: Paystack (Nigerian payment processor)
- **API Documentation**: https://api.paystack.co
- **Integration Type**: Full subscription management with recurring billing
- **Currency**: NGN (Nigerian Naira)
- **Authentication**: Bearer token via `PAYSTACK_SECRET_KEY`

### Key Endpoints Used:
```
POST   /transaction/initialize    - Start payment
GET    /transaction/verify/       - Verify transaction
POST   /plan                      - Create subscription plans
GET    /plan                      - List plans
GET    /plan/{planCode}           - Get plan details
POST   /customer                  - Create customer
GET    /customer/{emailOrCode}    - Get customer
POST   /subscription/disable      - Cancel subscription
POST   /subscription/enable       - Reactivate subscription
GET    /subscription/{code}       - Get subscription details
GET    /subscription/{code}/manage/link  - Get management portal link
```

---

## 2. PRICING PLANS

### Two Subscription Tiers:

#### **PRO Plan - ₦2,500/month (250,000 kobo)**
- **Paystack Plan Code**: `PLN_pro_monthly`
- **Target**: Regular students
- **Features**:
  - AI Chat (30/day)
  - GPT-3.5 Turbo model
  - 3 Quizzes/week
  - 2 Exams/month
  - Basic Feedback
  - 5 Courses max
  - 2 Flashcard sets/week
  - 5 Practice problems/week
  - 1 Study guide/week
  - 10 Material searches/day
- **Limits**: Well-defined daily/weekly/monthly quotas

#### **MAX Plan - ₦5,500/month (550,000 kobo)**
- **Paystack Plan Code**: `PLN_max_monthly`
- **Target**: Serious students wanting unlimited access
- **Features**:
  - Unlimited AI Chat
  - GPT-4 + Claude 3.5
  - Unlimited Quizzes
  - Unlimited Exams
  - Detailed Feedback
  - Unlimited Courses
  - Unlimited Flashcards
  - Offline Mode
  - HD Videos
  - PDF Downloads
  - Analytics Dashboard
  - Past Question Analysis
  - Study Groups
- **Limits**: All features unlimited (value = -1)

### Pricing Comparison:
| Feature | FREE | PRO | MAX |
|---------|------|-----|-----|
| AI Messages/day | 0 | 30 | Unlimited |
| Quizzes/week | 0 | 3 | Unlimited |
| Model | None | GPT-3.5 | GPT-4 |
| Offline Mode | ❌ | ❌ | ✅ |
| Pricing | Free | ₦2,500/mo | ₦5,500/mo |

---

## 3. PAYMENT FLOW ARCHITECTURE

### Complete Payment Journey:

```
User → Pricing Page → Subscribe Button → Initialize Payment
   ↓
   Paystack Payment Gateway (Checkout)
   ↓
User Completes Payment → Callback Handler
   ↓
Verify Transaction → Create Subscription → Update User
   ↓
Webhook Events → Manage Subscription Lifecycle
```

### Step-by-Step Payment Flow:

#### **Step 1: Subscription Initialization** 
**Route**: `POST /api/subscription/initialize`
- Validates user authentication
- Checks for existing active subscriptions
- Retrieves plan details and Paystack plan code
- Initializes transaction with Paystack API
- Creates database transaction record (status: pending)
- Returns authorization URL + access code + reference

**Key Variables**:
```typescript
{
  email: "user@example.com",
  planCode: "PLN_pro_monthly",
  amount: 250000,  // in kobo
  callbackUrl: "${NEXT_PUBLIC_APP_URL}/api/subscription/callback",
  metadata: {
    userId: "uuid",
    planId: "uuid",
    planName: "PRO",
    userName: "John Doe"
  }
}
```

#### **Step 2: User Payment** 
- User redirected to Paystack checkout page
- Completes payment with card/bank transfer/USSD
- Paystack processes transaction
- Returns to callback URL with reference parameter

#### **Step 3: Callback Processing**
**Route**: `GET /api/subscription/callback?reference=...`
- Verifies transaction with Paystack
- Checks transaction status (success/failed)
- Creates user subscription record
- Updates user schema with subscription status
- Logs subscription change
- Redirects to pricing page with success/error message

**Data Stored on Success**:
```typescript
UserSubscription {
  userId, planId,
  paystackSubscriptionCode,
  paystackCustomerCode,
  paystackAuthorizationCode,
  status: "active",
  currentPeriodStart: now,
  currentPeriodEnd: now + 1 month,
  nextPaymentDate: now + 1 month
}
```

#### **Step 4: Webhook Handling**
**Route**: `POST /api/webhooks/paystack`
- Verifies webhook signature using HMAC-SHA512
- Logs webhook event
- Processes event based on type:

**Supported Events**:
- `subscription.create` - New subscription created
- `subscription.disable` - User cancelled subscription
- `subscription.not_renew` - Subscription won't auto-renew
- `charge.success` - Recurring charge successful
- `invoice.payment_failed` - Payment failed
- `invoice.update` - Invoice updated

**Key Event Handlers**:
- **charge.success**: Updates subscription period + creates transaction record
- **subscription.disable**: Marks subscription as cancelled
- **invoice.payment_failed**: Logs failed transaction

#### **Step 5: Subscription Management**
**Routes**:
- `GET /api/subscription/status` - Get current subscription + usage
- `POST /api/subscription/cancel` - Cancel at period end or immediately
- `GET /api/subscription/manage-link` - Get Paystack management portal link
- `GET /api/subscription/details` - Get full subscription details
- `GET /api/subscription/usage` - Get usage statistics

---

## 4. DATABASE SCHEMA

### Tables Created:

#### **subscription_plan**
```sql
- id (UUID, PK)
- name (TEXT, UNIQUE) - "PRO" or "MAX"
- display_name (TEXT)
- description (TEXT)
- price_ngn (INTEGER) - in kobo
- price_usd (INTEGER)
- interval (TEXT) - "monthly"
- features (JSONB) - array of feature strings
- limits (JSONB) - usage limits per feature
- paystack_plan_code (TEXT, UNIQUE)
- is_active (BOOLEAN)
- created_at, updated_at (TIMESTAMP)
```

#### **user_subscription**
```sql
- id (UUID, PK)
- user_id (UUID, FK)
- plan_id (UUID, FK)
- paystackSubscriptionCode (TEXT, UNIQUE)
- paystackCustomerCode (TEXT)
- paystackEmailToken (TEXT) - for disable/enable
- paystackAuthorizationCode (TEXT)
- status (TEXT) - "active", "cancelled", "expired"
- currentPeriodStart, currentPeriodEnd (TIMESTAMP)
- cancelAtPeriodEnd (BOOLEAN)
- cancelledAt (TIMESTAMP)
- nextPaymentDate, lastPaymentDate (TIMESTAMP)
- amountPaidNgn (INTEGER)
- trialStart, trialEnd (TIMESTAMP)
- metadata (JSONB)
- created_at, updated_at (TIMESTAMP)
```

#### **payment_transaction**
```sql
- id (UUID, PK)
- user_id (UUID, FK)
- subscription_id (UUID, FK)
- paystackReference (TEXT, UNIQUE)
- paystackTransactionId (TEXT)
- paystackAccessCode (TEXT)
- amountNgn (INTEGER)
- currency (TEXT) - "NGN"
- status (TEXT) - "pending", "success", "failed"
- paymentMethod (TEXT)
- customerEmail (TEXT)
- customerName (TEXT)
- description (TEXT)
- metadata (JSONB)
- paidAt (TIMESTAMP)
- created_at, updated_at (TIMESTAMP)
```

#### **usage_tracking**
```sql
- id (UUID, PK)
- user_id (UUID, FK)
- subscription_id (UUID, FK)
- usageType (TEXT) - "ai_messages_per_day", "quizzes_per_week", etc.
- periodType (TEXT) - "daily", "weekly", "monthly"
- periodStart, periodEnd (DATE)
- currentCount (INTEGER)
- limitCount (INTEGER)
- lastResetAt (TIMESTAMP)
- metadata (JSONB)
- UNIQUE constraint on (userId, usageType, periodType, periodStart)
```

#### **webhook_event**
```sql
- id (UUID, PK)
- eventType (TEXT) - Paystack event type
- paystackEventId (TEXT, UNIQUE)
- payload (JSONB) - full webhook payload
- signature (TEXT)
- processed (BOOLEAN)
- processedAt (TIMESTAMP)
- errorMessage (TEXT)
- retryCount (INTEGER)
- created_at (TIMESTAMP)
```

#### **subscription_change_log**
```sql
- id (UUID, PK)
- userId (UUID, FK)
- subscriptionId (UUID, FK)
- changeType (TEXT) - "upgrade", "downgrade", "cancel", "reactivate", "expire"
- fromPlanId, toPlanId (UUID, FK)
- reason (TEXT)
- metadata (JSONB)
- created_at (TIMESTAMP)
```

### Helper Functions:
```sql
has_active_subscription(user_id) → BOOLEAN
get_user_plan(user_id) → TEXT ("PRO", "MAX", or "FREE")
check_usage_limit(user_id, usage_type, period_type) → JSONB
increment_usage(user_id, usage_type, period_type, increment) → BOOLEAN
```

---

## 5. API ENDPOINTS

### Authentication Endpoints
```
POST   /api/auth/[...all]/*              - Better Auth endpoints
POST   /api/auth/register                - User registration
```

### Subscription Management
```
POST   /api/subscription/initialize      - Start subscription
GET    /api/subscription/callback        - Payment callback handler
GET    /api/subscription/status          - Get subscription status
POST   /api/subscription/cancel          - Cancel subscription
GET    /api/subscription/manage-link     - Get management portal link
GET    /api/subscription/details         - Full subscription details
GET    /api/subscription/usage           - Usage statistics
POST   /api/webhooks/paystack            - Webhook receiver
```

### Request/Response Examples:

#### Initialize Subscription
```javascript
// POST /api/subscription/initialize
Request: {
  planCode: "PLN_pro_monthly",
  planName: "PRO"
}

Response: {
  authorizationUrl: "https://checkout.paystack.com/...",
  reference: "unique_reference_string",
  accessCode: "access_code_string"
}
```

#### Verify Transaction (Paystack)
```javascript
// GET https://api.paystack.co/transaction/verify/{reference}
Response: {
  status: true,
  message: "Verification successful",
  data: {
    id: 1234567,
    reference: "...",
    amount: 250000,
    status: "success",
    customer: {
      id: 123,
      customer_code: "CUS_xxx",
      email: "user@example.com"
    },
    authorization: {
      authorization_code: "AUTH_xxx",
      card_type: "visa",
      last4: "8744",
      exp_month: "12",
      exp_year: "2026"
    },
    subscription: {
      subscription_code: "SUB_xxx",
      email_token: "token",
      next_payment_date: "2025-11-22",
      amount: 250000
    }
  }
}
```

---

## 6. FRONTEND COMPONENTS

### Pages

#### **Pricing Page** (`/pricing`)
- **File**: `/src/app/pricing/page.tsx`
- **Features**:
  - Displays PRO and MAX plans side-by-side
  - Shows current subscription status
  - Success/error message display
  - "Choose Your Learning Plan" headline
  - Why MIVA messaging
  - Call-to-action buttons

#### **Profile Billing Tab** (`/profile`)
- **File**: `/src/components/profile/billing-tab.tsx`
- **Features**:
  - Subscription Card (plan details, next billing)
  - Usage Stats Card (usage tracking)
  - Manage Subscription section
  - Payment History Table

### Reusable Components

#### **PricingCards** (`/src/components/pricing/pricing-cards.tsx`)
- Displays PRO and MAX plans
- Subscribe buttons with loading states
- Feature lists
- Current plan indicator
- Handles authentication redirect

#### **SubscriptionCard** (`/src/components/profile/subscription-card.tsx`)
- Shows current plan details
- Subscription status (active, expired, cancelled)
- Next billing date
- Payment method info
- Plan features list

#### **ManageSubscription** (`/src/components/profile/manage-subscription.tsx`)
- "Update Payment Method" button
- "Upgrade/Downgrade Plan" button
- "Cancel Subscription" button with confirmation dialog
- Reactivation prompt for expired subscriptions

#### **PaymentHistoryTable** (`/src/components/profile/payment-history-table.tsx`)
- Lists all transactions (20 most recent)
- Shows date, description, amount, status
- Responsive design (table on desktop, cards on mobile)
- Status badges (success, failed, pending)

#### **UsageStatsCard** (`/src/components/profile/usage-stats-card.tsx`)
- Shows current usage vs limits
- Progress bars for each usage type
- Displays: AI Messages/day, Quizzes/week, Exams/month, etc.
- "Unlimited" indicator for MAX plan
- Upgrade suggestion at 80% usage

---

## 7. PAYMENT SERVICE

### PaystackService Class
**File**: `/src/lib/payment/paystack-service.ts`

**Methods**:
```typescript
initializeSubscription(params)  - Start payment
verifyTransaction(reference)    - Verify payment status
createPlan(params)              - Create Paystack plan
getPlans()                      - List all plans
getPlan(planCode)               - Get single plan
createCustomer(params)          - Create customer
getCustomer(emailOrCode)        - Get customer info
disableSubscription(code, token)  - Cancel subscription
enableSubscription(code, token)   - Reactivate subscription
getSubscription(code)           - Get subscription details
listSubscriptions(page, perPage) - List subscriptions
getSubscriptionManageLink(code) - Get management portal
verifyWebhookSignature(payload, signature) - Verify webhook
koboToNaira(kobo)              - Convert currency
nairaToKobo(naira)             - Convert currency
formatAmount(kobo)             - Format for display
```

**Key Features**:
- HMAC-SHA512 webhook signature verification
- Full error handling and logging
- Kobo/Naira conversion utilities
- Type-safe interfaces for all requests/responses

---

## 8. SUBSCRIPTION REPOSITORY

### SubscriptionRepository Class
**File**: `/src/lib/db/pg/repositories/subscription-repository.pg.ts`

**Key Methods**:
```typescript
// Plans
getAllPlans()
getPlanByName(name)
getPlanById(id)

// Subscriptions
getUserActiveSubscription(userId)
createSubscription(data)
updateSubscription(id, updates)
cancelSubscription(id, cancelAtPeriodEnd)
getUserSubscriptionWithPlan(userId)

// Usage Tracking
checkUsageLimit(userId, usageType, periodType)
incrementUsage(userId, usageType, periodType, increment)
getUserUsage(userId, usageType, periodType)

// Transactions
createTransaction(data)
updateTransaction(reference, updates)
getTransactionByReference(reference)
getUserTransactionHistory(userId, limit)

// Logging
logSubscriptionChange(data)
getUserChangeLogs(userId, limit)
logWebhookEvent(data)
markWebhookProcessed(eventId, success, errorMessage)

// User Plan
getUserPlan(userId) → "PRO" | "MAX" | "FREE"
hasActiveSubscription(userId) → boolean
```

---

## 9. USAGE TRACKING & LIMITS

### Middleware for Usage Enforcement
**File**: `/src/lib/middleware/usage-check.ts`

**Features**:
- Check usage limits before actions
- Increment usage counters
- Get detailed usage information
- Return upgrade suggestions

**Usage Types Tracked**:
```typescript
AI_MESSAGES: "ai_messages_per_day"      // Daily limit
QUIZZES: "quizzes_per_week"              // Weekly limit
EXAMS: "exams_per_month"                 // Monthly limit
FLASHCARD_SETS: "flashcard_sets_per_week"
PRACTICE_PROBLEMS: "practice_problems_per_week"
STUDY_GUIDES: "study_guides_per_week"
MATERIAL_SEARCHES: "material_searches_per_day"
```

**Default Limits**:
| Feature | FREE | PRO | MAX |
|---------|------|-----|-----|
| AI Messages/day | 0 | 30 | -1 (unlimited) |
| Quizzes/week | 0 | 3 | -1 |
| Exams/month | 0 | 2 | -1 |
| Flashcard sets/week | 0 | 2 | -1 |
| Practice problems/week | 0 | 5 | -1 |
| Study guides/week | 0 | 1 | -1 |
| Material searches/day | 0 | 10 | -1 |
| Max courses | 0 | 5 | -1 |

---

## 10. ENVIRONMENT VARIABLES

### Required for Payment System
```env
# Paystack API Configuration
PAYSTACK_SECRET_KEY=sk_test_...          # Secret key for API
PAYSTACK_PUBLIC_KEY=pk_test_...          # Public key for frontend
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_... # Exposed public key

# Application URL (for payment callbacks)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database
POSTGRES_URL=postgres://user:pass@localhost:5432/db

# Authentication
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3000

# Optional: Plan Codes (after creation)
PRO_PLAN_CODE=PLN_pro_monthly
MAX_PLAN_CODE=PLN_max_monthly
```

---

## 11. SETUP & CONFIGURATION SCRIPTS

### Create Paystack Plans
```bash
pnpm paystack:create-plans
```
**File**: `/scripts/create-paystack-plans.ts`
- Creates PRO and MAX plans in Paystack
- Outputs plan codes for database update
- Validates API key before proceeding

### Update Plan Codes
```bash
PRO_PLAN_CODE=PLN_xxx MAX_PLAN_CODE=PLN_yyy pnpm paystack:update-codes
```
**File**: `/scripts/update-plan-codes.ts`
- Updates database with Paystack plan codes
- Links plans to payment provider

### Database Migrations
```bash
pnpm db:push                 # Deploy schema changes
pnpm db:migrate              # Run migrations
pnpm db:generate             # Generate types
```
**Migration File**: `/src/lib/db/migrations/pg/0019_subscription_system.sql`
- Creates all subscription tables
- Adds helper functions
- Indexes for performance
- Initial plan data

---

## 12. CURRENT IMPLEMENTATION STATUS

### What's Implemented ✅
1. **Payment Processing**
   - Paystack integration (initialize, verify, webhook)
   - Subscription creation and management
   - Transaction logging and history
   - Error handling for failed payments

2. **Database**
   - All tables created and indexed
   - Helper functions for usage checks
   - Audit logging for changes
   - Transaction history

3. **Frontend UI**
   - Pricing page with plan cards
   - Subscription management in profile
   - Payment history display
   - Usage tracking visualization
   - Upgrade/downgrade flows

4. **Subscription Lifecycle**
   - Initial subscription
   - Recurring payments (via Paystack)
   - Cancellation (at period end or immediate)
   - Webhook event handling
   - Status tracking

5. **Usage Enforcement**
   - Daily/weekly/monthly limits
   - Usage counter increments
   - Limit checking middleware
   - Upgrade suggestions

### What Needs Verification/Enhancement ⚠️
1. **Webhook Email Tokens**
   - `paystackEmailToken` not captured during initial payment
   - Needed for disable/enable subscription operations
   - May require additional Paystack configuration

2. **Plan Code Mapping**
   - Hardcoded as `PLN_pro_monthly` and `PLN_max_monthly`
   - Actual codes should match Paystack dashboard
   - Need setup script confirmation

3. **Subscription Renewals**
   - Handled via Paystack webhooks
   - Requires webhook endpoint to be publicly accessible
   - May need verification in production

4. **Currency Conversion**
   - All prices in NGN (Nigerian Naira)
   - USD prices stored but not implemented for UI
   - No dynamic currency conversion

5. **Trial Periods**
   - Database fields exist (trialStart, trialEnd)
   - Not implemented in payment flow
   - Could be added for freemium conversions

6. **Error Recovery**
   - Failed payments require manual dashboard intervention
   - No automatic retry mechanism for failed charges
   - Email notifications not configured

### Potential Issues 🔴
1. **Missing Email Token Capture**
   - Cannot disable subscriptions without email token
   - Paystack API returns token in verify response
   - Need to store during callback processing

2. **Webhook Signature Verification**
   - Uses HMAC-SHA512 with secret key
   - Secret key must be kept secure
   - No signature rotation mechanism

3. **No Stripe Backup**
   - Single payment provider (Paystack)
   - No fallback if Paystack is unavailable
   - Could integrate Stripe for diversification

4. **Usage Reset Logic**
   - Database has period fields but reset automation unclear
   - May need background job for monthly resets
   - Current implementation relies on date calculation

---

## 13. SECURITY CONSIDERATIONS

### What's Secure ✅
1. **Webhook Signature Verification** - HMAC-SHA512
2. **Database Access** - Drizzle ORM with prepared statements
3. **Session Management** - Better Auth with secure sessions
4. **API Key Storage** - Server-side environment variables only
5. **User Authentication** - Required for all payment routes

### Security Best Practices Needed ⚠️
1. **Rate Limiting** - Add rate limits to payment endpoints
2. **CORS Configuration** - Restrict payment endpoints
3. **Webhook Retry** - Implement exponential backoff
4. **Audit Logging** - More detailed logging of payment events
5. **PCI Compliance** - No card data stored directly
6. **HTTPS Only** - Ensure all payment traffic is encrypted

---

## 14. COMPLETE USER FLOW EXAMPLE

### Scenario: User subscribes to PRO plan

1. **User visits `/pricing`**
   - Page fetches active plans from database
   - Shows PRO and MAX cards
   - Displays current subscription status (if any)

2. **User clicks "Subscribe to PRO"**
   - Component calls `POST /api/subscription/initialize`
   - Endpoint checks authentication and existing subscriptions
   - Creates pending transaction in database
   - Calls Paystack to initialize subscription
   - Returns authorization URL

3. **User redirected to Paystack**
   - User completes payment
   - Paystack redirects to `GET /api/subscription/callback?reference=...`

4. **Callback Processing**
   - Endpoint verifies transaction with Paystack
   - Checks payment status
   - Creates `user_subscription` record
   - Updates `user` schema with subscription status
   - Logs change in `subscription_change_log`
   - Redirects to `/pricing?success=true&plan=PRO`

5. **User views subscription in profile**
   - `/profile` → billing tab loads
   - Fetches `/api/subscription/details`
   - Shows SubscriptionCard with current plan
   - Shows next billing date
   - Shows payment history

6. **Monthly recurring charge**
   - Paystack initiates charge automatically
   - Sends webhook event `charge.success`
   - Webhook handler updates subscription period
   - Creates transaction record
   - User continues to have access

7. **User cancels subscription**
   - Clicks "Cancel Subscription" button
   - Confirms cancellation
   - Calls `POST /api/subscription/cancel`
   - Calls Paystack to disable subscription
   - Updates subscription with `cancelAtPeriodEnd: true`
   - Access continues until `currentPeriodEnd`

---

## 15. DEPLOYMENT CHECKLIST

### Before Going Live
- [ ] Generate Paystack API keys (live, not test)
- [ ] Update `.env` with live Paystack secret/public keys
- [ ] Set `NEXT_PUBLIC_APP_URL` to production domain
- [ ] Configure webhook in Paystack dashboard
- [ ] Run database migrations: `pnpm db:push`
- [ ] Create plans in Paystack: `pnpm paystack:create-plans`
- [ ] Update plan codes: `pnpm paystack:update-codes`
- [ ] Test payment flow end-to-end
- [ ] Configure email notifications (if needed)
- [ ] Set up monitoring for webhook failures
- [ ] Configure backup payment provider (optional)
- [ ] Enable HTTPS for all payment endpoints
- [ ] Test subscription cancellation flow
- [ ] Verify usage limits are enforced
- [ ] Test upgrade/downgrade flows

---

## 16. TESTING PAYSTACK INTEGRATION

### Test Mode Credentials
Use these during development:
- **Paystack Instant URL**: https://checkout.paystack.com/

### Test Cards
```
Visa: 4084 0343 6173 6309  | CVV: 407  | Exp: 12/31
```

### Testing Webhooks Locally
1. Use ngrok to expose local server: `ngrok http 3000`
2. Update webhook URL in Paystack dashboard
3. Use Paystack's webhook test endpoint to send events

---

## 17. FILE STRUCTURE SUMMARY

```
frontend/
├── src/
│   ├── app/
│   │   ├── pricing/
│   │   │   └── page.tsx              # Pricing page
│   │   └── api/
│   │       ├── subscription/
│   │       │   ├── initialize/       # Start payment
│   │       │   ├── callback/         # Payment callback
│   │       │   ├── cancel/           # Cancel subscription
│   │       │   ├── manage-link/      # Management portal
│   │       │   ├── details/          # Get details
│   │       │   ├── status/           # Get status
│   │       │   └── usage/            # Get usage
│   │       └── webhooks/
│   │           └── paystack/         # Webhook handler
│   ├── components/
│   │   ├── pricing/
│   │   │   └── pricing-cards.tsx     # Plan cards
│   │   └── profile/
│   │       ├── billing-tab.tsx       # Billing view
│   │       ├── subscription-card.tsx # Current plan
│   │       ├── manage-subscription.tsx # Manage options
│   │       ├── payment-history-table.tsx # History
│   │       └── usage-stats-card.tsx  # Usage tracking
│   └── lib/
│       ├── payment/
│       │   └── paystack-service.ts   # Paystack API
│       ├── db/
│       │   ├── pg/
│       │   │   ├── schema.pg.ts      # Database tables
│       │   │   └── repositories/
│       │   │       └── subscription-repository.pg.ts
│       │   └── migrations/
│       │       └── pg/
│       │           └── 0019_subscription_system.sql
│       └── middleware/
│           └── usage-check.ts         # Usage enforcement
├── scripts/
│   ├── create-paystack-plans.ts       # Create plans
│   └── update-plan-codes.ts           # Update codes
├── package.json
└── .env.example                       # Config template
```

---

## CONCLUSIONS & RECOMMENDATIONS

### Strengths ✅
1. **Complete Implementation** - Payment system is fully functional
2. **Database Design** - Well-structured schema with indexes
3. **Security** - Webhook verification, server-side API keys
4. **UX** - Clear pricing page, subscription management
5. **Flexibility** - Usage limits configurable per plan
6. **Audit Trail** - Complete logging of changes and transactions

### Areas for Improvement ⚠️
1. **Email Token Capture** - Add to callback processing
2. **Automation** - Add background jobs for cleanup/renewal
3. **Notifications** - Email receipts and renewal reminders
4. **Retry Logic** - Exponential backoff for failed webhooks
5. **Monitoring** - Add alerts for payment failures
6. **Documentation** - Add inline code comments
7. **Testing** - Add integration tests for payment flows

### Next Steps 🚀
1. Verify Paystack plan codes match actual dashboard codes
2. Test full payment flow in staging environment
3. Implement missing email token capture
4. Set up webhook monitoring and alerts
5. Configure email notifications
6. Add comprehensive logging
7. Deploy to production with live API keys
