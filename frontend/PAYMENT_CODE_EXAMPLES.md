# Payment/Billing System - Code Examples & Reference

## 1. PAYSTACK SERVICE - COMPLETE API WRAPPER

### File: `/src/lib/payment/paystack-service.ts`

```typescript
// Initialize subscription for user
const response = await paystackService.initializeSubscription({
  email: "user@example.com",
  planCode: "PLN_pro_monthly",
  amount: 250000,  // in kobo (₦2,500)
  callbackUrl: "https://app.com/api/subscription/callback",
  metadata: {
    userId: "user-uuid",
    planId: "plan-uuid",
    planName: "PRO"
  }
});
// Returns: { authorizationUrl, reference, accessCode }

// Verify payment
const verification = await paystackService.verifyTransaction("reference_code");
// Returns: { status, data: { customer, authorization, subscription } }

// Verify webhook signature
const isValid = paystackService.verifyWebhookSignature(payloadString, signature);

// Currency conversion
const naira = paystackService.koboToNaira(250000);  // 2500
const kobo = paystackService.nairaToKobo(2500);      // 250000
const formatted = paystackService.formatAmount(250000);  // "₦2,500.00"
```

## 2. API ROUTE - SUBSCRIPTION INITIALIZATION

### File: `/src/app/api/subscription/initialize/route.ts`

```typescript
// Request
{
  planCode: "PLN_pro_monthly",
  planName: "PRO"
}

// Process
1. Check authentication
2. Verify no existing active subscription
3. Get plan from database
4. Call Paystack API
5. Create pending transaction record
6. Return authorization URL

// Response
{
  authorizationUrl: "https://checkout.paystack.com/...",
  reference: "transaction_reference",
  accessCode: "access_code_for_redirect"
}

// Database transaction created:
{
  userId: "uuid",
  paystackReference: "reference",
  amountNgn: 250000,
  status: "pending",
  customerEmail: "user@example.com",
  customerName: "John Doe",
  metadata: {
    planId: "uuid",
    planName: "PRO"
  }
}
```

## 3. PAYMENT CALLBACK - VERIFICATION & SUBSCRIPTION CREATION

### File: `/src/app/api/subscription/callback/route.ts`

```typescript
// GET /api/subscription/callback?reference=xxx

// Step 1: Verify with Paystack
const verification = await paystackService.verifyTransaction(reference);
if (!verification.status || verification.data.status !== "success") {
  return NextResponse.redirect("/pricing?error=payment_failed");
}

// Step 2: Get transaction details
const transaction = await subscriptionRepository.getTransactionByReference(reference);

// Step 3: Create subscription
const subscription = await subscriptionRepository.createSubscription({
  userId: transaction.userId,
  planId: planId,
  paystackSubscriptionCode: verification.data.subscription?.subscription_code,
  paystackCustomerCode: verification.data.customer.customer_code,
  paystackAuthorizationCode: verification.data.authorization.authorization_code,
  currentPeriodStart: new Date(),
  currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  nextPaymentDate: new Date(verification.data.subscription?.next_payment_date)
});

// Step 4: Update user subscription status
await db.update(UserSchema)
  .set({
    paystackCustomerCode: verification.data.customer.customer_code,
    subscriptionStatus: "active",
    currentPlan: plan.name
  })
  .where(eq(UserSchema.id, transaction.userId));

// Step 5: Log change
await subscriptionRepository.logSubscriptionChange({
  userId: transaction.userId,
  subscriptionId: subscription.id,
  changeType: "upgrade",
  toPlanId: plan.id,
  reason: "Initial subscription purchase"
});

// Redirect to success page
return NextResponse.redirect("/pricing?success=true&plan=PRO");
```

## 4. WEBHOOK HANDLER - RECURRING PAYMENTS & LIFECYCLE

### File: `/src/app/api/webhooks/paystack/route.ts`

