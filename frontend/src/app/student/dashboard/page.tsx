import { Suspense } from "react";
import { getSession } from "@/lib/auth/server";
import { getStudentId } from "@/lib/auth/user-utils";
import { performanceRepository } from "@/lib/db/pg/repositories/performance-repository.pg";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ExportButton } from "@/components/performance/export-button";
import {
  WeeklyGradeChart,
  StudyTimeChart,
  CompletionRateChart,
  ConceptMasteryChart,
  CombinedPerformanceChart,
} from "@/components/performance/performance-chart";
import { TrendingUp, TrendingDown, Minus, Clock, BookOpen, Target, Award } from "lucide-react";
import type { PerformanceData } from "@/lib/services/export-service";

async function getDashboardData(userId: string, semester: string) {
  const dashboardData = await performanceRepository.getDashboardData(userId, semester);
  const enrollments = await pgAcademicRepository.getStudentEnrollments(userId, semester);
  
  return {
    ...dashboardData,
    enrollments,
  };
}

function getTrendIcon(trend: "improving" | "declining" | "stable") {
  switch (trend) {
    case "improving":
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    case "declining":
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    case "stable":
      return <Minus className="h-4 w-4 text-yellow-500" />;
  }
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: any;
  trend?: "improving" | "declining" | "stable";
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
          {trend && getTrendIcon(trend)}
          <span>{description}</span>
        </div>
      </CardContent>
    </Card>
  );
}

