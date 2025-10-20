# Phase 1: Quick Start Guide
## Get Started in 30 Minutes

**Last Updated:** 2025-01-19  
**Priority:** START NOW ⚡

---

## ✅ Pre-flight Checklist (5 minutes)

Run these commands to verify your environment is ready:

```bash
# 1. Check database is running
pnpm db:studio
# ✓ Should open Drizzle Studio
# ✓ Look for: subscription_plan, user_subscription tables

# 2. Verify dependencies
grep "recharts" package.json
# ✓ Should show: "recharts": "^2.15.4"

# 3. Check Study Buddy API
curl http://localhost:8083/health
# ✓ Should return 200 OK
# ✗ If not: Start it first

# 4. Verify Paystack scripts exist
grep "paystack" package.json
# ✓ Should show paystack:create-plans and paystack:update-codes

# 5. Check current branch
git branch
# Should be on 'main' or 'development'
```

**✅ If all checks pass, continue. If not, fix issues first.**

---

## 🚀 Step 1: Setup (10 minutes)

```bash
# 1. Create feature branch
git checkout -b feature/phase-1-max-features
git push -u origin feature/phase-1-max-features

# 2. Verify database migrations are current
pnpm db:push
# This will sync any pending schema changes

# 3. Check Study Buddy API (if not running)
cd mcp-server
source .venv/bin/activate  # or activate on Windows
python src/api/study_buddy_api.py
# Should start on port 8083

# 4. In another terminal, start frontend dev server
cd frontend
pnpm dev
# Should start on port 3000
```

---

## 💡 Step 2: Quick Win - Basic Export (1 hour)

**Why this first?** Immediate value, tests end-to-end flow, builds confidence.

### Create Export Service

```bash
# Create directory structure
mkdir -p frontend/src/lib/export
touch frontend/src/lib/export/export-service.ts
```

**File: `frontend/src/lib/export/export-service.ts`**

```typescript
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export class ExportService {
  async exportGradesAsPDF(data: any, studentInfo: any): Promise<void> {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('Academic Transcript', 14, 20);
    doc.setFontSize(12);
    doc.text(`Student: ${studentInfo.name}`, 14, 30);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 35);
    
    // Grades table
    autoTable(doc, {
      startY: 45,
      head: [['Course', 'Grade', 'Credits']],
      body: data.grades.map((g: any) => [
        g.courseCode,
        g.letterGrade,
        g.credits
      ]),
    });
    
    doc.save(`transcript_${studentInfo.studentId}.pdf`);
  }
}

export const exportService = new ExportService();
```

### Add Export Button

**File: `frontend/src/components/export/export-button.tsx`**

```typescript
'use client';

import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { exportService } from '@/lib/export/export-service';

export function ExportButton({ data, studentInfo }: any) {
  const handleExport = async () => {
    try {
      await exportService.exportGradesAsPDF(data, studentInfo);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <Button onClick={handleExport} variant="outline">
      <Download className="mr-2 h-4 w-4" />
      Export PDF
    </Button>
  );
}
```

### Integrate into Grades Page

**File: `frontend/src/app/student/grades/page.tsx` (add at top)**

```typescript
import { ExportButton } from '@/components/export/export-button';

// In the return JSX, add:
<ExportButton data={gradesSummary} studentInfo={studentInfo} />
```

### Test It

1. Navigate to `/student/grades`
2. Click "Export PDF"
3. PDF should download with grades table

**✅ If this works, you've proven the flow! Continue to Step 3.**

---

## 🗄️ Step 3: Database Setup (2 hours)

### Create Migration File

```bash
touch frontend/src/lib/db/migrations/pg/0001_performance_tracking.sql
```

**File: `frontend/src/lib/db/migrations/pg/0001_performance_tracking.sql`**

```sql
-- Performance History Table
CREATE TABLE IF NOT EXISTS performance_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES course(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL,
    average_grade DECIMAL(5,2),
    assignments_completed INTEGER DEFAULT 0,
    assignments_total INTEGER DEFAULT 0,
    study_time_minutes INTEGER DEFAULT 0,
    recorded_at TIMESTAMP DEFAULT NOW(),
    semester TEXT NOT NULL,
    UNIQUE(student_id, course_id, week_number, semester)
);

CREATE INDEX idx_perf_history_student ON performance_history(student_id, recorded_at DESC);
CREATE INDEX idx_perf_history_course ON performance_history(course_id, semester);

-- Concept Mastery Table
CREATE TABLE IF NOT EXISTS concept_mastery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES course(id) ON DELETE CASCADE,
    concept_name TEXT NOT NULL,
    mastery_level DECIMAL(3,2) DEFAULT 0.0 CHECK (mastery_level >= 0 AND mastery_level <= 1),
    correct_attempts INTEGER DEFAULT 0,
    total_attempts INTEGER DEFAULT 0,
    last_practiced_at TIMESTAMP,
    first_learned_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(student_id, course_id, concept_name)
);

CREATE INDEX idx_concept_mastery_student ON concept_mastery(student_id, course_id);
CREATE INDEX idx_concept_mastery_level ON concept_mastery(mastery_level);

-- Study Sessions Table
CREATE TABLE IF NOT EXISTS study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    course_id UUID REFERENCES course(id) ON DELETE SET NULL,
    session_type TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    activity_data JSONB,
    started_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_study_sessions_student ON study_sessions(student_id, started_at DESC);
CREATE INDEX idx_study_sessions_course ON study_sessions(course_id, started_at DESC);

-- Grade Predictions Table
CREATE TABLE IF NOT EXISTS grade_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES course(id) ON DELETE CASCADE,
    predicted_final_grade DECIMAL(5,2),
    confidence_level DECIMAL(3,2) CHECK (confidence_level >= 0 AND confidence_level <= 1),
    prediction_factors JSONB,
    predicted_at TIMESTAMP DEFAULT NOW(),
    semester TEXT NOT NULL
);

CREATE INDEX idx_grade_predictions_student ON grade_predictions(student_id, semester, predicted_at DESC);

-- Add helpful comments
COMMENT ON TABLE performance_history IS 'Weekly aggregated student performance per course';
COMMENT ON TABLE concept_mastery IS 'Tracks student mastery level for each concept';
COMMENT ON TABLE study_sessions IS 'Logs all student study activities for analytics';
COMMENT ON TABLE grade_predictions IS 'AI-generated predictions for final grades';
```