```typescript
// POST /api/webhooks/paystack

// Verify signature
const isValid = paystackService.verifyWebhookSignature(body, signature);

// Process events
switch (event.event) {
  case "charge.success":
    // Recurring charge successful
    const [subscription] = await db
      .select()
      .from(UserSubscriptionSchema)
      .where(eq(UserSubscriptionSchema.paystackSubscriptionCode, data.subscription.subscription_code));
    
    if (subscription) {
      // Update subscription period
      const currentPeriodEnd = new Date(subscription.currentPeriodEnd);
      const nextMonth = new Date(currentPeriodEnd);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      
      await subscriptionRepository.updateSubscription(subscription.id, {
        lastPaymentDate: new Date(),
        currentPeriodStart: currentPeriodEnd,
        currentPeriodEnd: nextMonth,
        nextPaymentDate: nextMonth,
        amountPaidNgn: data.amount,
        status: "active"
      });
      
      // Create transaction record
      await subscriptionRepository.createTransaction({
        userId: subscription.userId,
        subscriptionId: subscription.id,
        paystackReference: data.reference,
        amountNgn: data.amount,
        status: "success",
        description: "Monthly subscription renewal"
      });
    }
    break;

  case "subscription.disable":
    // User cancelled subscription
    await subscriptionRepository.updateSubscription(subscription.id, {
      status: "cancelled",
      cancelledAt: new Date()
    });
    
    await db.update(UserSchema)
      .set({
        subscriptionStatus: "cancelled",
        currentPlan: "FREE"
      })
      .where(eq(UserSchema.id, subscription.userId));
    break;

  case "invoice.payment_failed":
    // Payment failed - log it
    await subscriptionRepository.createTransaction({
      userId: subscription.userId,
      status: "failed",
      description: "Failed subscription renewal"
    });
    break;
}
```

## 5. SUBSCRIPTION CANCELLATION

### File: `/src/app/api/subscription/cancel/route.ts`

```typescript
// POST /api/subscription/cancel
// Request: { immediate: false }  // false = cancel at period end

const subscription = await subscriptionRepository.getUserActiveSubscription(userId);

// Call Paystack to disable
if (subscription.paystackSubscriptionCode && subscription.paystackEmailToken) {
  const response = await paystackService.disableSubscription(
    subscription.paystackSubscriptionCode,
    subscription.paystackEmailToken
  );
}

// Mark for cancellation
const cancelled = await subscriptionRepository.cancelSubscription(
  subscription.id,
  !immediate  // true = cancel at period end
);

// If immediate, update user status
if (immediate) {
  await db.update(UserSchema)
    .set({
      subscriptionStatus: "cancelled",
      currentPlan: "FREE"
    })
    .where(eq(UserSchema.id, userId));
}

// Log change
await subscriptionRepository.logSubscriptionChange({
  userId,
  subscriptionId: subscription.id,
  changeType: "cancel",
  fromPlanId: subscription.planId,
  reason: immediate ? "Immediate cancellation" : "Cancel at period end"
});
```

## 6. PRICING PAGE COMPONENT

### File: `/src/components/pricing/pricing-cards.tsx`

```typescript
export function PricingCards({ plans, currentSubscription, isLoggedIn }) {
  const [loading, setLoading] = useState<string | null>(null);
  
  const handleSubscribe = async (plan: Plan) => {
    // Check authentication
    if (!isLoggedIn) {
      router.push("/sign-in?redirect=/pricing");
      return;
    }
    
    // Initialize payment
    const response = await fetch("/api/subscription/initialize", {
      method: "POST",
      body: JSON.stringify({
        planName: plan.name,
        planCode: plan.paystackPlanCode
      })
    });
    
    const data = await response.json();
    
    // Redirect to Paystack
    if (data.authorizationUrl) {
      window.location.href = data.authorizationUrl;
    }
  };
  
  return (
    <div className="grid gap-8 md:grid-cols-2">
      {/* PRO Card */}
      <Card>
        <CardHeader>
          <CardTitle>PRO</CardTitle>
          <CardDescription>Perfect for regular students</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">₦2,500<span className="text-lg">/month</span></div>
          
          {isCurrentPlan(proPlan.id) ? (
            <Button disabled>Current Plan</Button>
          ) : (
            <Button onClick={() => handleSubscribe(proPlan)}>
              Subscribe to PRO
            </Button>
          )}
          
          <ul className="space-y-2">
            {plan.features.map(feature => (
              <li key={feature}>
                <CheckCircle2 className="inline mr-2 h-4 w-4" />
                {feature}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      
      {/* MAX Card */}
      {/* Similar structure for MAX plan */}
    </div>
  );
}
```

## 7. SUBSCRIPTION STATUS API

### File: `/src/app/api/subscription/status/route.ts`

```typescript
// GET /api/subscription/status

const subscription = await subscriptionRepository.getUserActiveSubscription(userId);
const plan = await subscriptionRepository.getUserPlan(userId);
const usageInfo = await getUserUsageInfo(userId);
const changeLogs = await subscriptionRepository.getUserChangeLogs(userId, 5);

return NextResponse.json({
  subscription: subscription ? {
    id: subscription.id,
    status: subscription.status,  // "active", "cancelled", "expired"
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    nextPaymentDate: subscription.nextPaymentDate,
    lastPaymentDate: subscription.lastPaymentDate,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    cancelledAt: subscription.cancelledAt
  } : null,
  plan: planDetails ? {
    name: planDetails.name,
    displayName: planDetails.displayName,
    priceNgn: planDetails.priceNgn,
    features: planDetails.features,
    limits: planDetails.limits
  } : { name: "FREE", displayName: "Free Plan" },
  usage: usageInfo?.usage,
  changeLogs
});
```