async function DashboardContent() {
  const session = await getSession();
  
  if (!session?.user) {
    return <div>Error: Not logged in</div>;
  }

  const user = session.user;
  const userId = user.id;
  const studentId = getStudentId(user);

  const currentSemester = "2024-fall";
  const data = await getDashboardData(userId, currentSemester);

  const avgGrade =
    data.performanceHistory.length > 0
      ? data.performanceHistory.reduce((sum, p) => sum + parseFloat(p.averageGrade || "0"), 0) /
        data.performanceHistory.length
      : 0;

  const totalStudyHours = Math.round(data.studyTimeStats.totalMinutes / 60);

  const weakConcepts = data.conceptMastery.filter((c) => parseFloat(c.masteryLevel || "0") < 0.6);
  const strongConcepts = data.conceptMastery.filter((c) => parseFloat(c.masteryLevel || "0") >= 0.8);

  const latestPrediction = data.gradePredictions[0];

  const weeklyPerformanceData = data.performanceHistory.map((p) => ({
    week: p.weekNumber,
    averageGrade: parseFloat(p.averageGrade || "0"),
    assignmentsCompleted: p.assignmentsCompleted,
    assignmentsTotal: p.assignmentsTotal,
    studyTimeMinutes: p.studyTimeMinutes,
  }));

  const conceptMasteryData = data.conceptMastery.map((c) => ({
    concept: c.conceptName,
    masteryLevel: parseFloat(c.masteryLevel || "0"),
  }));

  const exportData: PerformanceData = {
    studentName: user.name || "Student",
    studentId: userId,
    courseName: data.enrollments?.[0]?.course?.title || "All Courses",
    courseCode: data.enrollments?.[0]?.course?.courseCode || "ALL",
    semester: currentSemester,
    generatedAt: new Date(),
    weeklyPerformance: weeklyPerformanceData,
    conceptMastery: data.conceptMastery.map((c) => ({
      concept: c.conceptName,
      masteryLevel: parseFloat(c.masteryLevel || "0"),
      attempts: c.totalAttempts,
      lastPracticed: c.lastPracticedAt || new Date(),
    })),
    studySessions: data.recentSessions.map((s) => ({
      type: s.sessionType,
      duration: s.durationMinutes,
      date: s.startedAt,
    })),
    predictions: data.gradePredictions.map((p) => ({
      predictedGrade: parseFloat(p.predictedFinalGrade || "0"),
      confidence: parseFloat(p.confidenceLevel || "0"),
      date: p.predictedAt || new Date(),
    })),
    summary: {
      overallGrade: avgGrade,
      completionRate: 0,
      totalStudyTime: data.studyTimeStats.totalMinutes,
      trend: "stable",
    },
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Performance Dashboard</h1>
          <p className="text-muted-foreground">
            Track your academic progress and study patterns
          </p>
        </div>
        <ExportButton data={exportData} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Average Grade"
          value={`${avgGrade.toFixed(1)}%`}
          description="Across all courses"
          icon={Award}
          trend="stable"
        />
        <StatCard
          title="Study Time"
          value={`${totalStudyHours}h`}
          description="Last 30 days"
          icon={Clock}
        />
        <StatCard
          title="Strong Concepts"
          value={strongConcepts.length}
          description={`${weakConcepts.length} need practice`}
          icon={Target}
        />
        <StatCard
          title="Study Sessions"
          value={data.studyTimeStats.sessionCount}
          description="Last 30 days"
          icon={BookOpen}
        />
      </div>

      {latestPrediction && (
        <Card>
          <CardHeader>
            <CardTitle>Grade Prediction</CardTitle>
            <CardDescription>AI-powered prediction for your final grade</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">
                  {parseFloat(latestPrediction.predictedFinalGrade || "0").toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">
                  Confidence: {(parseFloat(latestPrediction.confidenceLevel || "0") * 100).toFixed(0)}%
                </div>
              </div>
              <Badge variant="outline">
                {parseFloat(latestPrediction.predictedFinalGrade || "0") >= 70
                  ? "On Track"
                  : "Needs Improvement"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="concepts">Concept Mastery</TabsTrigger>
          <TabsTrigger value="study">Study Patterns</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Grade Performance</CardTitle>
              <CardDescription>Your grade trend over the semester</CardDescription>
            </CardHeader>
            <CardContent>
              <WeeklyGradeChart data={weeklyPerformanceData} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assignment Completion</CardTitle>
              <CardDescription>Track your assignment completion rate</CardDescription>
            </CardHeader>
            <CardContent>
              <CompletionRateChart data={weeklyPerformanceData} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Performance Correlation</CardTitle>
              <CardDescription>Grade vs Study Time relationship</CardDescription>
            </CardHeader>
            <CardContent>
              <CombinedPerformanceChart data={weeklyPerformanceData} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="concepts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Concept Mastery Overview</CardTitle>
              <CardDescription>Your understanding of key concepts</CardDescription>
            </CardHeader>
            <CardContent>
              <ConceptMasteryChart data={conceptMasteryData} />
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Strong Concepts ({strongConcepts.length})</CardTitle>
                <CardDescription>Concepts you&apos;ve mastered</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {strongConcepts.slice(0, 5).map((c) => (
                    <div key={c.id} className="flex items-center justify-between">
                      <span className="text-sm">{c.conceptName}</span>
                      <Badge variant="outline">
                        {(parseFloat(c.masteryLevel || "0") * 100).toFixed(0)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Needs Practice ({weakConcepts.length})</CardTitle>
                <CardDescription>Concepts to focus on</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {weakConcepts.slice(0, 5).map((c) => (
                    <div key={c.id} className="flex items-center justify-between">
                      <span className="text-sm">{c.conceptName}</span>
                      <Badge variant="destructive">
                        {(parseFloat(c.masteryLevel || "0") * 100).toFixed(0)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="study" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Study Time</CardTitle>
              <CardDescription>Your study time distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <StudyTimeChart data={weeklyPerformanceData} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Study Sessions by Type</CardTitle>
              <CardDescription>Time spent on different activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(data.studyTimeStats.byType).map(([type, minutes]) => (
                  <div key={type} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="capitalize">{type.replace(/_/g, " ")}</span>
                      <span className="font-medium">{Math.round(minutes / 60)}h</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary rounded-full h-2"
                        style={{
                          width: `${(minutes / data.studyTimeStats.totalMinutes) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personalized Insights</CardTitle>
              <CardDescription>AI-powered recommendations for improvement</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {avgGrade < 70 && (
                <div className="flex gap-3 p-4 border rounded-lg bg-red-50 dark:bg-red-950">
                  <TrendingDown className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Grade Below Target</p>
                    <p className="text-sm text-muted-foreground">
                      Your average grade is below 70%. Consider increasing study time and
                      reviewing weak concepts.
                    </p>
                  </div>
                </div>
              )}

              {weakConcepts.length > 5 && (
                <div className="flex gap-3 p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-950">
                  <Target className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Multiple Concepts Need Attention</p>
                    <p className="text-sm text-muted-foreground">
                      You have {weakConcepts.length} concepts below 60% mastery. Focus on these
                      to improve your overall performance.
                    </p>
                  </div>
                </div>
              )}

              {data.studyTimeStats.totalMinutes < 600 && (
                <div className="flex gap-3 p-4 border rounded-lg bg-blue-50 dark:bg-blue-950">
                  <Clock className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Low Study Time</p>
                    <p className="text-sm text-muted-foreground">
                      You&apos;ve studied {Math.round(data.studyTimeStats.totalMinutes / 60)} hours in
                      the last 30 days. Aim for at least 15-20 hours per week.
                    </p>
                  </div>
                </div>
              )}

              {strongConcepts.length > 10 && (
                <div className="flex gap-3 p-4 border rounded-lg bg-green-50 dark:bg-green-950">
                  <Award className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Excellent Progress!</p>
                    <p className="text-sm text-muted-foreground">
                      You&apos;ve mastered {strongConcepts.length} concepts. Keep up the great work!
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function StudentDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-96">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
              <p className="text-muted-foreground">Loading dashboard...</p>
            </div>
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
