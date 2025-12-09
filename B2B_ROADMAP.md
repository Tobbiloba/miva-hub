# MIVA B2B Platform Roadmap

## Vision

Transform MIVA from a single-institution AI study platform into a multi-tenant B2B SaaS that any university/school can deploy for their students.

**Target customers:** Universities, colleges, secondary schools, training institutions across Africa and beyond.

**Revenue model:** Schools pay, students get free access.

---

## Business Model

### Who Pays:
**Institutions pay** → All their students get full access (free for students)

No student subscriptions. No freemium for students. Simple B2B.

### Why This Model:

| Student Pays | School Pays |
|--------------|-------------|
| Low conversion (5-10%) | One deal = all students |
| ₦1,500 × 100 students = ₦150k | ₦200k-500k for 5,000 students |
| Students complain about cost | Students love it (free for them) |
| University doesn't care | University promotes adoption |
| Support: thousands of individuals | Support: one admin per school |

### Pricing Tiers:

| Tier | Students | Price/Month (NGN) | Price/Year (NGN) |
|------|----------|-------------------|------------------|
| Starter | Up to 500 | ₦100,000 | ₦1,000,000 |
| Growth | Up to 2,000 | ₦300,000 | ₦3,000,000 |
| Pro | Up to 10,000 | ₦700,000 | ₦7,000,000 |
| Enterprise | Unlimited | Custom | Custom |

**Alternative: Per-student pricing**
- ₦50-100 per student/month
- ₦500-1,000 per student/year
- Example: 5,000 students × ₦75/month = ₦375,000/month

### Payment Methods:
- **Card (Paystack):** Self-serve, smaller institutions
- **Bank Transfer:** Larger institutions
- **Invoice:** Government/enterprise institutions

---

## Current State

### What We Have:
- Working AI study platform (chat, flashcards, quizzes, study guides)
- Student portal with dashboard, courses, assignments, grades, analytics
- Faculty portal with course management, grading
- MCP server with academic tools
- Performance analytics with charts

### What Needs to Change:
- Remove student subscription/payment system
- Add institution-level billing
- Add multi-tenancy (everything assumes single institution)
- Add institution admin dashboard
- Add super admin dashboard (for MIVA team)
- Add white-labeling (branding per institution)
- Add bulk user management
- Add SSO (Google Workspace, Microsoft)

### Code to Remove:
- Student pricing page
- Student subscription components
- Student payment flow (Paystack for individuals)
- Student billing UI in profile
- Usage limits per student tier
- PRO/MAX individual plans

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      MIVA Platform                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Super Admin Portal (/admin)                             │   │
│  │ - MIVA team manages all institutions                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│          ┌───────────────────┼───────────────────┐             │
│          ▼                   ▼                   ▼             │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐       │
│  │ Institution A│   │ Institution B│   │ Institution C│  ...  │
│  │ (unilag)     │   │ (covenant)   │   │ (babcock)    │       │
│  │              │   │              │   │              │       │
│  │ Admin Portal │   │ Admin Portal │   │ Admin Portal │       │
│  │ Faculty      │   │ Faculty      │   │ Faculty      │       │
│  │ Students     │   │ Students     │   │ Students     │       │
│  └──────────────┘   └──────────────┘   └──────────────┘       │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                    Shared Infrastructure                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│  │ PostgreSQL  │ │ MCP Server  │ │ AI Providers│              │
│  │ (multi-     │ │ (academic   │ │ (OpenAI,    │              │
│  │  tenant)    │ │  tools)     │ │  Anthropic) │              │
│  └─────────────┘ └─────────────┘ └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

---

## User Roles & Access

| Role | Portal | Scope | Who |
|------|--------|-------|-----|
| Super Admin | `/admin/*` | All institutions | MIVA team |
| Institution Admin | `/institution/*` | Their institution only | University IT/registrar |
| Faculty | `/faculty/*` | Their courses only | Professors |
| Student | `/student/*` | Their data only | Students (FREE access) |

---

## Phase 1: Multi-Tenant Database + Auth Foundations (Week 1-2)

### Goal:
Add institution isolation to the database, set up role system, and migrate existing data. This is the foundation everything else builds on.

### New Tables:

