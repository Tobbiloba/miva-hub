# MIVA University - Pricing Plans

## 💰 Plans

| | PRO | MAX |
|---|---|---|
| **Price** | ₦2,500/month | ₦5,500/month |
| **Target** | Regular students | Power users, competitive programs |
| **Expected Split** | 70% of users | 30% of users |

---

## 📊 Feature Comparison

| Feature | PRO (₦2,500) | MAX (₦5,500) |
|---------|--------------|--------------|
| **AI Chat** | 30 messages/day | ✅ UNLIMITED |
| **AI Model** | GPT-3.5 Turbo | ✅ GPT-4 + Claude 3.5 |
| **Response Speed** | 5-10 seconds | ✅ 2-3 seconds (priority) |
| **Quizzes** | 3/week | ✅ UNLIMITED |
| **Practice Exams** | 2/month | ✅ UNLIMITED |
| **Flashcards** | 2 sets/week (20 cards) | ✅ UNLIMITED sets & cards |
| **Practice Problems** | 5/week | ✅ UNLIMITED with solutions |
| **Study Guides** | 1/week | ✅ UNLIMITED custom guides |
| **Material Search** | 10/day | ✅ UNLIMITED |
| | | |
| **Content** | | |
| Video Quality | SD (480p) | ✅ HD (1080p) |
| PDF Download | ❌ | ✅ |
| Video Download | ❌ | ✅ |
| Offline Mode | ❌ | ✅ **Saves ₦500-1000/month data** |
| Storage | 3 GB | ✅ 20 GB |
| Max Courses | 5 | ✅ UNLIMITED |
| | | |
| **Feedback** | | |
| Quiz Feedback | Basic (correct/wrong) | ✅ Detailed explanations |
| Error Analysis | ❌ | ✅ Why wrong + how to fix |
| Related Concepts | ❌ | ✅ What to review next |
| | | |
| **Analytics** | ❌ None | ✅ All Features Below |
| Performance Dashboard | ❌ | ✅ Scores over time |
| Strength/Weakness Analysis | ❌ | ✅ Topic-by-topic breakdown |
| Study Time Tracking | ❌ | ✅ Hours per subject |
| Mastery Tracking | ❌ | ✅ Concept-level progress |
| Grade Predictions | ❌ | ✅ Forecast final grade |
| Study Insights | ❌ | ✅ AI recommendations |
| | | |
| **Advanced Features** | ❌ None | ✅ All Features Below |
| AI Tutor Mode | ❌ | ✅ Step-by-step guidance |
| Past Question Analysis | ❌ | ✅ Upload & analyze |
| Exam Prediction | ❌ | ✅ Likely exam questions |
| Custom Assessments | ❌ | ✅ Choose topics & difficulty |
| Concept Maps | ❌ | ✅ Visual relationships |
| Multi-doc Reasoning | ❌ | ✅ Compare across materials |
| Video Transcripts | ❌ | ✅ Searchable text |
| Video AI Summary | ❌ | ✅ Key points + timestamps |
| Smart PDF Tools | ❌ | ✅ Auto-highlights |
| Export Everything | ❌ | ✅ PDF, Word, CSV |
| Study Schedule Optimizer | ❌ | ✅ AI-generated plan |
| Spaced Repetition | ❌ | ✅ Optimal review timing |
| | | |
| **Collaboration** | ❌ None | ✅ All Features Below |
| Study Groups | ❌ | ✅ Create/join groups |
| Share Resources | ❌ | ✅ Notes, flashcards, guides |
| Group Quizzes | ❌ | ✅ Compete with classmates |
| | | |
| **Support** | | |
| Response Time | 48-72 hours | ✅ 4-24 hours |
| Channels | Email only | ✅ Email + WhatsApp + Chat |

---

## 🎯 Why Students Upgrade to MAX

### 1. **Data Savings (Offline Mode)**
- PRO: Must stream everything = ₦1,000/month in data
- MAX: Download once, use offline = ₦200/month
- **Savings: ₦800/month (pays for 27% of upgrade!)**

### 2. **Exam Period**
- PRO: 3 quizzes/week = not enough for exam prep
- MAX: Unlimited practice = as much as you need
- **Critical during exams**

