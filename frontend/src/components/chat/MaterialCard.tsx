"use client";

import { useState } from 'react';
import { Button } from 'ui/button';
import { cn } from 'lib/utils';
import { Download, Eye, FileText, Video, Music, Image, File } from 'lucide-react';

interface MaterialCardProps {
  material: {
    id: string;
    title: string;
    material_type: 'resource' | 'assignment' | 'lecture' | 'quiz' | 'video' | 'audio';
    file_url: string;
    ai_summary?: string;
    key_concepts?: string[];
    week_number: number;
    upload_date: string;
    description?: string;
  };
  onView: (material: any) => void;
  onDownload: (material: any) => void;
  isViewed?: boolean;
  onGenerateStudyGuide?: () => void;
  onCreateFlashcards?: () => void;
  onAskQuestion?: () => void;
}

export function MaterialCard({ 
  material, 
  onView, 
  onDownload, 
  isViewed = false,
  onGenerateStudyGuide,
  onCreateFlashcards,
  onAskQuestion
}: MaterialCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getIcon = () => {
    const fileExtension = material.file_url.split('.').pop()?.toLowerCase();
    
    switch (fileExtension) {
      case 'pdf':
        return <FileText className="w-6 h-6 text-red-500" />;
      case 'mp4':
      case 'avi':
      case 'mov':
        return <Video className="w-6 h-6 text-blue-500" />;
      case 'mp3':
      case 'wav':
      case 'm4a':
        return <Music className="w-6 h-6 text-green-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
        return <Image className="w-6 h-6 text-purple-500" />;
      default:
        return <File className="w-6 h-6 text-gray-500" />;
    }
  };

  const getFileType = () => {
    const ext = material.file_url.split('.').pop()?.toLowerCase();
    return ext?.toUpperCase() || 'FILE';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getBadgeColor = () => {
    switch (material.material_type) {
      case 'lecture':
        return 'bg-blue-100 text-blue-800';
      case 'assignment':
        return 'bg-orange-100 text-orange-800';
      case 'quiz':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="border rounded-lg p-4 mb-4 hover:shadow-lg transition-all duration-200 bg-card">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start space-x-3 flex-1">
          <div className="flex-shrink-0 mt-1">
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg mb-1 overflow-hidden" style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}>
              {material.title}
            </h3>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className={cn("px-2 py-1 rounded-full text-xs font-medium", getBadgeColor())}>
                {material.material_type}
              </span>
              <span>Week {material.week_number}</span>
              <span>•</span>
              <span>{getFileType()}</span>
              <span>•</span>
              <span>{formatDate(material.upload_date)}</span>
              {isViewed && (
                <>
                  <span>•</span>
                  <span className="text-green-600 font-medium">✓ Viewed</span>
                </>
              )}
            </div>
            {material.description && (
              <p className="text-sm text-muted-foreground mt-2 overflow-hidden" style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}>
                {material.description}
              </p>
            )}
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex space-x-2 flex-shrink-0 ml-3">
          <Button 
            onClick={() => onView(material)}
            size="sm"
            variant="outline"
            className="hover:bg-blue-50 hover:border-blue-300"
          >
            <Eye className="w-4 h-4 mr-1" />
            View
          </Button>
          <Button 
            onClick={() => onDownload(material)}
            size="sm"
            variant="outline"
            className="hover:bg-gray-50"
          >
            <Download className="w-4 h-4 mr-1" />
            Download
          </Button>
        </div>
      </div>

      {/* AI Summary section (expandable) */}
      {material.ai_summary && (
        <div className="mt-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors"
          >
            <span>📋 AI Summary</span>
            <span className="text-xs">
              {isExpanded ? '▼' : '▶'}
            </span>
          </button>
          
          {isExpanded && (
            <div className="mt-2 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-200">
              <p className="text-sm text-gray-700 leading-relaxed">
                {material.ai_summary}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Key concepts as tags */}
      {material.key_concepts && material.key_concepts.length > 0 && (
        <div className="mt-3">
          <p className="text-sm font-medium mb-2">🔑 Key Concepts:</p>
          <div className="flex flex-wrap gap-1">
            {material.key_concepts.slice(0, 8).map((concept, index) => (
              <span 
                key={index}
                className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs cursor-pointer hover:bg-green-200 transition-colors"
                title={`Click to learn more about ${concept}`}
              >
                {concept}
              </span>
            ))}
            {material.key_concepts.length > 8 && (
              <span className="text-xs text-gray-500 px-2 py-1">
                +{material.key_concepts.length - 8} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <div className="flex flex-wrap gap-2">
          {onGenerateStudyGuide && (
            <Button
              onClick={onGenerateStudyGuide}
              size="sm"
              variant="ghost"
              className="text-xs hover:bg-green-50 hover:text-green-700"
            >
              📚 Study Guide
            </Button>
          )}
          {onCreateFlashcards && (
            <Button
              onClick={onCreateFlashcards}
              size="sm"
              variant="ghost"
              className="text-xs hover:bg-purple-50 hover:text-purple-700"
            >
              🃏 Flashcards
            </Button>
          )}
          {onAskQuestion && (
            <Button
              onClick={onAskQuestion}
              size="sm"
              variant="ghost"
              className="text-xs hover:bg-blue-50 hover:text-blue-700"
            >
              💬 Ask Question
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}