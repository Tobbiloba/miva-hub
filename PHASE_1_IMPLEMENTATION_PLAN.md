# Phase 1 Implementation Plan - MAX Features
## MIVA University Academic Platform

**Document Version:** 1.0  
**Created:** 2025-01-19  
**Timeline:** 2-4 weeks  
**Priority:** CRITICAL for MAX tier differentiation

---

## 🎯 Executive Summary

Phase 1 focuses on building **three core MAX-tier features** that justify the ₦5,500/month price point and create clear differentiation from the PRO tier (₦2,500/month):

1. **Performance Dashboard** - Comprehensive analytics and insights (1 week)
2. **Advanced Feedback System** - Detailed explanations for assessments (3 days)
3. **Export Features** - PDF, Word, CSV export capabilities (3 days)

**Offline Mode is EXCLUDED** from this plan as requested.

---

## 📊 Current Codebase Analysis

### ✅ What Already Exists

#### **1. Database Infrastructure** 
- PostgreSQL with Drizzle ORM
- Academic schema with comprehensive tables:
  - `user`, `course`, `assignment`, `course_material`
  - `student_enrollment`, `assignment_submission`
  - `faculty`, `department`, `class_schedule`
  - `ai_processed_content` (with summaries and key concepts)
- **Progress tracking tables** (SQL already created):
  - `quiz_progress`, `exam_progress`, `assignment_progress`
  - Auto-save with 7-day cleanup function

#### **2. Grading System** ✅
- **Location:** `mcp-server/src/core/`
- `grading_engine.py` - Multi-strategy orchestrator
- `grading_strategies.py` - 4 grading strategies:
  - `ExactMatchGrader` - Multiple choice, true/false
  - `FuzzyMatchGrader` - Short answers with typo tolerance
  - `SemanticGrader` - AI-powered semantic comparison
  - `RubricGrader` - Essay grading with rubrics
- **Hybrid approach:** Fuzzy match + AI verification for borderline cases
- Detailed feedback generation already built-in

#### **3. Analytics Foundation** ✅
- **Location:** `frontend/src/lib/analytics/academic-analytics.ts`
- Analytics service with caching (10-min TTL)
- Interfaces defined for:
  - `SystemOverview`, `CourseAnalytics`, `StudentPerformance`
  - `FacultyAnalytics`, `DepartmentAnalytics`, `LearningInsights`
- **Partial implementation** - needs enhancement
- Used in: `/admin/analytics/page.tsx` (admin dashboard)

#### **4. Student Grades Page** ✅
- **Location:** `frontend/src/app/student/grades/page.tsx`
- Shows: GPA, academic standing, degree progress
- `grade-calculator.ts` utilities:
  - `calculateSemesterGPA()`, `percentageToLetterGrade()`
  - `calculateAcademicStanding()`, `calculateDegreeProgress()`
- **Gap:** No historical tracking, weak topic analysis

#### **5. Interactive Assessment Components** ✅
- `components/tool-invocation/quiz.tsx` (479 lines)
- `components/tool-invocation/exam.tsx` (532 lines)
- `components/tool-invocation/flashcards.tsx` (97 lines)
- Auto-save hooks: `useQuizProgress`, `useAssignmentProgress`, `useExamProgress`
- **Gap:** No detailed feedback display after submission

#### **6. MCP Study Buddy API** ✅
- **Location:** `mcp-server/src/api/study_buddy_api.py`
- Runs on port 8083
- RAG system with vector search
- Already integrated with Ollama (llama3.2:3b, nomic-embed-text)

### ❌ What's Missing (Phase 1 Focus)

1. **Student Performance Dashboard**
   - Historical grade tracking over time
   - Topic-by-topic strength/weakness analysis
   - Study time tracking (from chat, quiz, assignment interactions)
   - Mastery level tracking per concept
   - Grade predictions based on current performance
   - AI-generated study recommendations

2. **Advanced Feedback Components**
   - Enhanced quiz/exam results display with explanations
   - Error analysis: "Why wrong + how to fix"
   - Related concepts suggestions
   - Concept mastery indicators per question

3. **Export System**
   - PDF export for grades, study guides, flashcards
   - CSV export for performance data
   - Word export for notes and materials
   - Batch export capabilities

---

## 🏗️ Feature 1: Performance Dashboard

### Overview
Create a comprehensive student performance analytics dashboard showing grades over time, strength/weakness analysis, study patterns, and AI-powered insights.

### Technical Architecture