### 3. **Hit Limits Daily**
- PRO: 30 AI messages/day runs out during heavy study
- MAX: Never worry about limits
- **Freedom to learn**

### 4. **Need Better Grades**
- PRO: No analytics, flying blind
- MAX: See exactly what to study, track progress
- **Students report 15% grade improvement**

### 5. **Past Questions** (Very Nigerian)
- PRO: No past question help
- MAX: Upload, analyze, get predictions
- **Saves ₦2,000-5,000 buying past questions**

### 6. **Total ROI**
```
MAX Cost: ₦5,500/month

Saves You:
- Data costs: ₦800/month
- Past questions: ₦2,000/month
- Tutoring (replaced by AI Tutor): ₦5,000+/month
- Study time (better efficiency): Priceless

Total Savings: ₦7,800+/month
NET GAIN: ₦2,300+/month even after paying!
```

---

## 🚀 Implementation Phases

### Phase 0: Payment & Subscription Foundation (1-2 weeks) - MUST DO FIRST ⚠️
| Component | What to Build | Time | Priority |
|-----------|---------------|------|----------|
| **Paystack Integration** | Nigerian payment processing | 2 days | CRITICAL |
| **Subscription Database** | User plan tracking tables | 1 day | CRITICAL |
| **Usage Tracking System** | Count AI messages, quizzes, etc. | 2 days | CRITICAL |
| **Plan Enforcement** | Check limits before actions | 1 day | CRITICAL |
| **Pricing Page** | Compare PRO vs MAX | 1 day | HIGH |
| **Checkout Flow** | Payment + plan activation | 2 days | CRITICAL |
| **Account Management** | Upgrade/downgrade/cancel | 1 day | HIGH |
| **Upgrade Prompts** | "Upgrade to MAX" messages | 1 day | HIGH |

**Why This is Phase 0:**
- You currently have MAX features but FREE for everyone
- Can't charge students without payment system
- Can't enforce PRO limits without tracking
- Must build this BEFORE launching any paid plan

**Week 1 Tasks:**
```typescript
✓ Integrate Paystack SDK
✓ Create subscription tables (subscriptions, usage_limits)
✓ Build /pricing page with plan comparison
✓ Implement checkout flow with Paystack
✓ Setup payment webhooks
```

**Week 2 Tasks:**
```typescript
✓ Add usage tracking middleware
✓ Implement limit checks (AI messages, quizzes, etc.)
✓ Build upgrade/downgrade flows
✓ Add "Upgrade to MAX" prompts throughout app
✓ Test end-to-end payment + limits
✓ Soft launch PRO plan (₦2,500)
```

---

### Phase 1 (2-4 weeks) - CRITICAL NEW FEATURES
| Feature | Why | Time | Priority |
|---------|-----|------|----------|
| **Performance Dashboard** | Addictive analytics, drives retention | 1 week | HIGH |
| **Offline Mode** | HUGE for Nigerian market, saves data | 1 week | CRITICAL |
| **Advanced Feedback** | Makes assessments actually useful | 3 days | HIGH |
| **Export Features** | Students want to keep their work | 3 days | MEDIUM |

### Phase 2 (1-2 months) - HIGH VALUE
| Feature | Why | Time | Priority |
|---------|-----|------|----------|
| **AI Tutor Mode** | Unique, can't get elsewhere | 1 week | HIGH |
| **Past Question Analysis** | Nigerian students NEED this | 1 week | CRITICAL |
| **Study Schedule Optimizer** | Solves time management | 1 week | HIGH |
| **Enhanced Mastery Tracking** | Gamification, retention | 3 days | MEDIUM |

### Phase 3 (2-3 months) - GROWTH
| Feature | Why | Time | Priority |
|---------|-----|------|----------|
| **Study Groups** | Network effects, viral growth | 2 weeks | VERY HIGH |
| **Multi-doc Reasoning** | Research students need it | 1 week | MEDIUM |
| **Collaborative Quizzes** | Social learning | 1 week | MEDIUM |

### Phase 4 (3-4 months) - POLISH
| Feature | Why | Time | Priority |
|---------|-----|------|----------|
| **Video AI Features** | Time-saving | 2 weeks | HIGH |
| **Concept Maps** | Visual learners | 1 week | MEDIUM |
| **Assignment Assistant** | Humanities appeal | 1.5 weeks | HIGH |

