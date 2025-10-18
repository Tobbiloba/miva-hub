"use client";

import { useState } from 'react';
import { MaterialCard } from './MaterialCard';
import { Button } from 'ui/button';
import { cn } from 'lib/utils';
import { 
  BookOpen, 
  Calendar, 
  Clock, 
  GraduationCap, 
  AlertCircle,
  Target,
  TrendingUp,
  Users,
  FileText,
  Video,
  Music
} from 'lucide-react';

interface ContentRendererProps {
  content: any;
  type: 'course_materials' | 'enrollments' | 'assignments' | 'study_guide' | 'announcements' | 'schedule' | 'default';
  onToolCall?: (toolName: string, params: any) => void;
}

export function ContentRenderer({ content, type, onToolCall }: ContentRendererProps) {
  const [materialViewer, setMaterialViewer] = useState<any>(null);

  const handleViewMaterial = (material: any) => {
    setMaterialViewer(material);
    // In a real implementation, this would open a modal viewer
    console.log('View material:', material);
  };

  const handleDownloadMaterial = (material: any) => {
    // Convert S3 URL to downloadable link
    const downloadUrl = `/api/files/download?url=${encodeURIComponent(material.file_url)}`;
    window.open(downloadUrl, '_blank');
  };

  const handleQuickAction = (action: string, courseCode?: string, materialId?: string) => {
    switch (action) {
      case 'generate_study_guide':
        onToolCall?.('generate_study_guide', {
          course_id: courseCode,
          difficulty_level: 'medium'
        });
        break;
      case 'create_flashcards':
        onToolCall?.('create_flashcards', {
          course_id: courseCode,
          topic: 'general',
          count: 10
        });
        break;
      case 'ask_question':
        onToolCall?.('ask_study_question', {
          question: '',
          course_id: courseCode
        });
        break;
      case 'get_assignments':
        onToolCall?.('get_upcoming_assignments', {
          course_code: courseCode,
          days_ahead: 30
        });
        break;
      case 'get_schedule':
        onToolCall?.('get_course_schedule', {
          course_code: courseCode
        });
        break;
    }
  };

  const renderCourseMaterials = (data: any) => {
    const { course_code, materials, total_count } = data;
    
    // Safety checks
    if (!materials || !Array.isArray(materials)) {
      return (
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-yellow-600 mr-2">⚠️</div>
            <div>
              <h4 className="font-semibold text-yellow-800">No Materials Found</h4>
              <p className="text-yellow-700 text-sm">No course materials are available for {course_code}.</p>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="space-y-6">
        {/* Header Section */}
        <div className="bg-card p-6 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold mb-2">
                📚 {course_code} Course Materials
              </h3>
              <p className="text-sm text-muted-foreground">
                Found <span className="font-semibold text-blue-600">{total_count || materials.length}</span> materials
                {materials.length > 0 && materials[0]?.week_number && (
                  <span> for Week {materials[0].week_number}</span>
                )}
              </p>
            </div>
            <div className="text-right">
              <div className="flex space-x-2">
                <div className="border text-muted-foreground px-3 py-1 rounded-full text-sm font-medium">
                  {materials.filter((m: any) => m?.file_url?.includes('.pdf')).length} PDFs
                </div>
                <div className="border text-muted-foreground px-3 py-1 rounded-full text-sm font-medium">
                  {materials.filter((m: any) => m?.file_url?.includes('.mp4')).length} Videos
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Materials Grid */}
        <div className="space-y-4">
          {materials.map((material: any) => (
            <MaterialCard
              key={material.id}
              material={material}
              onView={handleViewMaterial}
              onDownload={handleDownloadMaterial}
              isViewed={false} // TODO: Implement viewed tracking
              onGenerateStudyGuide={() => handleQuickAction('generate_study_guide', course_code)}
              onCreateFlashcards={() => handleQuickAction('create_flashcards', course_code)}
              onAskQuestion={() => handleQuickAction('ask_question', course_code)}
            />
          ))}
        </div>
        
        {/* Quick Actions Panel */}
        <div className="bg-card p-4 rounded-lg border">
          <h4 className="text-sm font-medium mb-3">📋 Quick Actions for {course_code}:</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button
              onClick={() => handleQuickAction('generate_study_guide', course_code)}
              variant="outline"
              size="sm"
              className="justify-start hover:bg-secondary"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Study Guide
            </Button>
            <Button
              onClick={() => handleQuickAction('create_flashcards', course_code)}
              variant="outline"
              size="sm"
              className="justify-start hover:bg-secondary"
            >
              <Target className="w-4 h-4 mr-2" />
              Flashcards
            </Button>
            <Button
              onClick={() => handleQuickAction('get_assignments', course_code)}
              variant="outline"
              size="sm"
              className="justify-start hover:bg-secondary"
            >
              <FileText className="w-4 h-4 mr-2" />
              Assignments
            </Button>
            <Button
              onClick={() => handleQuickAction('get_schedule', course_code)}
              variant="outline"
              size="sm"
              className="justify-start hover:bg-secondary"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Schedule
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderEnrollments = (data: any) => {
    const { enrollments, total_courses, total_credits, student_id } = data;
    
    // Safety checks
    if (!enrollments || !Array.isArray(enrollments)) {
      return (
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-yellow-600 mr-2">⚠️</div>
            <div>
              <h4 className="font-semibold text-yellow-800">No Enrollment Data</h4>
              <p className="text-yellow-700 text-sm">No course enrollment information is available.</p>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-card border p-6 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Total Courses</p>
                <p className="text-lg font-semibold">{total_courses || enrollments.length}</p>
              </div>
              <GraduationCap className="w-8 h-8 text-primary" />
            </div>
          </div>
          
          <div className="bg-card border p-6 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Total Credits</p>
                <p className="text-lg font-semibold">{total_credits || 0}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
          </div>
          
          <div className="bg-card border p-6 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Student ID</p>
                <p className="text-lg font-bold">{student_id || 'N/A'}</p>
              </div>
              <Users className="w-8 h-8 text-primary" />
            </div>
          </div>
        </div>
        
        {/* Courses Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {enrollments.map((course: any, index: number) => (
            <div key={index} className="border rounded-lg p-5 hover:shadow-lg transition-all duration-200 bg-card">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium text-sm">{course.course_code}</h4>
                    <span className="border text-muted-foreground px-2 py-1 rounded-full text-xs font-medium">
                      {course.credits} credits
                    </span>
                  </div>
                  <p className="text-sm mb-3">{course.course_name}</p>
                </div>
              </div>
              
              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>Instructor: {course.instructor}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Enrolled: {new Date(course.enrollment_date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    course.status === 'enrolled' ? 'bg-green-500' : 'bg-gray-400'
                  )} />
                  <span>Status: {course.status}</span>
                </div>
              </div>
              
              {/* Course Actions */}
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => onToolCall?.('get_course_materials', { course_code: course.course_code })}
                  size="sm"
                  variant="outline"
                  className="text-xs hover:bg-secondary"
                >
                  📖 Materials
                </Button>
                <Button
                  onClick={() => onToolCall?.('get_upcoming_assignments', { course_code: course.course_code })}
                  size="sm"
                  variant="outline"
                  className="text-xs hover:bg-secondary"
                >
                  📝 Assignments
                </Button>
                <Button
                  onClick={() => onToolCall?.('get_course_schedule', { course_code: course.course_code })}
                  size="sm"
                  variant="outline"
                  className="text-xs hover:bg-secondary"
                >
                  📅 Schedule
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderAssignments = (data: any) => {
    const { assignments, total_count, student_id } = data;
    
    if (!assignments || assignments.length === 0) {
      return (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-sm font-medium mb-2">No Upcoming Assignments!</h3>
          <p className="text-sm text-muted-foreground">You&apos;re all caught up. Great work!</p>
        </div>
      );
    }

    const getUrgencyColor = (urgency: string) => {
      switch (urgency) {
        case 'urgent': return 'border border-red-200 text-red-800';
        case 'soon': return 'border border-yellow-200 text-yellow-800';
        default: return 'border border-green-200 text-green-800';
      }
    };

    const getUrgencyIcon = (urgency: string) => {
      switch (urgency) {
        case 'urgent': return '🚨';
        case 'soon': return '⚠️';
        default: return '✅';
      }
    };

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-card p-6 rounded-lg border">
          <h3 className="text-sm font-semibold mb-2">
            📝 Upcoming Assignments
          </h3>
          <p className="text-sm text-muted-foreground">
            You have <span className="font-semibold text-orange-600">{total_count}</span> assignments due soon
          </p>
        </div>

        {/* Assignments List */}
        <div className="space-y-4">
          {assignments.map((assignment: any, index: number) => (
            <div key={index} className="border rounded-lg p-5 bg-card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-medium text-sm">{assignment.title}</h4>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium border",
                      getUrgencyColor(assignment.urgency)
                    )}>
                      {getUrgencyIcon(assignment.urgency)} {assignment.urgency}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{assignment.course_name} ({assignment.course_code})</p>
                  {assignment.description && (
                    <p className="text-sm text-gray-600 mb-3 overflow-hidden" style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}>{assignment.description}</p>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span>Due: {assignment.due_date} at {assignment.due_time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-gray-500" />
                    <span>Points: {assignment.points_possible}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <span>Type: {assignment.assignment_type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span>{assignment.days_until_due} days remaining</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderStudyGuide = (content: string) => {
    // Parse the study guide content and render it with proper formatting
    const sections = content.split(/###\s+/).filter(Boolean);
    
    return (
      <div className="space-y-6">
        <div className="bg-card p-6 rounded-lg border">
          <h3 className="text-sm font-semibold mb-2">
            📚 Study Guide Generated
          </h3>
          <p className="text-sm text-muted-foreground">
            Comprehensive study material based on your course content
          </p>
        </div>

        <div className="prose prose-sm max-w-none bg-card p-6 rounded-lg border">
          {sections.map((section, index) => {
            const lines = section.split('\n');
            const title = lines[0];
            const content = lines.slice(1).join('\n');
            
            return (
              <div key={index} className="mb-6">
                <h4 className="text-sm font-medium mb-3">{title}</h4>
                <div className="prose prose-sm text-gray-700" dangerouslySetInnerHTML={{ 
                  __html: content.replace(/\n/g, '<br/>') 
                }} />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Main render logic
  switch (type) {
    case 'course_materials':
      return renderCourseMaterials(content);
    case 'enrollments':
      return renderEnrollments(content);
    case 'assignments':
      return renderAssignments(content);
    case 'study_guide':
      return renderStudyGuide(content);
    default:
      // Fallback for JSON display
      return (
        <div className="bg-card p-4 rounded-lg border">
          <details className="cursor-pointer">
            <summary className="font-medium text-gray-700 mb-2">Raw Response Data</summary>
            <pre className="text-xs text-gray-600 overflow-x-auto">
              {JSON.stringify(content, null, 2)}
            </pre>
          </details>
        </div>
      );
  }
}