```
┌─────────────────────────────────────────────────┐
│  Student Performance Dashboard Page             │
│  /student/dashboard                             │
└──────────────────┬──────────────────────────────┘
                   │
    ┌──────────────┴──────────────┐
    ▼                             ▼
┌─────────────────────┐   ┌──────────────────────┐
│ Analytics Service   │   │ Progress Tracking    │
│ (Enhanced)          │   │ Service (NEW)        │
└──────┬──────────────┘   └──────┬───────────────┘
       │                         │
       ▼                         ▼
┌──────────────────────────────────────────────────┐
│  PostgreSQL Database                             │
│  + New Tables: performance_history,              │
│    concept_mastery, study_sessions               │
└──────────────────────────────────────────────────┘
```

### Database Schema Changes

**New Tables:**

```sql
-- Performance history (time-series data)
CREATE TABLE performance_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES "user"(id),
    course_id UUID NOT NULL REFERENCES course(id),
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

-- Concept mastery tracking
CREATE TABLE concept_mastery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES "user"(id),
    course_id UUID NOT NULL REFERENCES course(id),
    concept_name TEXT NOT NULL,
    mastery_level DECIMAL(3,2) DEFAULT 0.0, -- 0.0 to 1.0
    correct_attempts INTEGER DEFAULT 0,
    total_attempts INTEGER DEFAULT 0,
    last_practiced_at TIMESTAMP,
    first_learned_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(student_id, course_id, concept_name)
);

CREATE INDEX idx_concept_mastery_student ON concept_mastery(student_id, course_id);
CREATE INDEX idx_concept_mastery_level ON concept_mastery(mastery_level);

-- Study sessions (track engagement)
CREATE TABLE study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES "user"(id),
    course_id UUID REFERENCES course(id), -- nullable for chat sessions
    session_type TEXT NOT NULL, -- 'chat', 'quiz', 'assignment', 'study_guide', 'flashcards'
    duration_minutes INTEGER NOT NULL,
    activity_data JSONB, -- details about what was done
    started_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_study_sessions_student ON study_sessions(student_id, started_at DESC);
CREATE INDEX idx_study_sessions_course ON study_sessions(course_id, started_at DESC);

-- Predicted grades (AI predictions)
CREATE TABLE grade_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES "user"(id),
    course_id UUID NOT NULL REFERENCES course(id),
    predicted_final_grade DECIMAL(5,2),
    confidence_level DECIMAL(3,2), -- 0.0 to 1.0
    prediction_factors JSONB, -- what influenced the prediction
    predicted_at TIMESTAMP DEFAULT NOW(),
    semester TEXT NOT NULL,
    UNIQUE(student_id, course_id, semester, predicted_at)
);

CREATE INDEX idx_grade_predictions_student ON grade_predictions(student_id, semester, predicted_at DESC);
```

### Implementation Steps

#### **Week 1 - Days 1-2: Database & Backend**

**1.1 Create Migration Files**
- [ ] `frontend/src/lib/db/migrations/pg/XXXX_performance_tracking.sql`
- [ ] Create all 4 new tables with indexes
- [ ] Test migration on dev database
- [ ] Seed with sample data for testing

**1.2 Update Schema & Repository**
- [ ] Add new table schemas to `frontend/src/lib/db/pg/schema.pg.ts`
- [ ] Create new repository: `frontend/src/lib/db/pg/repositories/performance-repository.pg.ts`

```typescript
// performance-repository.pg.ts
export class PerformanceRepository {
  // Performance History
  async recordWeeklyPerformance(data: {
    studentId: string;
    courseId: string;
    weekNumber: number;
    averageGrade: number;
    assignmentsCompleted: number;
    assignmentsTotal: number;
    studyTimeMinutes: number;
    semester: string;
  }): Promise<void>;

  async getPerformanceHistory(
    studentId: string,
    courseId?: string,
    weeks?: number
  ): Promise<PerformanceHistory[]>;

  // Concept Mastery
  async updateConceptMastery(data: {
    studentId: string;
    courseId: string;
    conceptName: string;
    correct: boolean;
  }): Promise<void>;

  async getConceptMastery(
    studentId: string,
    courseId?: string
  ): Promise<ConceptMastery[]>;

  async getWeakConcepts(
    studentId: string,
    threshold: number = 0.6
  ): Promise<ConceptMastery[]>;

  // Study Sessions
  async recordStudySession(data: {
    studentId: string;
    courseId?: string;
    sessionType: string;
    durationMinutes: number;
    activityData?: any;
    startedAt: Date;
    endedAt: Date;
  }): Promise<void>;

  async getStudyTime(
    studentId: string,
    timeframe: 'week' | 'month' | 'semester'
  ): Promise<{ totalMinutes: number; bySubject: Record<string, number> }>;

  // Grade Predictions
  async generateGradePrediction(
    studentId: string,
    courseId: string
  ): Promise<GradePrediction>;

  async getGradePredictions(
    studentId: string
  ): Promise<GradePrediction[]>;
}
```

#### **Week 1 - Days 3-4: Analytics Enhancement**