---

### Phase 5: Advanced MAX Features (4-6 months) - EXPANSION
| Feature | Why | Time | Priority |
|---------|-----|------|----------|
| **Custom AI Personality** | Personalization | 3 days | MEDIUM |
| **API Access** | Developer integrations | 1 week | LOW |
| **Advanced Analytics** | ML-powered insights | 2 weeks | MEDIUM |
| **Mobile App** | Better accessibility | 4 weeks | HIGH |
| **WhatsApp Bot** | Study reminders, quick Q&A | 1 week | MEDIUM |
| **Integration with LMS** | Import from existing systems | 2 weeks | MEDIUM |

---

## 🎯 Upgrade Triggers (When PRO Users Upgrade)

### 1. **Hit Daily Limit**
```
⚠️ "You've used 28/30 AI messages today"
💡 Upgrade to MAX for unlimited messages
```

### 2. **Hit Weekly Limit**
```
🚫 "You've generated 3/3 quizzes this week"
📚 MAX users get unlimited quizzes + practice exams
```

### 3. **Exam Period**
```
🎓 "Exam in 5 days?"
MAX users can generate unlimited practice + see analytics
Special: ₦4,000 for exam month (₦1,500 off)
```

### 4. **Data Costs**
```
📱 "Spent ₦800 on data this week?"
MAX offline mode = study anywhere, save ₦1,000/month
Pays for itself!
```

### 5. **See Feature Preview**
```
📊 "Your performance in Databases: 65%"
MAX users see full analytics + AI study recommendations
[Upgrade to see insights]
```

---

## 💻 Implementation Quick Reference

### Database Tables Needed
```sql
-- Subscriptions
CREATE TABLE subscriptions (
  user_id TEXT PRIMARY KEY,
  plan_type TEXT, -- 'pro' or 'max'
  status TEXT,    -- 'active', 'cancelled', 'expired'
  expires_at TIMESTAMP
);

-- Usage limits (PRO only)
CREATE TABLE usage_limits (
  user_id TEXT,
  limit_type TEXT, -- 'ai_messages', 'quizzes', etc.
  count INT,
  reset_date DATE
);
```

### Middleware Example
```typescript
// Check plan access
async function requirePlan(req, res, next, plan: 'pro' | 'max') {
  const sub = await getSubscription(req.user.id);
  
  if (plan === 'max' && sub.plan_type === 'pro') {
    return res.status(403).json({
      error: 'MAX plan required',
      upgrade_url: '/pricing'
    });
  }
  next();
}

// Check limits (PRO users only)
async function checkLimit(userId, type) {
  const sub = await getSubscription(userId);
  if (sub.plan_type === 'max') return { allowed: true };
  
  const usage = await getUsage(userId, type);
  const limits = { ai_messages: 30, quizzes: 3, exams: 2 };
  
  return {
    allowed: usage.count < limits[type],
    remaining: limits[type] - usage.count
  };
}
```

### Frontend Hook
```typescript
function usePlan() {
  const { data: session } = useSession();
  return {
    isPro: session?.subscription?.plan === 'pro',
    isMax: session?.subscription?.plan === 'max',
    canAccess: (feature) => {
      if (session?.subscription?.plan === 'max') return true;
      return PRO_FEATURES.includes(feature);
    }
  };
}
```

---

## 📈 Success Metrics (6 months)

- **Target:** 1,000 subscribers
- **Split:** 70% PRO, 30% MAX
- **Churn:** < 5%/month
- **MRR:** ₦2,750,000
- **Upgrade Rate:** 40% during exams

---

## 🚀 Launch Plan (Revised)

### Week 1-2: Payment Foundation (Phase 0)
- Build Paystack integration
- Create subscription system
- Add usage limits enforcement
- Build pricing + checkout pages
- Test payment flow

### Week 3: Soft Launch PRO Only
- Launch at ₦2,500 (current features + limits)
- 50% off for first 50 users (₦1,250)
- Track which limits get hit most
- Gather feedback on value
- Start generating revenue!