## 8. USAGE TRACKING & LIMITS

### File: `/src/lib/middleware/usage-check.ts`

```typescript
// Check if user can perform action
const usageCheck = await checkUsageLimit(req, "ai_messages_per_day", "daily");

if (!usageCheck.allowed) {
  return NextResponse.json(
    {
      error: "Usage limit exceeded",
      data: {
        current: usageCheck.data?.current,    // 30 (used today)
        limit: usageCheck.data?.limit,        // 30 (PRO plan limit)
        remaining: 0,
        plan: "PRO",
        upgradeUrl: "/pricing"
      }
    },
    { status: 429 }
  );
}

// Increment usage after action
await incrementUsageCount(userId, "ai_messages_per_day", "daily");

// Get detailed usage info
const usageInfo = await getUserUsageInfo(userId);
console.log(usageInfo);
// {
//   plan: "PRO",
//   hasActiveSubscription: true,
//   usage: {
//     aiMessages: { allowed: false, current: 30, limit: 30 },
//     quizzes: { allowed: true, current: 2, limit: 3 },
//     exams: { allowed: true, current: 1, limit: 2 }
//   }
// }
```

## 9. SUBSCRIPTION REPOSITORY - DATABASE OPERATIONS

### File: `/src/lib/db/pg/repositories/subscription-repository.pg.ts`

```typescript
// Get all active plans
const plans = await subscriptionRepository.getAllPlans();

// Get user's current subscription
const sub = await subscriptionRepository.getUserActiveSubscription(userId);

// Create new subscription
const newSub = await subscriptionRepository.createSubscription({
  userId,
  planId,
  paystackSubscriptionCode: "SUB_xxx",
  paystackCustomerCode: "CUS_xxx",
  paystackAuthorizationCode: "AUTH_xxx",
  currentPeriodStart: new Date(),
  currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  nextPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
});

// Update subscription
await subscriptionRepository.updateSubscription(subId, {
  status: "active",
  lastPaymentDate: new Date(),
  currentPeriodEnd: newEndDate
});

// Cancel subscription
await subscriptionRepository.cancelSubscription(subId, true); // true = at period end

// Check usage limit
const usage = await subscriptionRepository.checkUsageLimit(
  userId,
  "ai_messages_per_day",
  "daily"
);
// Returns: { allowed: boolean, current: number, limit: number, remaining: number }

// Increment usage
const success = await subscriptionRepository.incrementUsage(
  userId,
  "ai_messages_per_day",
  "daily",
  1  // increment by 1
);

// Get user plan
const plan = await subscriptionRepository.getUserPlan(userId); // "PRO", "MAX", or "FREE"

// Get transaction history
const history = await subscriptionRepository.getUserTransactionHistory(userId, 20);

// Log subscription change
await subscriptionRepository.logSubscriptionChange({
  userId,
  subscriptionId: subId,
  changeType: "upgrade",  // or "downgrade", "cancel", "reactivate", "expire"
  toPlanId: newPlanId,
  reason: "User initiated"
});

// Webhook logging
const event = await subscriptionRepository.logWebhookEvent({
  eventType: "charge.success",
  paystackEventId: "12345",
  payload: { /* full webhook data */ },
  signature: "hash"
});

await subscriptionRepository.markWebhookProcessed(eventId, true); // or false with error
```

## 10. DATABASE SCHEMA - TABLES

### File: `/src/lib/db/pg/schema.pg.ts`

```typescript
// Subscription Plans
export const SubscriptionPlanSchema = pgTable("subscription_plan", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),  // "PRO" or "MAX"
  displayName: text("display_name").notNull(),
  priceNgn: integer("price_ngn").notNull(),  // in kobo
  features: json("features").default([]),    // ["AI Chat (30/day)", ...]
  limits: json("limits").default({}),        // { ai_messages_per_day: 30, ... }
  paystackPlanCode: text("paystack_plan_code").unique(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`)
});