**1.3 Enhance Analytics Service**
- [ ] Extend `frontend/src/lib/analytics/academic-analytics.ts`
- [ ] Add new methods:

```typescript
// New analytics methods
class AcademicAnalyticsService {
  // Student-specific analytics
  async getStudentDashboardData(studentId: string): Promise<{
    overview: StudentOverview;
    performanceTrends: PerformanceTrend[];
    conceptMastery: ConceptMasteryAnalysis;
    studyPatterns: StudyPatternAnalysis;
    predictions: GradePrediction[];
    recommendations: StudyRecommendation[];
  }>;

  async getPerformanceTrends(
    studentId: string,
    courseId?: string,
    weeks: number = 12
  ): Promise<PerformanceTrend[]>;

  async analyzeStrengthsWeaknesses(
    studentId: string
  ): Promise<{
    strongTopics: ConceptMastery[];
    weakTopics: ConceptMastery[];
    improvingTopics: ConceptMastery[];
    decliningTopics: ConceptMastery[];
  }>;

  async getStudyRecommendations(
    studentId: string
  ): Promise<StudyRecommendation[]>;
}
```

**1.4 Background Job for Data Population**
- [ ] Create `frontend/src/lib/jobs/populate-performance-data.ts`
- [ ] Backfill historical data from existing grades
- [ ] Calculate initial concept mastery from quiz/exam results
- [ ] Set up weekly aggregation job (via cron or scheduler)

#### **Week 1 - Days 5-7: Frontend Dashboard**

**1.5 Create Dashboard Page**
- [ ] `frontend/src/app/student/dashboard/page.tsx`
- [ ] Main dashboard layout with sections:
  - Overview cards (GPA, rank, study time this week)
  - Performance trends chart (Recharts line chart)
  - Strength/weakness analysis (horizontal bar chart)
  - Upcoming assessments with predictions
  - Study recommendations panel
  - Recent activity feed

**1.6 Dashboard Components**

```typescript
// components/student/performance-overview.tsx
export function PerformanceOverview({ data }: { data: StudentOverview }) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <MetricCard
        title="Overall GPA"
        value={data.gpa.toFixed(2)}
        trend={data.gpaTrend}
        icon={Award}
      />
      <MetricCard
        title="Class Rank"
        value={`${data.rank}/${data.totalStudents}`}
        percentile={data.percentile}
        icon={TrendingUp}
      />
      <MetricCard
        title="Study Time (This Week)"
        value={`${data.studyTimeWeek} hrs`}
        comparison={data.studyTimeAverage}
        icon={Clock}
      />
      <MetricCard
        title="Mastery Level"
        value={`${data.masteryPercentage}%`}
        breakdown={data.masteryBreakdown}
        icon={Target}
      />
    </div>
  );
}

// components/student/performance-chart.tsx
export function PerformanceChart({ trends }: { trends: PerformanceTrend[] }) {
  // Recharts LineChart showing grade trends over time
  // Multiple lines for different courses
  // Shaded areas for predicted future performance
}

// components/student/concept-mastery-chart.tsx
export function ConceptMasteryChart({ concepts }: { concepts: ConceptMastery[] }) {
  // Horizontal bar chart showing mastery levels
  // Color-coded: green (>80%), yellow (60-80%), red (<60%)
  // Click to drill down into specific concept details
}

// components/student/study-recommendations.tsx
export function StudyRecommendations({ recommendations }: { recommendations: StudyRecommendation[] }) {
  // AI-generated study suggestions
  // Prioritized by impact on grade
  // Links to relevant materials/flashcards
}

// components/student/grade-predictions.tsx
export function GradePredictions({ predictions }: { predictions: GradePrediction[] }) {
  // Show predicted final grades per course
  // Confidence intervals
  // "What-if" scenarios (interactive)
}
```

**1.7 Real-time Updates**
- [ ] Implement SWR for data fetching
- [ ] Auto-refresh every 5 minutes when page is active
- [ ] Optimistic updates when new grades are received

#### **Week 1 - Testing & Polish**

**1.8 Integration & Testing**
- [ ] Test with multiple student accounts
- [ ] Verify data accuracy of predictions
- [ ] Performance testing (page load < 2s)
- [ ] Mobile responsive design
- [ ] Error handling and loading states

---

## 🔍 Feature 2: Advanced Feedback System

### Overview
Transform basic "correct/incorrect" feedback into detailed, educational explanations that help students learn from mistakes.

### Technical Architecture

```
┌──────────────────────────────────────────┐
│  Quiz/Exam Results Component             │
│  (Enhanced with detailed feedback)       │
└─────────────────┬────────────────────────┘
                  │
     ┌────────────┴────────────┐
     ▼                         ▼
┌──────────────────┐   ┌──────────────────────┐
│ Grading Engine   │   │ Feedback Generator   │
│ (Existing)       │   │ (NEW - Enhanced)     │
└────────┬─────────┘   └──────┬───────────────┘
         │                    │
         ▼                    ▼
┌────────────────────────────────────────────┐
│  Study Buddy API (RAG)                     │
│  Generate explanations using course context│
└────────────────────────────────────────────┘
```

