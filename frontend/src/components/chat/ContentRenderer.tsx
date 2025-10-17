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
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
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
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                📚 {course_code} Course Materials
              </h3>
              <p className="text-gray-600">
                Found <span className="font-semibold text-blue-600">{total_count || materials.length}</span> materials
                {materials.length > 0 && materials[0]?.week_number && (
                  <span> for Week {materials[0].week_number}</span>
                )}
              </p>
            </div>
            <div className="text-right">
              <div className="flex space-x-2">
                <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  {materials.filter((m: any) => m?.file_url?.includes('.pdf')).length} PDFs
                </div>
                <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
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
        <div className="bg-gray-50 p-4 rounded-lg border">
          <h4 className="font-semibold mb-3 text-gray-900">📋 Quick Actions for {course_code}:</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button
              onClick={() => handleQuickAction('generate_study_guide', course_code)}
              variant="outline"
              size="sm"
              className="justify-start hover:bg-green-50 hover:border-green-300"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Study Guide
            </Button>
            <Button
              onClick={() => handleQuickAction('create_flashcards', course_code)}
              variant="outline"
              size="sm"
              className="justify-start hover:bg-purple-50 hover:border-purple-300"
            >
              <Target className="w-4 h-4 mr-2" />
              Flashcards
            </Button>
            <Button
              onClick={() => handleQuickAction('get_assignments', course_code)}
              variant="outline"
              size="sm"
              className="justify-start hover:bg-orange-50 hover:border-orange-300"
            >
              <FileText className="w-4 h-4 mr-2" />
              Assignments
            </Button>
            <Button
              onClick={() => handleQuickAction('get_schedule', course_code)}
              variant="outline"
              size="sm"
              className="justify-start hover:bg-blue-50 hover:border-blue-300"
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
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
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
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Courses</p>
                <p className="text-3xl font-bold">{total_courses || enrollments.length}</p>
              </div>
              <GraduationCap className="w-8 h-8 text-blue-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Total Credits</p>
                <p className="text-3xl font-bold">{total_credits || 0}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Student ID</p>
                <p className="text-lg font-bold">{student_id || 'N/A'}</p>
              </div>
              <Users className="w-8 h-8 text-purple-200" />
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
                    <h4 className="font-bold text-lg text-gray-900">{course.course_code}</h4>
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                      {course.credits} credits
                    </span>
                  </div>
                  <p className="text-gray-700 font-medium mb-3">{course.course_name}</p>
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
                  className="text-xs hover:bg-blue-50"
                >
                  📖 Materials
                </Button>
                <Button
                  onClick={() => onToolCall?.('get_upcoming_assignments', { course_code: course.course_code })}
                  size="sm"
                  variant="outline"
                  className="text-xs hover:bg-green-50"
                >
                  📝 Assignments
                </Button>
                <Button
                  onClick={() => onToolCall?.('get_course_schedule', { course_code: course.course_code })}
                  size="sm"
                  variant="outline"
                  className="text-xs hover:bg-purple-50"
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
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Upcoming Assignments!</h3>
          <p className="text-gray-600">You&apos;re all caught up. Great work!</p>
        </div>
      );
    }

    const getUrgencyColor = (urgency: string) => {
      switch (urgency) {
        case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
        case 'soon': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        default: return 'bg-green-100 text-green-800 border-green-200';
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
        <div className="bg-gradient-to-r from-orange-50 to-red-50 p-6 rounded-lg border border-orange-200">
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            📝 Upcoming Assignments
          </h3>
          <p className="text-gray-600">
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
                    <h4 className="font-semibold text-lg text-gray-900">{assignment.title}</h4>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium border",
                      getUrgencyColor(assignment.urgency)
                    )}>
                      {getUrgencyIcon(assignment.urgency)} {assignment.urgency}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-2">{assignment.course_name} ({assignment.course_code})</p>
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
        <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border border-green-200">
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            📚 Study Guide Generated
          </h3>
          <p className="text-gray-600">
            Comprehensive study material based on your course content
          </p>
        </div>

        <div className="prose prose-sm max-w-none bg-white p-6 rounded-lg border">
          {sections.map((section, index) => {
            const lines = section.split('\n');
            const title = lines[0];
            const content = lines.slice(1).join('\n');
            
            return (
              <div key={index} className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">{title}</h4>
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
        <div className="bg-gray-50 p-4 rounded-lg border">
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