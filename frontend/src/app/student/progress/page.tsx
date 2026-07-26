"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  BookOpen,
  Brain,
  CalendarDays,
  Clock,
  FileText,
  Flame,
  Layers,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";

interface CourseProgress {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  totalMaterials: number;
  viewedMaterials: number;
  coveragePct: number | null;
  weeksTouched: number[];
  weeksUntouched: number[];
  lastTouchedAt: string | null;
}

interface ActivityItem {
  id: string;
  activityType: string;
  courseCode: string | null;
  courseTitle: string | null;
  weekNumber: number | null;
  entityMetadata: Record<string, any> | null;
  createdAt: string;
}

interface ProgressData {
  streakDays: number;
  activitiesToday: number;
  activitiesThisWeek: number;
  lastActivityAt: string | null;
  courses: CourseProgress[];
  recentActivity: ActivityItem[];
}

const ACTIVITY_LABELS: Record<
  string,
  { label: string; icon: typeof BookOpen }
> = {
  material_viewed: { label: "Opened material", icon: BookOpen },
  flashcard_reviewed: { label: "Reviewed flashcard", icon: Layers },
  study_guide_generated: { label: "Generated study guide", icon: Brain },
  practice_questions_generated: {
    label: "Generated practice questions",
    icon: FileText,
  },
  quiz_viewed: { label: "Opened quiz", icon: FileText },
  assignment_viewed: { label: "Opened assignment", icon: FileText },
};

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs} hr${diffHrs !== 1 ? "s" : ""} ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return "yesterday";
  if (diffDays < 30) return `${diffDays} days ago`;
  return new Date(dateStr).toLocaleDateString();
}

function formatActivityDescription(item: ActivityItem): string {
  const meta = item.entityMetadata;
  const course = item.courseCode ? ` in ${item.courseCode}` : "";
  const week = item.weekNumber ? ` Week ${item.weekNumber}` : "";

  switch (item.activityType) {
    case "material_viewed":
      return `Opened '${meta?.title || "a material"}'${course}`;
    case "flashcard_reviewed":
      return `Reviewed a flashcard${course}${week}`;
    case "study_guide_generated":
      return `Generated a study guide${course}${week}`;
    case "practice_questions_generated":
      return `Generated practice questions${course}${week}`;
    case "quiz_viewed":
      return `Opened a quiz${course}${week}`;
    case "assignment_viewed":
      return `Opened an assignment${course}${week}`;
    default:
      return `Activity${course}`;
  }
}

export default function ProgressPage() {
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/progress/overview")
      .then((res) => res.json())
      .then((res) => {
        if (res.success) setData(res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-primary" />
            Progress
          </h1>
          <p className="text-muted-foreground">
            Your study activity and course coverage
          </p>
        </div>
        <div className="text-center py-12 text-muted-foreground">
          Loading progress...
        </div>
      </div>
    );
  }

  // Empty state: zero activity
  if (
    !data ||
    (data.streakDays === 0 &&
      data.activitiesToday === 0 &&
      data.activitiesThisWeek === 0 &&
      data.recentActivity.length === 0)
  ) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-primary" />
            Progress
          </h1>
          <p className="text-muted-foreground">
            Your study activity and course coverage
          </p>
        </div>
        <Card>
          <CardContent className="text-center py-16">
            <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">
              Start studying and your progress will show up here
            </p>
            <p className="text-muted-foreground max-w-md mx-auto">
              Open a course material, review some flashcards, or ask Askly to
              generate a study guide.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <TrendingUp className="h-8 w-8 text-primary" />
          Progress
        </h1>
        <p className="text-muted-foreground">
          Your study activity and course coverage
        </p>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-500/10 p-2.5">
                <Flame className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.streakDays}</p>
                <p className="text-sm text-muted-foreground">
                  {data.streakDays === 1
                    ? "day streak"
                    : data.streakDays > 0
                      ? "day streak"
                      : "No streak yet"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2.5">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.activitiesToday}</p>
                <p className="text-sm text-muted-foreground">
                  {data.activitiesToday === 0
                    ? "No activity yet today"
                    : data.activitiesToday === 1
                      ? "activity today"
                      : "activities today"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-500/10 p-2.5">
                <CalendarDays className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.activitiesThisWeek}</p>
                <p className="text-sm text-muted-foreground">
                  {data.activitiesThisWeek === 0
                    ? "No activity this week"
                    : data.activitiesThisWeek === 1
                      ? "activity this week"
                      : "activities this week"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-course progress */}
      {data.courses.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Course Progress</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {data.courses.map((course) => (
              <Card key={course.courseId}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {course.courseCode}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {course.courseTitle}
                      </p>
                    </div>
                    {course.coveragePct !== null ? (
                      <Badge variant="outline" className="shrink-0">
                        {course.coveragePct}%
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        No materials yet
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Progress bar */}
                  {course.coveragePct !== null && (
                    <div className="space-y-1.5">
                      <Progress value={course.coveragePct} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {course.viewedMaterials} of {course.totalMaterials}{" "}
                        materials opened
                      </p>
                    </div>
                  )}

                  {/* Week pills */}
                  {(course.weeksTouched.length > 0 ||
                    course.weeksUntouched.length > 0) && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground">
                        Weeks
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {[...course.weeksTouched, ...course.weeksUntouched]
                          .sort((a, b) => a - b)
                          .map((week) => {
                            const touched = course.weeksTouched.includes(week);
                            return (
                              <span
                                key={week}
                                className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-medium transition-colors ${
                                  touched
                                    ? "bg-primary text-primary-foreground"
                                    : "border border-border text-muted-foreground"
                                }`}
                              >
                                {week}
                              </span>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* Last touched */}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                    <Clock className="h-3 w-3" />
                    {course.lastTouchedAt
                      ? `Last studied ${relativeTime(course.lastTouchedAt)}`
                      : "Never opened"}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Recent activity feed */}
      {data.recentActivity.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Recent Activity</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {data.recentActivity.map((item) => {
                  const config = ACTIVITY_LABELS[item.activityType] || {
                    label: "Activity",
                    icon: Activity,
                  };
                  const Icon = config.icon;

                  return (
                    <div key={item.id} className="flex items-start gap-3">
                      <div className="rounded-md bg-muted p-1.5 mt-0.5 shrink-0">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-snug">
                          {formatActivityDescription(item)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {relativeTime(item.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