### Implementation Steps

#### **Days 1-2: Backend Feedback Enhancement**

**2.1 Enhance Grading Engine**
- [ ] Update `mcp-server/src/core/grading_strategies.py`
- [ ] Add detailed feedback fields to `GradingResult`:

```python
@dataclass
class DetailedFeedback:
    """Enhanced feedback structure"""
    # Basic feedback
    is_correct: bool
    score: float
    explanation: str
    
    # Advanced feedback (NEW)
    why_wrong: Optional[str] = None  # Explanation of the error
    how_to_fix: Optional[str] = None  # Step-by-step correction
    common_mistakes: List[str] = field(default_factory=list)
    related_concepts: List[str] = field(default_factory=list)
    recommended_materials: List[Dict[str, str]] = field(default_factory=list)
    
    # Learning insights
    concept_tested: Optional[str] = None
    difficulty_level: Optional[str] = None  # beginner, intermediate, advanced
    mastery_indicator: Optional[float] = None  # 0.0 to 1.0

class GradingResult:
    # Existing fields...
    feedback: DetailedFeedback  # Enhanced from simple string
```

**2.2 Create Feedback Generator Service**
- [ ] New file: `mcp-server/src/core/feedback_generator.py`

```python
class FeedbackGenerator:
    """Generate detailed educational feedback using AI"""
    
    def __init__(self, ai_stack, study_buddy_api_url: str):
        self.ai_stack = ai_stack
        self.study_buddy_url = study_buddy_api_url
    
    async def generate_detailed_feedback(
        self,
        student_answer: str,
        correct_answer: str,
        question_text: str,
        is_correct: bool,
        score: float,
        course_id: str,
        concept_name: Optional[str] = None
    ) -> DetailedFeedback:
        """Generate comprehensive feedback using AI and course materials"""
        
        # 1. Basic explanation
        explanation = await self._generate_explanation(
            student_answer, correct_answer, question_text
        )
        
        # 2. If incorrect, generate why_wrong and how_to_fix
        why_wrong = None
        how_to_fix = None
        if not is_correct:
            why_wrong = await self._explain_error(
                student_answer, correct_answer, question_text
            )
            how_to_fix = await self._generate_correction_steps(
                student_answer, correct_answer, question_text
            )
        
        # 3. Find related concepts from course materials
        related_concepts = await self._find_related_concepts(
            question_text, course_id, concept_name
        )
        
        # 4. Recommend study materials
        recommended_materials = await self._recommend_materials(
            concept_name or question_text, course_id, is_correct
        )
        
        # 5. Determine mastery indicator
        mastery_indicator = self._calculate_mastery_indicator(score, is_correct)
        
        return DetailedFeedback(
            is_correct=is_correct,
            score=score,
            explanation=explanation,
            why_wrong=why_wrong,
            how_to_fix=how_to_fix,
            related_concepts=related_concepts,
            recommended_materials=recommended_materials,
            concept_tested=concept_name,
            mastery_indicator=mastery_indicator
        )
    
    async def _generate_explanation(self, student_answer, correct_answer, question) -> str:
        """Use Study Buddy API to generate explanation"""
        prompt = f"""
        Question: {question}
        Correct Answer: {correct_answer}
        Student Answer: {student_answer}
        
        Provide a clear explanation of why the correct answer is right.
        """
        # Call Study Buddy API
        ...
    
    async def _explain_error(self, student_answer, correct_answer, question) -> str:
        """Explain what the student got wrong"""
        prompt = f"""
        Question: {question}
        Student Answer: {student_answer}
        Correct Answer: {correct_answer}
        
        Explain specifically what is wrong with the student's answer.
        Focus on the misconception or error in thinking.
        """
        ...
    
    async def _generate_correction_steps(self, student_answer, correct_answer, question) -> str:
        """Provide step-by-step guidance to reach correct answer"""
        prompt = f"""
        Question: {question}
        Student's Incorrect Answer: {student_answer}
        Correct Answer: {correct_answer}
        
        Provide step-by-step guidance on how to arrive at the correct answer.
        Use a teaching approach, not just giving the answer.
        """
        ...
    
    async def _find_related_concepts(self, question, course_id, concept_name) -> List[str]:
        """Find concepts related to this question"""
        # Use vector search on course materials
        ...
    
    async def _recommend_materials(self, concept, course_id, is_correct) -> List[Dict]:
        """Recommend study materials based on performance"""
        # If incorrect, recommend remedial materials
        # If correct, recommend advanced materials
        ...
```

