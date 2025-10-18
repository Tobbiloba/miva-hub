"use client";

import { useState } from 'react';
import { ContentRenderer } from './ContentRenderer';
import { MaterialViewer } from './MaterialViewer';
import { appStore } from '@/app/store';
import { useShallow } from 'zustand/shallow';

interface MIVAContentRendererProps {
  toolName: string;
  result: any;
}

export function MIVAContentRenderer({ toolName, result }: MIVAContentRendererProps) {
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [showMaterialViewer, setShowMaterialViewer] = useState(false);

  const [mcpClientsManager] = appStore(
    useShallow((state) => [state.mcpClientsManager])
  );

  // Extract content from result structure
  const getContent = () => {
    // Handle different result structures
    if (result?.content && Array.isArray(result.content)) {
      // MCP tool response format
      const textContent = result.content.find((item: any) => item.type === 'text');
      if (textContent?.text) {
        if (typeof textContent.text === 'string') {
          try {
            return JSON.parse(textContent.text);
          } catch {
            return textContent.text;
          }
        }
        return textContent.text;
      }
    }
    
    // Direct result
    if (result && typeof result === 'object') {
      return result;
    }
    
    return result;
  };

  // Determine content type based on tool name
  const getContentType = (toolName: string) => {
    const toolTypeMap: Record<string, string> = {
      'get_course_materials': 'course_materials',
      'list_enrolled_courses': 'enrollments',
      'get_upcoming_assignments': 'assignments',
      'generate_study_guide': 'study_guide',
      'view_course_announcements': 'announcements',
      'get_course_schedule': 'schedule',
      'get_academic_schedule': 'schedule',
      'get_course_info': 'course_info',
      'get_course_syllabus': 'syllabus',
      'create_flashcards': 'flashcards',
      'generate_quiz': 'quiz',
      'ask_study_question': 'study_answer',
    };
    
    return toolTypeMap[toolName] || 'default';
  };

  // Handle tool calls from the content renderer
  const handleToolCall = async (toolName: string, params: any) => {
    try {
      if (mcpClientsManager) {
        await mcpClientsManager.toolCallByServerName('miva-academic', toolName, params);
      }
    } catch (error) {
      console.error('Tool call failed:', error);
    }
  };

  // Handle material viewing
  const handleViewMaterial = (material: any) => {
    setSelectedMaterial(material);
    setShowMaterialViewer(true);
  };

  // Handle material download
  const handleDownloadMaterial = (material: any) => {
    const downloadUrl = `/api/files/stream?url=${encodeURIComponent(material.file_url)}`;
    window.open(downloadUrl, '_blank');
  };

  const content = getContent();
  const contentType = getContentType(toolName);

  // Handle error cases
  if (!content) {
    return (
      <div className="text-center py-4 text-gray-500">
        <p>No content available</p>
      </div>
    );
  }

  if (typeof content === 'string' && content.includes('error')) {
    return (
      <div className="bg-card border border-destructive rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-red-600 mr-2">⚠️</div>
          <div>
            <h4 className="font-semibold text-red-800">Error</h4>
            <p className="text-red-700 text-sm">{content}</p>
          </div>
        </div>
      </div>
    );
  }

  // Render special content types with enhanced UI
  if (contentType === 'course_materials' && content.materials) {
    return (
      <div className="space-y-4">
        <ContentRenderer 
          content={content} 
          type={contentType} 
          onToolCall={handleToolCall}
        />
        
        {/* Material Viewer Modal */}
        <MaterialViewer
          material={selectedMaterial}
          isOpen={showMaterialViewer}
          onClose={() => setShowMaterialViewer(false)}
          onGenerateStudyGuide={() => {
            handleToolCall('generate_study_guide', {
              course_id: content.course_code,
              difficulty_level: 'medium'
            });
            setShowMaterialViewer(false);
          }}
          onCreateFlashcards={() => {
            handleToolCall('create_flashcards', {
              course_id: content.course_code,
              topic: selectedMaterial?.title || 'general',
              count: 10
            });
            setShowMaterialViewer(false);
          }}
          onAskQuestion={() => {
            handleToolCall('ask_study_question', {
              question: `Tell me more about ${selectedMaterial?.title}`,
              course_id: content.course_code
            });
            setShowMaterialViewer(false);
          }}
        />
      </div>
    );
  }

  if (contentType === 'study_guide' && typeof content === 'string') {
    return (
      <div className="space-y-4">
        <ContentRenderer 
          content={content} 
          type={contentType} 
          onToolCall={handleToolCall}
        />
      </div>
    );
  }

  if (contentType === 'study_answer' && typeof content === 'string') {
    return (
      <div className="bg-card rounded-lg p-6 border">
        <div className="flex items-start space-x-3">
          <div className="text-3xl">🧠</div>
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 mb-3">Study Buddy Answer</h3>
            <div className="prose prose-blue max-w-none">
              <div dangerouslySetInnerHTML={{ 
                __html: content.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
              }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Use ContentRenderer for other academic content types
  return (
    <ContentRenderer 
      content={content} 
      type={contentType} 
      onToolCall={handleToolCall}
    />
  );
}