import { Suspense } from "react";
import { getSession } from "@/lib/auth/server";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { AsklyBackground } from "@/components/ask/AsklyBackground";
import { AsklyHeader } from "@/components/ask/AsklyHeader";
import { DashboardClient } from "./DashboardClient";
import type { UpcomingAssignment, LatestAnnouncement } from "./DashboardClient";

// ── Greeting helper ───────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "Late night";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// ── Data fetching ─────────────────────────────────────────────────────────────

async function getPageData(userId: string) {
  const [enrollments, upcomingRaw] = await Promise.all([
    pgAcademicRepository.getStudentEnrollments(userId).catch(() => []),
    pgAcademicRepository
      .getStudentUpcomingAssignments(userId, 1)
      .catch(() => []),
  ]);

  // Only consider currently-active enrollments (excludes completed 100L courses)
  const activeEnrollments = enrollments.filter(
    (e) => (e as any).status === "enrolled"
  );

  // Resolve first course details (enrollment only has courseId)
  const firstEnrollment = activeEnrollments[0] ?? null;
  const firstCourse = firstEnrollment
    ? await pgAcademicRepository
        .getCourseById(firstEnrollment.courseId)
        .catch(() => null)
    : null;

  const courseCode = firstCourse?.courseCode ?? "your course";

  // Latest announcement for enrolled course (or site-wide)
  const announcements = firstCourse
    ? await pgAcademicRepository
        .getAnnouncements(firstCourse.id, undefined, 1)
        .catch(() => [])
    : [];

  // Shape upcoming assignment
  const firstAssignment = upcomingRaw[0] ?? null;
  const upcomingAssignment: UpcomingAssignment | null = firstAssignment
    ? {
        id: firstAssignment.assignment.id,
        title: firstAssignment.assignment.title,
        courseCode: firstAssignment.course.courseCode,
        dueDate: firstAssignment.assignment.dueDate,
      }
    : null;

  // Shape announcement
  const ann = announcements[0] ?? null;
  const latestAnnouncement: LatestAnnouncement | null = ann
    ? {
        id: ann.id,
        title: ann.title,
        content: ann.content ?? "",
        createdAt: ann.createdAt,
        postedBy: undefined,
      }
    : null;

  return {
    courseCode,
    hasEnrollments: activeEnrollments.length > 0,
    upcomingAssignment,
    latestAnnouncement,
  };
}

// ── Server component ──────────────────────────────────────────────────────────

async function DashboardContent() {
  const session = await getSession();
  const user = session.user;

  const firstName = (user.name ?? "Student").split(" ")[0];
  const userInitials = (user.name ?? "S")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const data = await getPageData(user.id).catch(() => ({
    courseCode: "your course",
    hasEnrollments: false,
    upcomingAssignment: null,
    latestAnnouncement: null,
  }));

  const greeting = getGreeting();

  // Status badge: show academic year + course code if enrolled
  const statusBadge = data.hasEnrollments
    ? `200L · ${data.courseCode} in progress`
    : "200L · First Semester";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--askly-bg)",
        color: "var(--askly-text-primary)",
        fontFamily: "inherit",
        position: "relative",
      }}
    >
      {/* Animated orb background — z-index 0 */}
      <AsklyBackground intensity="normal" />

      {/* Main content — z-index 2 */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          maxWidth: "880px",
          margin: "0 auto",
          padding: "0 1.5rem",
        }}
      >
        {/* Header */}
        <AsklyHeader
          navItems={[
            { label: "Courses", href: "/student/courses" },
            { label: "Materials", href: "/student/materials" },
            { label: "Grades", href: "/student/grades" },
            { label: "Schedule", href: "/student/schedule" },
          ]}
          userInitials={userInitials}
          userName={user.name ?? "Student"}
        />

        {/* All interactive content */}
        <DashboardClient
          greeting={greeting}
          firstName={firstName}
          statusBadge={statusBadge}
          courseCode={data.courseCode}
          upcomingAssignment={data.upcomingAssignment}
          latestAnnouncement={data.latestAnnouncement}
        />

        {/* Empty state for students with no enrollments */}
        {!data.hasEnrollments && (
          <div
            style={{
              textAlign: "center",
              padding: "1.5rem",
              marginTop: "1rem",
            }}
          >
            <p
              style={{
                fontSize: "0.8125rem",
                color: "var(--askly-text-muted)",
              }}
            >
              No enrolled courses yet.{" "}
              <a
                href="/student/onboarding"
                style={{
                  color: "var(--askly-amber-400)",
                  textDecoration: "none",
                }}
              >
                Visit onboarding
              </a>{" "}
              to set up your program.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StudentDashboardPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            background: "var(--askly-bg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                border: "2px solid transparent",
                borderTopColor: "var(--askly-amber-400)",
                animation: "spin 0.8s linear infinite",
                margin: "0 auto 1rem",
              }}
            />
            <p
              style={{
                fontSize: "0.8125rem",
                color: "var(--askly-text-tertiary)",
              }}
            >
              Loading…
            </p>
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