```sql
-- Core institution table
CREATE TABLE institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,              -- "University of Lagos"
    slug VARCHAR(100) UNIQUE NOT NULL,       -- "unilag" (for URLs)
    domain VARCHAR(255),                      -- "unilag.edu.ng" (for email validation)
    logo_url TEXT,
    primary_color VARCHAR(7) DEFAULT '#3B82F6',
    secondary_color VARCHAR(7) DEFAULT '#1E40AF',

    -- Settings
    settings JSONB DEFAULT '{}',              -- Feature flags, limits, etc.

    -- Subscription (institution pays)
    subscription_tier VARCHAR(50) DEFAULT 'trial',  -- trial, starter, growth, pro, enterprise
    subscription_status VARCHAR(50) DEFAULT 'active', -- active, past_due, cancelled, suspended
    student_limit INTEGER DEFAULT 100,        -- Max students for this tier
    trial_ends_at TIMESTAMP,
    subscription_ends_at TIMESTAMP,

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Institution administrators
CREATE TABLE institution_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'admin',        -- owner, admin, support
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(institution_id, user_id)
);

-- Institution billing
CREATE TABLE institution_billing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    billing_email VARCHAR(255),
    billing_name VARCHAR(255),               -- Contact person
    billing_phone VARCHAR(50),
    billing_address TEXT,
    payment_method VARCHAR(50),              -- card, bank_transfer, invoice
    paystack_customer_code VARCHAR(255),     -- If using Paystack
    paystack_subscription_code VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Institution invoices
CREATE TABLE institution_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) UNIQUE,       -- INV-2024-001
    amount INTEGER NOT NULL,                 -- Amount in kobo/cents
    currency VARCHAR(3) DEFAULT 'NGN',
    status VARCHAR(50) DEFAULT 'pending',    -- pending, paid, overdue, cancelled
    description TEXT,                        -- "Growth Plan - January 2025"
    due_date DATE,
    paid_at TIMESTAMP,
    payment_reference VARCHAR(255),          -- Bank transfer ref or Paystack ref
    invoice_pdf_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Institution payments (track all payments)
CREATE TABLE institution_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES institution_invoices(id),
    amount INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'NGN',
    payment_method VARCHAR(50),              -- card, bank_transfer
    payment_reference VARCHAR(255),
    status VARCHAR(50) DEFAULT 'success',    -- success, failed, pending
    paystack_reference VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Tables to Modify (add institution_id):

```sql
-- Add institution_id to existing tables:
ALTER TABLE users ADD COLUMN institution_id UUID REFERENCES institutions(id);
ALTER TABLE departments ADD COLUMN institution_id UUID REFERENCES institutions(id);
ALTER TABLE courses ADD COLUMN institution_id UUID REFERENCES institutions(id);
ALTER TABLE course_materials ADD COLUMN institution_id UUID REFERENCES institutions(id);
ALTER TABLE assignments ADD COLUMN institution_id UUID REFERENCES institutions(id);
ALTER TABLE announcements ADD COLUMN institution_id UUID REFERENCES institutions(id);
ALTER TABLE academic_sessions ADD COLUMN institution_id UUID REFERENCES institutions(id);
ALTER TABLE student_enrollments ADD COLUMN institution_id UUID REFERENCES institutions(id);
ALTER TABLE assignment_submissions ADD COLUMN institution_id UUID REFERENCES institutions(id);
ALTER TABLE threads ADD COLUMN institution_id UUID REFERENCES institutions(id);  -- Chat threads

-- Add role to users table
ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'student';
-- Values: 'super_admin', 'institution_admin', 'faculty', 'student'