**2.3 Integrate with Grading Engine**
- [ ] Update `mcp-server/src/core/grading_engine.py`
- [ ] Add feedback generation after grading:

```python
class GradingOrchestrator:
    def __init__(self, ai_stack=None):
        self.feedback_generator = FeedbackGenerator(ai_stack, STUDY_BUDDY_API_URL)
        # ... existing init
    
    async def grade_answer_with_feedback(
        self,
        student_answer: str,
        correct_answer: str,
        question_type: str,
        question_data: Optional[Dict] = None
    ) -> GradingResultWithFeedback:
        """Grade answer and generate detailed feedback"""
        
        # 1. Grade using existing system
        basic_result = await self.grade_answer(
            student_answer, correct_answer, question_type, question_data
        )
        
        # 2. Generate detailed feedback
        detailed_feedback = await self.feedback_generator.generate_detailed_feedback(
            student_answer=student_answer,
            correct_answer=correct_answer,
            question_text=question_data.get('question', ''),
            is_correct=basic_result.is_correct,
            score=basic_result.score,
            course_id=question_data.get('course_id', ''),
            concept_name=question_data.get('concept', None)
        )
        
        return GradingResultWithFeedback(
            **basic_result.__dict__,
            detailed_feedback=detailed_feedback
        )
```

#### **Day 3: Frontend Components**

**2.4 Enhanced Results Components**
- [ ] Update `frontend/src/components/tool-invocation/quiz.tsx`
- [ ] Update `frontend/src/components/tool-invocation/exam.tsx`
- [ ] Create new feedback display components:

```typescript
// components/assessment/detailed-feedback.tsx
export function DetailedFeedback({ feedback, question }: {
  feedback: DetailedFeedback;
  question: Question;
}) {
  return (
    <div className="space-y-4 p-4 border rounded-lg">
      {/* Correctness badge */}
      <div className="flex items-center gap-2">
        {feedback.isCorrect ? (
          <Badge variant="success">✓ Correct</Badge>
        ) : (
          <Badge variant="destructive">✗ Incorrect</Badge>
        )}
        <span className="text-sm text-muted-foreground">
          {feedback.score.toFixed(0)}% • {feedback.conceptTested}
        </span>
      </div>

      {/* Main explanation */}
      <div className="prose prose-sm">
        <p className="font-medium">Explanation:</p>
        <p>{feedback.explanation}</p>
      </div>

      {/* Error analysis (if incorrect) */}
      {!feedback.isCorrect && feedback.whyWrong && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>What went wrong:</AlertTitle>
          <AlertDescription>{feedback.whyWrong}</AlertDescription>
        </Alert>
      )}

      {/* Correction steps (if incorrect) */}
      {!feedback.isCorrect && feedback.howToFix && (
        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
          <p className="font-medium mb-2 flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            How to get it right:
          </p>
          <div className="prose prose-sm">
            <ReactMarkdown>{feedback.howToFix}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Related concepts */}
      {feedback.relatedConcepts.length > 0 && (
        <div>
          <p className="font-medium mb-2">Related Concepts:</p>
          <div className="flex flex-wrap gap-2">
            {feedback.relatedConcepts.map((concept, i) => (
              <Badge key={i} variant="outline">{concept}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Recommended materials */}
      {feedback.recommendedMaterials.length > 0 && (
        <div>
          <p className="font-medium mb-2">Study Materials:</p>
          <div className="space-y-2">
            {feedback.recommendedMaterials.map((material, i) => (
              <Link
                key={i}
                href={material.url}
                className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
              >
                <FileText className="h-4 w-4" />
                {material.title} • {material.type} • Week {material.week}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Mastery indicator */}
      {feedback.masteryIndicator !== null && (
        <div>
          <p className="text-sm mb-1">Concept Mastery:</p>
          <Progress value={feedback.masteryIndicator * 100} />
          <p className="text-xs text-muted-foreground mt-1">
            {(feedback.masteryIndicator * 100).toFixed(0)}% mastered
          </p>
        </div>
      )}
    </div>
  );
}

// components/assessment/results-summary.tsx
export function ResultsSummary({ results, feedback }: {
  results: GradingResults;
  feedback: DetailedFeedback[];
}) {
  // Aggregate analysis
  const weakConcepts = feedback
    .filter(f => !f.isCorrect)
    .map(f => f.conceptTested)
    .filter(Boolean);

  const averageMastery = feedback
    .filter(f => f.masteryIndicator !== null)
    .reduce((sum, f) => sum + f.masteryIndicator!, 0) / feedback.length;

  return (
    <div className="space-y-6">
      {/* Score overview */}
      <Card>
        <CardHeader>
          <CardTitle>Your Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-3xl font-bold">{results.score}%</p>
              <p className="text-sm text-muted-foreground">Overall Score</p>
            </div>
            <div>
              <p className="text-3xl font-bold">
                {results.correct}/{results.total}
              </p>
              <p className="text-sm text-muted-foreground">Correct Answers</p>
            </div>
            <div>
              <p className="text-3xl font-bold">
                {(averageMastery * 100).toFixed(0)}%
              </p>
              <p className="text-sm text-muted-foreground">Mastery Level</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weak areas alert */}
      {weakConcepts.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Areas for Improvement:</AlertTitle>
          <AlertDescription>
            Focus on: {weakConcepts.join(', ')}
          </AlertDescription>
        </Alert>
      )}

      {/* Question-by-question feedback */}
      <div className="space-y-4">
        {feedback.map((fb, index) => (
          <DetailedFeedback
            key={index}
            feedback={fb}
            question={results.questions[index]}
          />
        ))}
      </div>
    </div>
  );
}
```

