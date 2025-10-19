"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar, Clock, Target, FileText, AlertCircle } from "lucide-react";

type AssignmentListProps = {
  student_id?: string;
  total_count?: number;
  assignments: Array<{
    assignment_id?: string;
    title: string;
    course_code: string;
    course_name: string;
    due_date: string;
    due_time?: string;
    points_possible?: number;
    assignment_type?: string;
    urgency?: "urgent" | "soon" | "later";
    days_until_due?: number;
    description?: string;
    status?: string;
  }>;
};

export function AssignmentList(props: AssignmentListProps) {
  const totalCount = props.total_count || props.assignments.length;

  const getUrgencyIndicator = (urgency?: string) => {
    switch (urgency) {
      case 'urgent':
        return { icon: '🚨', label: 'Urgent', color: 'text-red-600 border-red-200' };
      case 'soon':
        return { icon: '⚠️', label: 'Soon', color: 'text-yellow-600 border-yellow-200' };
      default:
        return { icon: '✅', label: 'Later', color: 'text-green-600 border-green-200' };
    }
  };

  if (props.assignments.length === 0) {
    return (
      <Card className="bg-card">
        <CardContent className="py-12 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-lg font-semibold mb-2">No Upcoming Assignments!</h3>
          <p className="text-sm text-muted-foreground">You&apos;re all caught up. Great work!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Upcoming Assignments</CardTitle>
          <CardDescription>
            You have {totalCount} {totalCount === 1 ? 'assignment' : 'assignments'} due soon
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="space-y-3">
        {props.assignments.map((assignment, index) => {
          const urgency = getUrgencyIndicator(assignment.urgency);
          
          return (
            <Card key={index} className="bg-card hover:bg-secondary/20 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-sm">{assignment.title}</h4>
                      {assignment.urgency && (
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${urgency.color}`}>
                          {urgency.icon} {urgency.label}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {assignment.course_name} ({assignment.course_code})
                    </p>
                    {assignment.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {assignment.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-muted-foreground">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        Due: {assignment.due_date}
                        {assignment.due_time && ` at ${assignment.due_time}`}
                      </span>
                    </div>
                    {assignment.points_possible !== undefined && (
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        <span>{assignment.points_possible} points</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    {assignment.assignment_type && (
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span className="capitalize">{assignment.assignment_type}</span>
                      </div>
                    )}
                    {assignment.days_until_due !== undefined && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>
                          {assignment.days_until_due === 0 
                            ? 'Due today' 
                            : assignment.days_until_due === 1
                            ? '1 day remaining'
                            : `${assignment.days_until_due} days remaining`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {assignment.status && assignment.status !== 'not_started' && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex items-center gap-2 text-sm">
                      <AlertCircle className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground capitalize">
                        Status: {assignment.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
