"use client";

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { cn } from 'lib/utils';
import { VideoCard } from '../media/VideoCard';
import { PDFCard } from '../media/PDFCard';
import { isVideoMaterial, isPDFMaterial } from 'lib/video-utils';

interface MaterialsMessagePartProps {
  materials: any[];
  toolCallId?: string;
}

export function MaterialsMessagePart({ materials, toolCallId }: MaterialsMessagePartProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  console.log('📚 MaterialsMessagePart rendering:', {
    materialCount: materials.length,
    toolCallId,
    isExpanded
  });
  
  // Separate materials by type
  const { videos, pdfs } = useMemo(() => {
    const vids = materials.filter(isVideoMaterial);
    const docs = materials.filter(isPDFMaterial);
    
    console.log('  - Videos:', vids.length);
    console.log('  - PDFs:', docs.length);
    
    return { videos: vids, pdfs: docs };
  }, [materials]);
  
  if (materials.length === 0) {
    return null;
  }
  
  return (
    <div className="w-full mx-auto max-w-5xl px-6">
      <div
        className={cn(
          "min-w-0 w-full p-4 rounded-lg bg-card px-4 border text-xs transition-colors fade-300",
          !isExpanded && "hover:bg-secondary cursor-pointer",
        )}
        onClick={() => !isExpanded && setIsExpanded(true)}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="size-4 text-muted-foreground" />
            <span className="font-medium">
              📚 Course Materials ({materials.length} item{materials.length > 1 ? 's' : ''})
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-1 hover:bg-secondary rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </button>
        </div>
        
        {/* Summary when collapsed */}
        {!isExpanded && (
          <div className="mt-2 text-muted-foreground">
            {pdfs.length > 0 && `${pdfs.length} PDF${pdfs.length > 1 ? 's' : ''}`}
            {pdfs.length > 0 && videos.length > 0 && ' • '}
            {videos.length > 0 && `${videos.length} Video${videos.length > 1 ? 's' : ''}`}
            {' • Click to view'}
          </div>
        )}
        
        {/* Expanded Content */}
        {isExpanded && (
          <div className="mt-4 space-y-4">
            {/* PDF Materials */}
            {pdfs.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-xs font-medium text-muted-foreground">
                  📄 Reading Materials ({pdfs.length})
                </h5>
                {pdfs.map((material, index) => {
                  console.log('📄 Rendering PDFCard #' + index + ':', material);
                  return (
                    <PDFCard 
                      key={material.id || `pdf-${index}`} 
                      material={material}
                    />
                  );
                })}
              </div>
            )}
            
            {/* Video Materials */}
            {videos.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-xs font-medium text-muted-foreground">
                  🎥 Video Content ({videos.length})
                </h5>
                {videos.map((material, index) => {
                  console.log('📹 Rendering VideoCard #' + index + ':', material);
                  return (
                    <VideoCard 
                      key={material.id || `video-${index}`} 
                      material={material}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}