#### **Testing & Integration**

**2.5 Testing**
- [ ] Test with various question types
- [ ] Verify feedback quality (manual review of AI responses)
- [ ] Test concept mastery updates
- [ ] Performance testing (feedback generation < 3s per question)

---

## 📥 Feature 3: Export System

### Overview
Enable students to export their academic data, study materials, and performance analytics in multiple formats (PDF, CSV, Word).

### Technical Architecture

```
┌──────────────────────────────────────────┐
│  Export Button/Menu (UI)                 │
└─────────────────┬────────────────────────┘
                  │
     ┌────────────┴────────────┐
     ▼                         ▼
┌──────────────────┐   ┌──────────────────────┐
│ Export API Route │   │ Document Generator   │
│ /api/export/*    │   │ Service              │
└────────┬─────────┘   └──────┬───────────────┘
         │                    │
         ▼                    ▼
┌─────────────────────────────────────────────┐
│  Libraries: jsPDF, papaparse, docx          │
└─────────────────────────────────────────────┘
```

### Implementation Steps

#### **Days 1-2: Export Service & API Routes**

**3.1 Install Dependencies**
```bash
cd frontend
pnpm install jspdf jspdf-autotable papaparse docx file-saver
pnpm install -D @types/papaparse
```

**3.2 Create Export Service**
- [ ] Create `frontend/src/lib/export/export-service.ts`

```typescript
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';

export type ExportFormat = 'pdf' | 'csv' | 'docx';

export class ExportService {
  /**
   * Export grades transcript as PDF
   */
  async exportGradesAsPDF(data: GradesData, studentInfo: StudentInfo): Promise<void> {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('Academic Transcript', 14, 20);
    doc.setFontSize(12);
    doc.text(`Student: ${studentInfo.name}`, 14, 30);
    doc.text(`Student ID: ${studentInfo.studentId}`, 14, 35);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 40);
    
    // GPA Summary
    doc.setFontSize(14);
    doc.text('GPA Summary', 14, 50);
    doc.setFontSize(10);
    doc.text(`Cumulative GPA: ${data.cumulativeGPA.toFixed(2)}`, 14, 55);
    doc.text(`Semester GPA: ${data.semesterGPA.toFixed(2)}`, 14, 60);
    doc.text(`Credit Hours: ${data.creditHours}`, 14, 65);
    
    // Grades table
    autoTable(doc, {
      startY: 75,
      head: [['Course Code', 'Course Name', 'Grade', 'Credits', 'GPA']],
      body: data.courses.map(course => [
        course.courseCode,
        course.courseName,
        course.letterGrade,
        course.credits.toString(),
        course.gradePoints.toFixed(2)
      ]),
      theme: 'striped',
      headStyles: { fillColor: [66, 139, 202] }
    });
    
    // Performance trends chart (if data available)
    if (data.performanceTrends) {
      // Add chart image (would need to generate from canvas)
    }
    
    // Footer
    const pageCount = doc.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(
        `Page ${i} of ${pageCount} • Generated ${new Date().toLocaleDateString()}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }
    
    doc.save(`transcript_${studentInfo.studentId}_${Date.now()}.pdf`);
  }
  
  /**
   * Export performance data as CSV
   */
  async exportPerformanceAsCSV(data: PerformanceData): Promise<void> {
    const csvData = data.performanceHistory.map(entry => ({
      'Date': new Date(entry.recordedAt).toLocaleDateString(),
      'Course': entry.courseCode,
      'Week': entry.weekNumber,
      'Average Grade': entry.averageGrade.toFixed(2),
      'Assignments Completed': entry.assignmentsCompleted,
      'Assignments Total': entry.assignmentsTotal,
      'Study Time (min)': entry.studyTimeMinutes
    }));
    
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `performance_data_${Date.now()}.csv`);
  }
  
  /**
   * Export study guide as Word document
   */
  async exportStudyGuideAsDocx(guide: StudyGuide): Promise<void> {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Title
          new Paragraph({
            text: guide.title,
            heading: 'Heading1',
            spacing: { after: 200 }
          }),
          
          // Metadata
          new Paragraph({
            children: [
              new TextRun({
                text: `Course: ${guide.courseName}`,
                bold: true
              })
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Generated: ${new Date(guide.createdAt).toLocaleDateString()}`,
                italics: true
              })
            ],
            spacing: { after: 300 }
          }),
          
          // Sections
          ...guide.sections.flatMap(section => [
            new Paragraph({
              text: section.title,
              heading: 'Heading2',
              spacing: { before: 200, after: 100 }
            }),
            new Paragraph({
              text: section.content,
              spacing: { after: 200 }
            })
          ]),
          
          // Sources
          new Paragraph({
            text: 'Source Materials',
            heading: 'Heading2',
            spacing: { before: 400, after: 100 }
          }),
          ...guide.sources.map(source =>
            new Paragraph({
              text: `• ${source.title} (${source.type}) - Week ${source.week}`,
              spacing: { after: 50 }
            })
          )
        ]
      }]
    });
    
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `study_guide_${guide.id}.docx`);
  }
  
  /**
   * Export flashcards as PDF
   */
  async exportFlashcardsAsPDF(flashcards: Flashcard[]): Promise<void> {
    const doc = new jsPDF();
    let yPos = 20;
    
    doc.setFontSize(16);
    doc.text('Flashcards', 14, yPos);
    yPos += 15;
    
    flashcards.forEach((card, index) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      
      // Card number
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Card ${index + 1}`, 14, yPos);
      yPos += 10;
      
      // Front (Question)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('Q:', 14, yPos);
      const frontLines = doc.splitTextToSize(card.front, 180);
      doc.text(frontLines, 20, yPos);
      yPos += frontLines.length * 5 + 5;
      
      // Back (Answer)
      doc.text('A:', 14, yPos);
      const backLines = doc.splitTextToSize(card.back, 180);
      doc.text(backLines, 20, yPos);
      yPos += backLines.length * 5 + 15;
      
      // Separator
      doc.setDrawColor(200);
      doc.line(14, yPos, 195, yPos);
      yPos += 10;
    });
    
    doc.save(`flashcards_${Date.now()}.pdf`);
  }
  
  /**
   * Batch export multiple items
   */
  async batchExport(items: ExportItem[], format: ExportFormat): Promise<void> {
    // Would generate a ZIP file with all exports
    // Using JSZip library
  }
}