### Run Migration

```bash
# Method 1: Using Drizzle
pnpm db:push

# Method 2: Direct SQL (if needed)
psql $DATABASE_URL -f frontend/src/lib/db/migrations/pg/0001_performance_tracking.sql
```

### Verify in Database

```bash
pnpm db:studio
# Check that 4 new tables appear:
# - performance_history
# - concept_mastery  
# - study_sessions
# - grade_predictions
```

---

## 📊 Step 4: First Component - Performance Chart (1 hour)

### Create Basic Chart Component

**File: `frontend/src/components/student/performance-chart.tsx`**

```typescript
'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface PerformanceData {
  week: number;
  grade: number;
  course: string;
}

export function PerformanceChart({ data }: { data: PerformanceData[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="week" label={{ value: 'Week', position: 'insideBottom', offset: -5 }} />
        <YAxis domain={[0, 100]} label={{ value: 'Grade (%)', angle: -90, position: 'insideLeft' }} />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="grade" stroke="#8884d8" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

### Test with Mock Data

**File: `frontend/src/app/student/dashboard/page.tsx` (create new)**

```typescript
import { PerformanceChart } from '@/components/student/performance-chart';

const mockData = [
  { week: 1, grade: 75, course: 'CS101' },
  { week: 2, grade: 82, course: 'CS101' },
  { week: 3, grade: 88, course: 'CS101' },
  { week: 4, grade: 85, course: 'CS101' },
];

export default function DashboardPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Performance Dashboard</h1>
      <PerformanceChart data={mockData} />
    </div>
  );
}
```

### Test It

1. Navigate to `/student/dashboard`
2. You should see a line chart showing grade trend
3. Hover over points to see tooltips

**✅ If chart renders, you're ready for real data integration!**

---

## 🎯 What to Do Next

You've completed the quick start! Now choose your path:

### Option A: Continue Building (Recommended)
→ Follow `PHASE_1_DAY_BY_DAY_PLAN.md` starting at Day 2

### Option B: Integration First
→ Connect performance chart to real database data
→ Create API route to fetch performance history

### Option C: More Quick Wins
→ Add CSV export (easier than PDF)
→ Add more chart types (bar, pie)
→ Style the dashboard with Tailwind

---

## 🐛 Troubleshooting

### "Module not found: jspdf"
```bash
pnpm install jspdf jspdf-autotable
```

### "recharts not rendering"
- Check `'use client'` directive is at top of component
- Verify data format matches chart expectations
- Inspect console for errors

### "Database migration failed"
- Check DATABASE_URL is correct
- Verify PostgreSQL is running
- Check for syntax errors in SQL

### "Study Buddy API not responding"
```bash
cd mcp-server
python src/api/study_buddy_api.py
# Should see: "Uvicorn running on http://localhost:8083"
```

---

## 📁 File Structure After Quick Start

```
better-chatbot-main/
├── frontend/
│   ├── src/
│   │   ├── lib/
│   │   │   └── export/
│   │   │       └── export-service.ts ← NEW
│   │   ├── components/
│   │   │   ├── export/
│   │   │   │   └── export-button.tsx ← NEW
│   │   │   └── student/
│   │   │       └── performance-chart.tsx ← NEW
│   │   ├── app/
│   │   │   └── student/
│   │   │       └── dashboard/
│   │   │           └── page.tsx ← NEW
│   │   └── lib/db/migrations/pg/
│   │       └── 0001_performance_tracking.sql ← NEW
```

---

## ⏱️ Time Tracking

**Quick Start Total:** ~3 hours
- ✅ Pre-flight checks: 5 min
- ✅ Environment setup: 10 min  
- ✅ Quick win (export): 1 hour
- ✅ Database setup: 2 hours
- ✅ First component: 1 hour

**Next 12 Hours:**
- Day 2-3 tasks from day-by-day plan
- Performance repository
- Enhanced analytics

**After 15 Hours:**
- Working dashboard with real data
- Ready to continue with feedback system

---

## 📞 Support

**Stuck?** Check these resources:

1. **Technical Specs:** `PHASE_1_IMPLEMENTATION_PLAN.md`
2. **Day-by-Day:** `PHASE_1_DAY_BY_DAY_PLAN.md`
3. **Analysis:** `PHASE_1_CRITICAL_ANALYSIS.md`
4. **Pricing Context:** `PRICING_PLAN_SIMPLE.md`

**Still stuck?** Review:
- Existing code in similar components
- Recharts documentation: https://recharts.org
- jsPDF docs: https://github.com/parallax/jsPDF

---

## 🎉 Success Criteria

**You're done with Quick Start when:**
- ✅ Export button generates a PDF
- ✅ Dashboard page shows a chart
- ✅ 4 new database tables exist
- ✅ Development environment is stable
- ✅ You understand the codebase structure

**Next:** Start Day 2 of the detailed plan! 🚀

---

**END OF QUICK START GUIDE**

*You've got this! Start with the quick win and build momentum.* 💪
