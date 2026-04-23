import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  GraduationCap,
  Users,
  Calendar,
  BookOpen,
  Plus,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { pgDb } from "@/lib/db/pg/db.pg";
import {
  AcademicSessionSchema,
  UserSchema,
} from "@/lib/db/pg/schema.pg";
import { eq, and, sql, desc } from "drizzle-orm";
import { EndSemesterConfirmation } from "./end-semester-confirmation";
import { EndSessionConfirmation } from "./end-session-confirmation";

export default async function AcademicManagementPage() {
  const adminAccess = await requireAdmin();
  if (adminAccess instanceof Response) {
    return <div>Access denied. Admin privileges required.</div>;
  }

  // Fetch current session
  const [currentSession] = await pgDb
    .select()
    .from(AcademicSessionSchema)
    .where(eq(AcademicSessionSchema.isCurrent, true))
    .limit(1);

  // Fetch all sessions
  const sessions = await pgDb
    .select()
    .from(AcademicSessionSchema)
    .orderBy(desc(AcademicSessionSchema.sessionName));

  // Fetch student counts
  const [activeStudentCount] = await pgDb
    .select({ count: sql<number>`count(*)` })
    .from(UserSchema)
    .where(
      and(
        eq(UserSchema.role, "student"),
        eq(UserSchema.enrollmentStatus, "active")
      )
    );

  const [graduatedCount] = await pgDb
    .select({ count: sql<number>`count(*)` })
    .from(UserSchema)
    .where(
      and(
        eq(UserSchema.role, "student"),
        eq(UserSchema.enrollmentStatus, "graduated")
      )
    );

  // Students by level
  const studentsByLevel = await pgDb
    .select({
      level: UserSchema.currentLevel,
      count: sql<number>`count(*)`,
    })
    .from(UserSchema)
    .where(
      and(
        eq(UserSchema.role, "student"),
        eq(UserSchema.enrollmentStatus, "active")
      )
    )
    .groupBy(UserSchema.currentLevel)
    .orderBy(UserSchema.currentLevel);

  // Students by semester
  const studentsBySemester = await pgDb
    .select({
      semester: UserSchema.currentSemester,
      count: sql<number>`count(*)`,
    })
    .from(UserSchema)
    .where(
      and(
        eq(UserSchema.role, "student"),
        eq(UserSchema.enrollmentStatus, "active")
      )
    )
    .groupBy(UserSchema.currentSemester);

  const totalActive = Number(activeStudentCount.count);
  const totalGraduated = Number(graduatedCount.count);

  const statusColor = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "closed":
        return "secondary";
      case "upcoming":
        return "outline";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Academic Sessions
          </h1>
          <p className="text-muted-foreground">
            Manage academic sessions, semesters, and student progression
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/academic/create-session">
            <Plus className="h-4 w-4 mr-2" />
            Create Session
          </Link>
        </Button>
      </div>

      {/* Section 1: Current Session Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Current Session Status
          </CardTitle>
          {!currentSession && (
            <CardDescription className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-4 w-4" />
              No active session. Create and activate one to begin.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {currentSession ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Session Name</p>
                  <p className="text-2xl font-bold">
                    {currentSession.sessionName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Current Semester
                  </p>
                  <p className="text-2xl font-bold capitalize">
                    {currentSession.currentSemester}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={statusColor(currentSession.status)}>
                    {currentSession.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Active Students
                  </p>
                  <p className="text-2xl font-bold">{totalActive}</p>
                </div>
              </div>

              {/* Level breakdown */}
              {studentsByLevel.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Students by Level
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {studentsByLevel.map((row) => (
                      <Badge key={row.level} variant="outline" className="text-sm">
                        {row.level ?? "N/A"}L: {Number(row.count)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Semester breakdown */}
              {studentsBySemester.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Students by Semester
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {studentsBySemester.map((row) => (
                      <Badge
                        key={row.semester}
                        variant="outline"
                        className="text-sm capitalize"
                      >
                        {row.semester ?? "N/A"}: {Number(row.count)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3 pt-2 border-t">
                <EndSemesterConfirmation />
                <EndSessionConfirmation
                  currentSessionName={currentSession.sessionName}
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Create a new session and mark it as current to get started.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Sessions List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            All Sessions
          </CardTitle>
          <CardDescription>
            {sessions.length} session{sessions.length !== 1 ? "s" : ""} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No sessions created yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Current Semester</TableHead>
                  <TableHead>First Sem Start</TableHead>
                  <TableHead>First Sem End</TableHead>
                  <TableHead>Second Sem Start</TableHead>
                  <TableHead>Second Sem End</TableHead>
                  <TableHead>Current</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">
                      {session.sessionName}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColor(session.status)}>
                        {session.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">
                      {session.currentSemester}
                    </TableCell>
                    <TableCell>{session.firstSemStart ?? "—"}</TableCell>
                    <TableCell>{session.firstSemEnd ?? "—"}</TableCell>
                    <TableCell>{session.secondSemStart ?? "—"}</TableCell>
                    <TableCell>{session.secondSemEnd ?? "—"}</TableCell>
                    <TableCell>
                      {session.isCurrent && (
                        <Badge variant="default">Active</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Active Students</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span className="text-3xl font-bold">{totalActive}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Graduated</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-muted-foreground" />
              <span className="text-3xl font-bold">{totalGraduated}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Session</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <span className="text-xl font-bold">
                {currentSession?.sessionName ?? "None"}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Current Semester</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
              <span className="text-xl font-bold capitalize">
                {currentSession?.currentSemester ?? "N/A"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