export const exportService = new ExportService();
```

**3.3 Create API Routes**
- [ ] `frontend/src/app/api/export/grades/route.ts`
- [ ] `frontend/src/app/api/export/performance/route.ts`
- [ ] `frontend/src/app/api/export/study-guide/route.ts`
- [ ] `frontend/src/app/api/export/flashcards/route.ts`

```typescript
// app/api/export/grades/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/server';
import { pgAcademicRepository } from '@/lib/db/pg/repositories/academic-repository.pg';
import { exportService } from '@/lib/export/export-service';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { format, options } = await req.json();
  
  // Fetch grades data
  const gradesData = await pgAcademicRepository.getStudentGradesSummary(session.user.id);
  
  // Generate export based on format
  let fileBuffer: Buffer;
  let mimeType: string;
  let filename: string;
  
  switch (format) {
    case 'pdf':
      fileBuffer = await exportService.exportGradesAsPDF(gradesData, session.user);
      mimeType = 'application/pdf';
      filename = `transcript_${session.user.studentId}.pdf`;
      break;
    case 'csv':
      fileBuffer = await exportService.exportPerformanceAsCSV(gradesData);
      mimeType = 'text/csv';
      filename = `grades_${session.user.studentId}.csv`;
      break;
    default:
      return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
  }
  
  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  });
}
```

#### **Day 3: UI Components & Integration**

**3.4 Export Button Components**
- [ ] `frontend/src/components/export/export-button.tsx`

```typescript
export function ExportButton({ 
  type, 
  data, 
  formats = ['pdf', 'csv', 'docx'] 
}: {
  type: 'grades' | 'performance' | 'study-guide' | 'flashcards';
  data: any;
  formats?: ExportFormat[];
}) {
  const [isExporting, setIsExporting] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('pdf');
  
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(`/api/export/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, data })
      });
      
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export_${type}_${Date.now()}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success('Export completed successfully');
    } catch (error) {
      toast.error('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting}>
          <Download className="mr-2 h-4 w-4" />
          {isExporting ? 'Exporting...' : 'Export'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {formats.includes('pdf') && (
          <DropdownMenuItem onClick={() => { setFormat('pdf'); handleExport(); }}>
            <FileText className="mr-2 h-4 w-4" />
            Export as PDF
          </DropdownMenuItem>
        )}
        {formats.includes('csv') && (
          <DropdownMenuItem onClick={() => { setFormat('csv'); handleExport(); }}>
            <Table className="mr-2 h-4 w-4" />
            Export as CSV
          </DropdownMenuItem>
        )}
        {formats.includes('docx') && (
          <DropdownMenuItem onClick={() => { setFormat('docx'); handleExport(); }}>
            <FileText className="mr-2 h-4 w-4" />
            Export as Word
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

**3.5 Integration Points**
- [ ] Add to `/student/grades` page
- [ ] Add to `/student/dashboard` page
- [ ] Add to quiz/exam results views
- [ ] Add to study guide generator results
- [ ] Add to flashcard sets

**3.6 Testing**
- [ ] Test each export format
- [ ] Verify file downloads work across browsers
- [ ] Test with large datasets (100+ grades, 500+ flashcards)
- [ ] Mobile browser testing

---

## 🚀 Deployment & Launch Plan

### Week 4: Testing, Polish & Launch

#### **Day 1-2: Integration Testing**
- [ ] End-to-end testing of all features
- [ ] Performance optimization
- [ ] Fix bugs found during testing
- [ ] Mobile responsive testing

#### **Day 3: Documentation**
- [ ] Update API documentation
- [ ] Create user guides for MAX features
- [ ] Record demo videos
- [ ] Update pricing page with feature screenshots

#### **Day 4-5: Soft Launch**
- [ ] Deploy to staging environment
- [ ] Internal testing with team
- [ ] Beta test with 10-20 MAX subscribers
- [ ] Gather feedback and iterate

#### **Day 6-7: Full Launch**
- [ ] Deploy to production
- [ ] Send announcement email to PRO users
- [ ] Create upgrade campaigns
- [ ] Monitor analytics and errors

---

## 📊 Success Metrics

### Performance Targets
- Dashboard page load: < 2 seconds
- Feedback generation: < 3 seconds per question
- Export generation: < 5 seconds for PDFs, < 2 seconds for CSV
- API response times: p95 < 500ms

### Feature Adoption (30 days post-launch)
- **Dashboard:** 80% of MAX users visit weekly
- **Advanced Feedback:** 90% of quiz/exam takers view detailed feedback
- **Exports:** 40% of MAX users export at least once

### Business Metrics
- **Upgrade Rate:** 20-30% of PRO users upgrade to MAX
- **Retention:** >95% MAX subscriber retention
- **NPS:** >50 from MAX users

---

## 🔧 Technical Debt & Future Improvements

### Known Limitations
1. Grade predictions use simple linear regression (could be enhanced with ML)
2. Study recommendations are rule-based (could use collaborative filtering)
3. Concept extraction is keyword-based (could use NLP)
4. Export styling is basic (could match brand better)

### Future Enhancements (Phase 2+)
- Real-time dashboard updates via WebSockets
- Mobile app with push notifications for insights
- Comparative analytics (compare with class average)
- Historical trend analysis (semester-over-semester)
- Custom report builder
- Batch operations for exports
- LaTeX support for mathematical notation in exports

---

## 📝 Development Checklist

### Phase 1 Complete When:
- [ ] All database migrations run successfully
- [ ] Performance dashboard displays real data
- [ ] Advanced feedback shows for all assessment types
- [ ] All export formats work (PDF, CSV, Word)
- [ ] Mobile responsive on all pages
- [ ] Performance targets met
- [ ] No critical bugs in production
- [ ] User documentation complete
- [ ] Metrics tracking in place

---

## 🎓 Appendices

### A. Database Schema Reference
See inline SQL definitions in each section.

### B. API Endpoints
```
GET  /api/performance/dashboard/:studentId
GET  /api/performance/trends/:studentId
GET  /api/performance/mastery/:studentId
POST /api/export/grades
POST /api/export/performance
POST /api/export/study-guide
POST /api/export/flashcards
```

### C. Component Hierarchy
```
/student/dashboard
  ├─ PerformanceOverview
  ├─ PerformanceChart
  ├─ ConceptMasteryChart
  ├─ StudyRecommendations
  └─ GradePredictions

/student/grades
  ├─ (existing components)
  └─ ExportButton

Quiz/Exam Results
  ├─ ResultsSummary
  ├─ DetailedFeedback (per question)
  └─ ExportButton
```

### D. Dependencies Added
```json
{
  "dependencies": {
    "jspdf": "^2.5.1",
    "jspdf-autotable": "^3.8.2",
    "papaparse": "^5.4.1",
    "docx": "^8.5.0",
    "file-saver": "^2.0.5"
  },
  "devDependencies": {
    "@types/papaparse": "^5.3.14"
  }
}
```

---

**END OF PHASE 1 IMPLEMENTATION PLAN**

*This document is a living specification. Update as implementation progresses.*
