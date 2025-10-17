"use client";

import { useState, useMemo } from 'react';
import { Button } from 'ui/button';
import { ChevronDown, ChevronUp, Video } from 'lucide-react';
import { cn } from 'lib/utils';
import { VideoPlayer } from '../media/VideoPlayer';
import { AnimatePresence, motion } from 'framer-motion';

interface VideoItem {
  url: string;
  title?: string;
  fileExtension: string;
}

interface ExpandableVideoContentProps {
  content: string;
  className?: string;
}

// Extract video URLs from text content
function extractVideoUrls(text: string): VideoItem[] {
  const videoItems: VideoItem[] = [];
  
  // Video URL patterns for different formats
  const videoPattern = /https?:\/\/[^\s]+\.(?:mp4|avi|mov|webm|mkv)(?:\?[^\s]*)?/gi;
  
  const matches = text.match(videoPattern) || [];
  matches.forEach(url => {
    // Extract filename for title and file extension
    const filename = url.split('/').pop()?.split('?')[0] || url;
    const fileExtension = filename.split('.').pop()?.toLowerCase() || 'video';
    
    videoItems.push({
      url,
      title: filename,
      fileExtension,
    });
  });
  
  return videoItems;
}

function getVideoTitle(videoItem: VideoItem): string {
  if (videoItem.title && videoItem.title !== videoItem.url) {
    return videoItem.title;
  }
  return `${videoItem.fileExtension.toUpperCase()} Video`;
}

const variants = {
  collapsed: {
    height: 0,
    opacity: 0,
    marginTop: 0,
    marginBottom: 0,
  },
  expanded: {
    height: "auto",
    opacity: 1,
    marginTop: "0.5rem",
    marginBottom: "0.5rem",
  },
};

export function ExpandableVideoContent({ content, className }: ExpandableVideoContentProps) {
  const [expandedVideos, setExpandedVideos] = useState<Set<string>>(new Set());
  
  const videoItems = useMemo(() => extractVideoUrls(content), [content]);
  
  if (videoItems.length === 0) {
    return null;
  }
  
  const toggleExpanded = (url: string) => {
    const newExpanded = new Set(expandedVideos);
    if (newExpanded.has(url)) {
      newExpanded.delete(url);
    } else {
      newExpanded.add(url);
    }
    setExpandedVideos(newExpanded);
  };
  
  return (
    <div className={cn("space-y-2 mt-4", className)}>
      {videoItems.map((videoItem, index) => {
        const isExpanded = expandedVideos.has(videoItem.url);
        
        return (
          <div key={`${videoItem.url}-${index}`}>
            {/* Video Item - matching tool call styling exactly */}
            <div
              className={cn(
                "min-w-0 w-full p-4 rounded-lg bg-card border text-xs transition-colors cursor-pointer",
                isExpanded ? "bg-secondary" : "hover:bg-secondary"
              )}
              onClick={() => toggleExpanded(videoItem.url)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Video className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="font-medium text-sm text-foreground">
                    {getVideoTitle(videoItem)}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Click to {isExpanded ? 'collapse' : 'expand'} video player
              </div>
            </div>
            
            {/* Expanded Video Player */}
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  key="video-content"
                  initial="collapsed"
                  animate="expanded"
                  exit="collapsed"
                  variants={variants}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  style={{ overflow: "hidden" }}
                >
                  <div className="pl-4 border-l border-border">
                    <div className="p-4 rounded-lg bg-card border">
                      <VideoPlayer src={videoItem.url} />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}