// User Subscriptions
export const UserSubscriptionSchema = pgTable("user_subscription", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => UserSchema.id),
  planId: uuid("plan_id").notNull().references(() => SubscriptionPlanSchema.id),
  status: text("status").default("active"),  // "active", "cancelled", "expired"
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  nextPaymentDate: timestamp("next_payment_date"),
  lastPaymentDate: timestamp("last_payment_date"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  cancelledAt: timestamp("cancelled_at"),
  paystackSubscriptionCode: text("paystack_subscription_code").unique(),
  paystackCustomerCode: text("paystack_customer_code"),
  paystackAuthorizationCode: text("paystack_authorization_code"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`)
});

// Payment Transactions
export const PaymentTransactionSchema = pgTable("payment_transaction", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => UserSchema.id),
  subscriptionId: uuid("subscription_id").references(() => UserSubscriptionSchema.id),
  paystackReference: text("paystack_reference").notNull().unique(),
  amountNgn: integer("amount_ngn").notNull(),
  status: text("status").notNull(),  // "pending", "success", "failed"
  customerEmail: text("customer_email"),
  description: text("description"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`)
});

// Usage Tracking
export const UsageTrackingSchema = pgTable("usage_tracking", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => UserSchema.id),
  usageType: text("usage_type").notNull(),  // "ai_messages_per_day", etc
  periodType: text("period_type").notNull(),  // "daily", "weekly", "monthly"
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  currentCount: integer("current_count").default(0),
  limitCount: integer("limit_count"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`)
});
```

## 11. DATABASE HELPER FUNCTIONS

### File: `/src/lib/db/migrations/pg/0019_subscription_system.sql`

```sql
-- Check if user has active subscription
SELECT has_active_subscription(user_id) AS has_subscription;

-- Get user's current plan
SELECT get_user_plan(user_id) AS plan_name;  -- Returns "PRO", "MAX", or "FREE"

-- Check usage limit and get details
SELECT check_usage_limit(user_id, 'ai_messages_per_day', 'daily') AS usage_status;
-- Returns: { allowed: bool, current: int, limit: int, remaining: int }

-- Increment usage counter
SELECT increment_usage(user_id, 'ai_messages_per_day', 'daily', 1) AS success;
```

## 12. PROFILE COMPONENTS - BILLING TAB

### File: `/src/components/profile/billing-tab.tsx`

```typescript
export function BillingTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetch("/api/subscription/details")
      .then(res => res.json())
      .then(setData);
  }, []);
  
  if (!data) return <NoSubscriptionState />;
  
  return (
    <div className="space-y-6">
      {/* Current subscription details */}
      <SubscriptionCard 
        subscription={data.subscription.subscription}
        plan={data.subscription.plan}
      />
      
      {/* Usage statistics */}
      <UsageStatsCard />
      
      {/* Management options */}
      <ManageSubscription 
        subscription={data.subscription.subscription}
        currentPlan={data.subscription.plan}
        availablePlans={data.availablePlans}
      />
      
      {/* Payment history */}
      <PaymentHistoryTable transactions={data.transactions} />
    </div>
  );
}
```

## 13. ENVIRONMENT VARIABLES

### `.env` or `.env.local`

```env
# Paystack Payment Configuration
PAYSTACK_SECRET_KEY=sk_live_xxxxxxxxxxxx
PAYSTACK_PUBLIC_KEY=pk_live_xxxxxxxxxxxx
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_xxxxxxxxxxxx

# Payment callback URL
NEXT_PUBLIC_APP_URL=https://miva.example.com

# Database
POSTGRES_URL=postgresql://user:password@host/database

# Authentication
BETTER_AUTH_SECRET=your-secret-key-here
BETTER_AUTH_URL=https://miva.example.com
```

## 14. SETUP SCRIPTS

### Create Paystack Plans
```bash
# Run this script
pnpm paystack:create-plans

# Output will show:
# ✅ Created plan: MIVA PRO Monthly
#    Plan Code: PLN_xxxxx
#    Plan ID: 12345
#    Amount: ₦2,500

# Then update database:
PRO_PLAN_CODE=PLN_xxxxx MAX_PLAN_CODE=PLN_yyyyy pnpm paystack:update-codes
```

## 15. ERROR HANDLING EXAMPLES

```typescript
// Payment initialization error
{
  error: "You already have an active subscription",
  status: 400
}

// Callback error
/pricing?error=payment_failed
/pricing?error=transaction_not_found
/pricing?error=invalid_plan

// Usage limit exceeded
{
  error: "Usage limit exceeded",
  status: 429,
  data: {
    current: 30,
    limit: 30,
    plan: "PRO",
    upgradeUrl: "/pricing"
  }
}

// Webhook error
{
  processed: false,
  errorMessage: "Subscription not found",
  retryCount: 0
}
```

---

## Summary

The payment system consists of:
- **PaystackService** - API wrapper
- **SubscriptionRepository** - Database operations
- **API Routes** - Initialize, callback, cancel, webhooks
- **Components** - Pricing, billing, subscription management
- **Database** - 6 tables with proper indexes and relationships
- **Middleware** - Usage tracking and limit enforcement

All code is type-safe with TypeScript and includes proper error handling.