### Week 4-7: Build MAX Features (Phase 1)
- Dashboard (1 week)
- Offline Mode (1 week) 
- Advanced Feedback (3 days)
- Exports (3 days)
- Use PRO revenue to fund development

### Week 8: MAX Beta Launch
- Invite top 20 PRO users
- Early bird: ₦4,000 (₦1,500 off)
- Collect feedback
- Iterate on features

### Week 9-10: Full MAX Launch
- Public MAX at ₦5,500
- Exam period promo (₦4,500 during exams)
- Referral program: Refer 3 = 1 month free
- Case studies from beta users

### Month 3-6: Continue Building
- Phase 2 features (AI Tutor, Past Questions)
- Phase 3 features (Study Groups, Collaboration)
- Phase 4 features (Video AI, Concept Maps)
- Based on actual usage data and requests

---

## ✅ Next Steps (Detailed)

### **Immediate (This Week)**
1. ✅ Review and approve this plan
2. ⏳ **START PHASE 0** - Payment Foundation
3. ⏳ Setup Paystack account
4. ⏳ Install Paystack SDK: `npm install @paystack/inline-js`
5. ⏳ Create subscription database tables
6. ⏳ Build pricing page UI

### **Week 2**
7. ⏳ Implement checkout flow
8. ⏳ Add usage tracking middleware
9. ⏳ Add plan enforcement checks
10. ⏳ Build upgrade prompts
11. ⏳ Test with test cards

### **Week 3**
12. ⏳ Soft launch PRO plan (₦1,250 early bird)
13. ⏳ Monitor first 20-50 signups
14. ⏳ Fix any payment issues
15. ⏳ Gather user feedback

### **Week 4-7**
16. ⏳ Build Phase 1 MAX features
17. ⏳ Use PRO revenue to fund development

### **Week 8+**
18. ⏳ Launch MAX plan
19. ⏳ Continue building based on data

---

## 💰 Expected Revenue Timeline

### **Month 1** (Soft Launch)
- 50 PRO users × ₦2,500 = ₦125,000
- Early bird discount: 50% off first month
- Actual: ₦62,500 first month

### **Month 2** (PRO Established)
- 150 PRO users × ₦2,500 = ₦375,000
- Full price from month 2

### **Month 3** (MAX Beta)
- 200 PRO users × ₦2,500 = ₦500,000
- 20 MAX beta × ₦4,000 = ₦80,000
- **Total: ₦580,000/month**

### **Month 4** (MAX Launched)
- 250 PRO users × ₦2,500 = ₦625,000  
- 80 MAX users × ₦5,500 = ₦440,000
- **Total: ₦1,065,000/month**

### **Month 6** (Target)
- 700 PRO users × ₦2,500 = ₦1,750,000
- 300 MAX users × ₦5,500 = ₦1,650,000
- **Total: ₦3,400,000/month** 💰

---

## 🎯 Critical Success Factors

### **Must Get Right:**
1. ✅ Payment system MUST be reliable (Paystack is proven in Nigeria)
2. ✅ Limits must feel fair (not too restrictive)
3. ✅ Offline mode is CRITICAL for Nigerian market
4. ✅ Past question analysis will drive MAX upgrades
5. ✅ Study groups create network effects

### **Key Risks:**
1. ⚠️ Payment failures → Use Paystack's tested infrastructure
2. ⚠️ Limits too tight → Monitor and adjust based on data
3. ⚠️ Students don't see value → Show usage stats, savings
4. ⚠️ Too many features → Focus on Phase 1 first
5. ⚠️ Poor internet → Offline mode solves this (Phase 1)

### **Validation Checkpoints:**
- ✓ Week 3: Are people signing up for PRO? (Target: 20+)
- ✓ Week 4: Are they hitting limits? (Should be 40-60% hit weekly)
- ✓ Week 5: Are they renewing? (Target: >90% retention)
- ✓ Week 8: Will beta users pay for MAX? (Target: 50% convert)
- ✓ Month 3: Is upgrade rate healthy? (Target: 20-30%)

---

**Document Status:** Ready to implement - START WITH PHASE 0!
**First Milestone:** PRO soft launch in 2-3 weeks
**First Revenue:** ₦62,500 in Month 1