-- Create indexes for performance
CREATE INDEX idx_users_institution ON users(institution_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_departments_institution ON departments(institution_id);
CREATE INDEX idx_courses_institution ON courses(institution_id);
CREATE INDEX idx_course_materials_institution ON course_materials(institution_id);
CREATE INDEX idx_assignments_institution ON assignments(institution_id);
CREATE INDEX idx_threads_institution ON threads(institution_id);
```

### File Storage Structure:

```
S3 Bucket: miva-files
├── /{institution_id}/
│   ├── /logo/                    -- Institution logo
│   ├── /materials/               -- Course materials
│   │   └── /{course_id}/
│   ├── /assignments/             -- Assignment submissions
│   │   └── /{assignment_id}/
│   └── /profiles/                -- User profile photos
│       └── /{user_id}/
```

### Tables to Remove (student billing):

```sql
-- Remove these tables (or keep for historical data, but stop using):
-- user_subscriptions (student subscriptions)
-- subscription_plans (individual plans like PRO, MAX)
-- payment_transactions (student payments)
-- usage_tracking (per-student usage limits)
```

### Migration Strategy:

1. Create new institution tables
2. Insert first institution (MIVA) with generated UUID
3. Add `institution_id` column to all relevant tables (nullable first)
4. Add `role` column to users table
5. Update all existing rows to have MIVA's institution_id
6. Update existing faculty users to have role='faculty', students to role='student'
7. Create first super_admin user (your account)
8. Make `institution_id` NOT NULL (except for super_admin users)
9. Add foreign key constraints and indexes
10. Update all queries to filter by institution_id

### Existing Data Migration:

```typescript
// 1. Create MIVA as first institution
const mivaInstitution = await db.institutions.create({
  name: 'MIVA University',
  slug: 'miva',
  domain: 'miva.edu.ng',
  subscription_tier: 'enterprise',  // Grandfather them in
  subscription_status: 'active',
  student_limit: 999999,  // Unlimited for first institution
});

// 2. Update all existing users
await db.users.updateMany({
  data: { institution_id: mivaInstitution.id }
});

// 3. Set roles based on existing data
await db.users.updateMany({
  where: { /* existing faculty indicator */ },
  data: { role: 'faculty' }
});

// 4. Handle existing student subscriptions
// Option A: Ignore them (school now pays)
// Option B: Refund active subscriptions
// Option C: Let them expire naturally
// Recommendation: Option A - just stop enforcing, school is "paid"
```

### What Happens to Existing Student Subscriptions:
- **Don't refund** - too complex, small amounts
- **Don't enforce** - remove subscription checks
- **Let expire** - they just stop mattering
- **Students get full access** - MIVA is now a "paid" institution

### Access Control Logic:

```typescript
// Check if student has access (simple now!)
const hasAccess = (student, institution) => {
  // If institution subscription is active, student has full access
  return institution.subscription_status === 'active';
};

// No more checking student.subscription_tier
// No more usage limits per student
// Institution pays = all students get everything
```

### Tasks:
- [ ] Create migration file for new institution tables
- [ ] Create migration to add institution_id to existing tables
- [ ] Create migration to remove/deprecate student subscription tables
- [ ] Update Drizzle schema definitions
- [ ] Create seed script for first institution
- [ ] Run migrations and verify data integrity
- [ ] Update SubscriptionGuard to check institution status (not student)

---

## Phase 2: Remove Student Billing + Update Portals (Week 2-3)

### Goal:
Remove all student-facing payment code and update existing portals to work with multi-tenancy. Clean slate before building new features.

### Why Now (Not Later):
- Can't have two billing systems running
- Existing portals need institution context before we build admin dashboards
- Simpler to remove old code early

### Files to Modify/Remove:

```
Remove/Update:
├── /app/pricing/                      → Remove or redirect to B2B page
├── /components/pricing/               → Remove student pricing cards
├── /components/profile/billing-tab    → Remove or show "Provided by school"
├── /components/profile/subscription-* → Remove all
├── /components/subscription-guard     → Update to check institution.subscription_status
├── /api/subscription/*                → Remove student endpoints
├── /lib/payment/paystack-service      → Keep but update for institution billing later
```

### Update SubscriptionGuard:

```typescript
// OLD (student pays):
const hasAccess = user.subscription?.status === 'active';

// NEW (school pays):
const hasAccess = user.institution?.subscription_status === 'active';
```

### Update All Data Fetching:

```typescript
// Every repository/query needs institution_id
// Example: getCourses
const getCourses = async (institutionId: string) => {
  return db.courses.findMany({
    where: { institution_id: institutionId }
  });
};

// Example: API route
export async function GET(req) {
  const session = await getSession();
  const institutionId = session.user.institution_id;

  const courses = await getCourses(institutionId);
  return Response.json(courses);
}
```

### Update MCP Server:

```python
# All tools need institution_id parameter
# Frontend passes it from user session

@mcp.tool()
async def get_course_materials(
    course_code: str,
    student_id: str,
    institution_id: str  # NEW - Required
) -> str:
    # Validate student belongs to institution
    # Query with institution_id filter
```

### Tasks:
- [ ] Update SubscriptionGuard component
- [ ] Remove student pricing page
- [ ] Remove subscription components from profile
- [ ] Remove student payment API routes
- [ ] Update all repository functions with institution_id
- [ ] Update all API routes to pass institution_id
- [ ] Update MCP server tools with institution_id
- [ ] Add "subscription inactive" page for expired institutions
- [ ] Test existing student/faculty flows still work

---

## Phase 3: Institution Admin Dashboard (Week 3-5)

### Goal:
Build the admin interface for university administrators to manage their institution.

### URL Structure:
```
/institution
├── /page.tsx                      → Dashboard overview
├── /users
│   ├── /page.tsx                  → User management landing
│   ├── /students/page.tsx         → Student list + management
│   ├── /students/import/page.tsx  → Bulk CSV import
│   ├── /faculty/page.tsx          → Faculty list + management
│   └── /admins/page.tsx           → Admin user management
├── /academics
│   ├── /page.tsx                  → Academics overview
│   ├── /departments/page.tsx      → Department management
│   ├── /programs/page.tsx         → Programs/majors
│   ├── /courses/page.tsx          → Course management
│   └── /sessions/page.tsx         → Academic sessions/semesters
├── /content
│   ├── /page.tsx                  → Content overview
│   ├── /materials/page.tsx        → Course materials management
│   └── /announcements/page.tsx    → Announcements
├── /analytics
│   ├── /page.tsx                  → Analytics dashboard
│   ├── /usage/page.tsx            → AI usage stats
│   └── /engagement/page.tsx       → Student engagement
├── /settings
│   ├── /page.tsx                  → Settings overview
│   ├── /branding/page.tsx         → Logo, colors
│   ├── /features/page.tsx         → Feature toggles
│   └── /billing/page.tsx          → Subscription, invoices, payments
```

### Key Components to Build:

```
/components/institution/
├── institution-sidebar.tsx        → Navigation sidebar
├── institution-header.tsx         → Top header with institution name
├── stats-cards.tsx                → Dashboard stat cards
├── users-table.tsx                → Reusable user data table
├── courses-table.tsx              → Course data table
├── bulk-import-dialog.tsx         → CSV import modal
├── create-user-dialog.tsx         → Add user form
├── create-course-dialog.tsx       → Add course form
├── analytics-charts.tsx           → Usage/engagement charts
├── branding-form.tsx              → Logo/color settings
├── billing-overview.tsx           → Current plan, usage, invoices
└── upgrade-plan-dialog.tsx        → Upgrade subscription
```

### Dashboard Page Features:

```typescript
// /institution/page.tsx shows:
- Total students (active vs limit)
- Total faculty
- Total courses
- AI queries this month
- Active users this week
- Subscription status (plan, renewal date)
- Recent activity feed
- Quick actions (add user, create course)
- Usage chart (last 30 days)
```

### Billing Page Features:

```typescript
// /institution/settings/billing/page.tsx shows:
- Current plan (Starter/Growth/Pro/Enterprise)
- Student count vs limit (450 / 500 students)
- Next billing date
- Payment method on file
- Invoice history (download PDFs)
- Upgrade plan button
- Update payment method
- Cancel subscription
```

### Tasks:
- [ ] Create institution layout with sidebar
- [ ] Build dashboard page with stats
- [ ] Build students management page
- [ ] Build faculty management page
- [ ] Build bulk CSV import flow
- [ ] Build courses management page
- [ ] Build departments management page
- [ ] Build analytics pages (reuse existing chart components)
- [ ] Build settings/branding page
- [ ] Build settings/billing page
- [ ] Add institution context to all API routes

---

## Phase 4: Super Admin Dashboard (Week 5-6)

### Goal:
Build the admin interface for MIVA team to manage all institutions.

### URL Structure:
```
/admin
├── /page.tsx                      → Platform overview
├── /institutions
│   ├── /page.tsx                  → All institutions list
│   ├── /[id]/page.tsx             → Single institution details
│   └── /new/page.tsx              → Onboard new institution
├── /billing
│   ├── /page.tsx                  → Revenue overview
│   ├── /invoices/page.tsx         → All invoices
│   └── /payments/page.tsx         → All payments
├── /analytics
│   └── /page.tsx                  → Platform-wide analytics
└── /settings
    └── /page.tsx                  → Platform settings
```

### Dashboard Shows:
- Total institutions (by tier)
- Total students across all institutions
- Monthly recurring revenue (MRR)
- New institutions this month
- Institutions by status (active, trial, past_due, churned)
- Revenue chart (monthly trend)
- Top institutions by usage
- Upcoming renewals
- Overdue invoices (need attention)

### Institution Management:
- List all institutions with search/filter
- View institution details (users, usage, billing)
- Manually create invoice
- Manually activate/suspend institution
- Login as institution admin (impersonation for support)
- Extend trial period
- Apply custom pricing

### Tasks:
- [ ] Create admin layout with sidebar
- [ ] Build platform dashboard
- [ ] Build institutions list page
- [ ] Build institution detail page
- [ ] Build new institution onboarding flow
- [ ] Build billing/revenue pages
- [ ] Build invoice creation tool
- [ ] Add super admin role checks to all routes

---

## Phase 5: White-Labeling (Week 6-7)

### Goal:
Allow each institution to have their own branding and optionally their own subdomain.

### Subdomain Routing:

```
unilag.mivahub.com    → Institution: University of Lagos
covenant.mivahub.com  → Institution: Covenant University
mivahub.com/admin     → Super admin (no institution context)
```

### Implementation:

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host');
  const subdomain = hostname?.split('.')[0];

  if (subdomain && subdomain !== 'www' && subdomain !== 'mivahub') {
    // Lookup institution by slug
    // Add institution context to request
    // Rewrite to institution routes
  }
}
```

### Dynamic Theming:

```typescript
// Load institution theme
const institution = await getInstitutionBySlug(subdomain);

// Apply CSS variables
<style>
  :root {
    --primary: ${institution.primary_color};
    --secondary: ${institution.secondary_color};
  }
</style>

// Show institution logo
<img src={institution.logo_url} />
```

### Tasks:
- [ ] Implement subdomain routing middleware
- [ ] Create institution context provider
- [ ] Build dynamic theme system
- [ ] Update all pages to use institution branding
- [ ] Add logo upload to settings
- [ ] Add color picker to settings
- [ ] Test subdomain routing locally

---

## Phase 6: Onboarding Flow (Week 7-8)

### Goal:
Create smooth onboarding for new institutions.

### Sales-Assisted Flow (Primary):

```
1. Sales team talks to university
2. Sales creates institution in super admin
3. Sets pricing, student limit
4. Sends invite link to institution admin
5. Admin creates account, sets password
6. Setup wizard:
   a. Basic info (confirm name, add logo, colors)
   b. Create departments
   c. Import courses (CSV or manual)
   d. Invite faculty (CSV or manual)
   e. Import students (CSV)
7. Platform ready to use
8. Invoice sent, payment collected
```

### Self-Serve Flow (Secondary):

```
1. Admin visits mivahub.com/signup
2. Enters: Institution name, their email, password
3. Email verification
4. Select plan (starts with trial)
5. Setup wizard (same as above)
6. Trial starts (14 days)
7. Before trial ends: Add payment method
8. Converts to paid or churns
```

### Setup Wizard Pages:

```
/onboarding
├── /welcome             → Introduction, what to expect
├── /branding            → Name, logo, colors
├── /departments         → Create departments
├── /courses             → Import or create courses
├── /faculty             → Invite faculty members
├── /students            → Import students (CSV)
└── /complete            → Success, go to dashboard
```

### Tasks:
- [ ] Build institution signup page
- [ ] Create onboarding wizard flow
- [ ] Build each wizard step
- [ ] Create admin invite system
- [ ] Build CSV import for courses, faculty, students
- [ ] Create trial management (start, remind, expire)
- [ ] Email templates for onboarding

---

## Phase 7: Institution Billing System (Week 8-9)

### Goal:
Implement institution-level billing and payments.

### Billing Features:

**For Institution Admins:**
- View current plan and usage
- View invoice history
- Download invoice PDFs
- Update payment method
- Upgrade/downgrade plan

**For Super Admins:**
- Create manual invoices
- Record manual payments (bank transfers)
- Adjust subscription manually
- View revenue reports
- Send payment reminders

### Invoice Generation:

```typescript
// Auto-generate monthly invoices
const generateMonthlyInvoice = async (institution) => {
  const invoice = await db.institutionInvoices.create({
    institution_id: institution.id,
    invoice_number: `INV-${year}-${month}-${seq}`,
    amount: institution.plan.price,
    currency: 'NGN',
    description: `${institution.plan.name} - ${monthName} ${year}`,
    due_date: addDays(new Date(), 14),
    status: 'pending'
  });

  // Generate PDF
  // Send email notification
};
```

### Payment Methods:

```typescript
// Paystack (card payments)
const paystackPayment = async (invoice, cardDetails) => {
  // Charge card via Paystack
  // Update invoice status
  // Activate/extend subscription
};

// Bank Transfer (manual)
const recordBankTransfer = async (invoice, reference) => {
  // Super admin records payment
  // Update invoice status
  // Activate/extend subscription
};
```

### Tasks:
- [ ] Build invoice generation system
- [ ] Build invoice PDF generation
- [ ] Implement Paystack for institution cards
- [ ] Build manual payment recording (super admin)
- [ ] Create billing dashboard for institutions
- [ ] Create revenue dashboard for super admin
- [ ] Build payment reminder emails
- [ ] Handle subscription expiration gracefully

---

## Phase 8: Testing & Launch (Week 9-11)

### Goal:
Ensure platform is secure, reliable, and ready for customers.

### Security Checklist:
- [ ] Institution data isolation (no cross-access)
- [ ] Role-based access control working
- [ ] API routes protected by role
- [ ] File uploads scoped to institution
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] Rate limiting per institution

### Testing:
- [ ] Create test institutions (2-3)
- [ ] Test complete onboarding flow
- [ ] Test all admin functions
- [ ] Test student/faculty flows with institution context
- [ ] Test billing flows (invoice, payment, expiration)
- [ ] Load testing with multiple institutions
- [ ] Security audit

### Launch Prep:
- [ ] Marketing site (B2B focused homepage)
- [ ] Pricing page for institutions
- [ ] Contact/demo booking form
- [ ] Product deck (PDF/slides)
- [ ] Security documentation
- [ ] Identify 3-5 pilot institutions
- [ ] Offer free/discounted pilots
- [ ] Collect feedback and testimonials

---

## Timeline Summary

| Phase | Duration | What |
|-------|----------|------|
| 1 | Week 1-2 | Multi-tenant database + Auth foundations |
| 2 | Week 2-3 | Remove student billing + Update existing portals |
| 3 | Week 3-5 | Institution admin dashboard |
| 4 | Week 5-6 | Super admin dashboard |
| 5 | Week 6-7 | White-labeling (subdomains, branding) |
| 6 | Week 7-8 | Onboarding flow |
| 7 | Week 8-9 | Institution billing system |
| 8 | Week 9-11 | Testing & launch prep |

**Total: ~11 weeks to B2B ready**

### Why This Order:

1. **Database first** - Everything depends on `institution_id`
2. **Remove student billing early** - Clean slate, no conflicting code
3. **Update portals before building new** - Existing features must work with multi-tenancy
4. **Admin dashboards** - Now we can build management features
5. **White-labeling** - Each school gets their branding
6. **Onboarding** - Get new schools in
7. **Billing** - Charge them
8. **Testing** - Make sure nothing breaks

---

## Future Enhancements (Post-Launch)

### Near-term:
- [ ] SSO (Google Workspace, Microsoft Azure AD)
- [ ] LMS integrations (Moodle LTI, Canvas LTI)
- [ ] Embeddable widget (CDN script for external sites)
- [ ] Mobile app
- [ ] Advanced analytics and reports

### Long-term:
- [ ] AI-generated video explanations
- [ ] Audio overviews (podcast-style)
- [ ] Mind maps and concept visualization
- [ ] Plagiarism detection
- [ ] Proctored exams
- [ ] Multi-language support

---

## Success Metrics

### Business Metrics:
- Number of paying institutions
- Monthly recurring revenue (MRR)
- Average revenue per institution
- Churn rate
- Trial to paid conversion rate

### Platform Metrics:
- Total students across institutions
- Monthly active users
- AI queries per month
- Feature adoption rates

### Product Metrics:
- Time to first value (onboarding completion time)
- Daily/weekly active usage
- Support tickets per institution
- NPS score

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Long sales cycles | Slow growth | Offer free trials, pilot programs |
| Price sensitivity | Lost deals | Flexible pricing, show ROI |
| Data breach | Reputation, legal | Security audit, penetration testing |
| Scaling issues | Lost customers | Load testing, auto-scaling |
| Competition | Lost deals | Focus on Africa, local support, relationships |

---

## Next Steps

1. **Review this roadmap** - Adjust priorities as needed
2. **Start Phase 1** - Multi-tenant database schema and migration
3. **Identify pilot customers** - Start conversations with universities now
4. **Set up project tracking** - GitHub issues or project board

---

*Last updated: December 2024*
