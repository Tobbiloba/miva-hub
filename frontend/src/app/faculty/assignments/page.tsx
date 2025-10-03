import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  FileText,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  Users,
  Award,
  Edit3,
  Eye,
  Trash2,
  Download,
  AlertCircle,
  CheckCircle,
  MoreHorizontal,
  Copy
} from "lucide-react";
import { getSession } from "@/lib/auth/server";
import { getFacultyInfo } from "@/lib/auth/faculty";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default async function FacultyAssignmentsPage() {
  const session = await getSession();
  const facultyInfo = getFacultyInfo(session);
  
  if (!facultyInfo) {
    return <div>Error: Invalid faculty session</div>;
  }

  // Get faculty database record
  const facultyRecord = await pgAcademicRepository.getFacultyByUserId(facultyInfo.id);
  
  if (!facultyRecord) {
    return <div>Error: Faculty record not found</div>;
  }

  // Fetch assignment data with statistics
  const allAssignments = await pgAcademicRepository.getFacultyAssignmentsWithStatistics(facultyRecord.id);

  // Categorize assignments
  const now = new Date();
  const categorizedAssignments = {
    published: allAssignments.filter(({ assignment }) => assignment.isPublished),
    drafts: allAssignments.filter(({ assignment }) => !assignment.isPublished),
    upcoming: allAssignments.filter(({ assignment }) => 
      assignment.isPublished && new Date(assignment.dueDate) > now
    ),
    past: allAssignments.filter(({ assignment }) => 
      assignment.isPublished && new Date(assignment.dueDate) <= now
    ),
  };

  const stats = {
    total: allAssignments.length,
    published: categorizedAssignments.published.length,
    drafts: categorizedAssignments.drafts.length,
    dueThisWeek: allAssignments.filter(({ assignment }) => {
      const dueDate = new Date(assignment.dueDate);
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return assignment.isPublished && dueDate > now && dueDate <= weekFromNow;
    }).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8 text-blue-600" />
            Assignments
          </h1>
          <p className="text-muted-foreground mt-1">
            Create and manage assignments across all your courses
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button variant="outline">
            <Search className="mr-2 h-4 w-4" />
            Search
          </Button>
          <Button asChild>
            <Link href="/faculty/assignments/create">
              <Plus className="mr-2 h-4 w-4" />
              New Assignment
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Assignments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.published}</p>
                <p className="text-sm text-muted-foreground">Published</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <Edit3 className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.drafts}</p>
                <p className="text-sm text-muted-foreground">Drafts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.dueThisWeek}</p>
                <p className="text-sm text-muted-foreground">Due This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search assignments by title, course, or type..."
                  className="pl-10"
                />
              </div>
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              More Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Assignment Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            All ({stats.total})
          </TabsTrigger>
          <TabsTrigger value="published" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Published ({stats.published})
          </TabsTrigger>
          <TabsTrigger value="drafts" className="flex items-center gap-2">
            <Edit3 className="h-4 w-4" />
            Drafts ({stats.drafts})
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Upcoming ({categorizedAssignments.upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="past" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Past ({categorizedAssignments.past.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <AssignmentsList 
            assignments={allAssignments} 
            showCourse={true}
            emptyMessage="No assignments created yet. Create your first assignment to get started."
          />
        </TabsContent>

        <TabsContent value="published" className="space-y-4">
          <AssignmentsList 
            assignments={categorizedAssignments.published} 
            showCourse={true}
            emptyMessage="No published assignments. Publish your drafts to make them available to students."
          />
        </TabsContent>

        <TabsContent value="drafts" className="space-y-4">
          <AssignmentsList 
            assignments={categorizedAssignments.drafts} 
            showCourse={true}
            emptyMessage="No draft assignments. Create a new assignment and save it as a draft."
          />
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4">
          <AssignmentsList 
            assignments={categorizedAssignments.upcoming} 
            showCourse={true}
            emptyMessage="No upcoming assignments. All current assignments have passed their due dates."
          />
        </TabsContent>

        <TabsContent value="past" className="space-y-4">
          <AssignmentsList 
            assignments={categorizedAssignments.past} 
            showCourse={true}
            emptyMessage="No past assignments found."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AssignmentsList({ 
  assignments, 
  showCourse = true,
  emptyMessage 
}: { 
  assignments: any[];
  showCourse?: boolean;
  emptyMessage: string;
}) {
  if (assignments.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Assignments Found</h3>
          <p className="text-muted-foreground mb-4">{emptyMessage}</p>
          <Button asChild>
            <Link href="/faculty/assignments/create">
              <Plus className="mr-2 h-4 w-4" />
              Create Assignment
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {assignments.map(({ assignment, course, submissionStats }) => {
        const dueDate = new Date(assignment.dueDate);
        const now = new Date();
        const isOverdue = dueDate < now && assignment.isPublished;
        const isDueSoon = dueDate > now && dueDate <= new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        
        return (
          <Card key={assignment.id} className={`hover:shadow-md transition-shadow ${isOverdue ? 'border-red-200 dark:border-red-800' : ''}`}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="mt-1">
                  {assignment.isPublished ? (
                    isOverdue ? (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )
                  ) : (
                    <Edit3 className="h-5 w-5 text-orange-600" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{assignment.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {assignment.description || "No description provided"}
                      </p>
                      
                      <div className="flex items-center gap-2 mt-3">
                        {showCourse && (
                          <Badge variant="outline" className="text-xs">
                            {course.courseCode}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-xs">
                          {assignment.assignmentType}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {assignment.totalPoints} pts
                        </Badge>
                        {!assignment.isPublished && (
                          <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                            Draft
                          </Badge>
                        )}
                        {isDueSoon && assignment.isPublished && (
                          <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300">
                            Due Soon
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-medium ${isOverdue ? 'text-red-600' : isDueSoon ? 'text-yellow-600' : ''}`}>
                        {isOverdue ? 'Overdue' : 'Due'}: {dueDate.toLocaleDateString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      
                      {assignment.weekNumber && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Week {assignment.weekNumber}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{Number(submissionStats?.totalSubmissions) || 0} submission{Number(submissionStats?.totalSubmissions) !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Award className="h-3 w-3" />
                        <span>{Number(submissionStats?.gradedSubmissions) || 0} graded</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>Created {new Date(assignment.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/faculty/assignments/${assignment.id}/edit`}>
                          <Edit3 className="mr-2 h-3 w-3" />
                          Edit
                        </Link>
                      </Button>
                      
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/faculty/assignments/${assignment.id}/grade`}>
                          <Award className="mr-2 h-3 w-3" />
                          Grade
                        </Link>
                      </Button>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/faculty/assignments/${assignment.id}`}>
                              <Eye className="mr-2 h-3 w-3" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Copy className="mr-2 h-3 w-3" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="mr-2 h-3 w-3" />
                            Export Submissions
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="mr-2 h-3 w-3" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}