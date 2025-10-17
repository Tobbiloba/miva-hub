"use client";

import { useState, useMemo } from 'react';
import { Button } from 'ui/button';
import { ChevronDown, ChevronUp, FileText, Video, Music, Image } from 'lucide-react';
import { cn } from 'lib/utils';
import { PDFViewer } from '../media/PDFViewer';
import { VideoPlayer } from '../media/VideoPlayer';
import { AnimatePresence, motion } from 'framer-motion';

interface MediaItem {
  type: 'pdf' | 'video' | 'audio' | 'image';
  url: string;
  title?: string;
}

interface ExpandableMediaProps {
  content: string;
  className?: string;
}

// Extract media URLs from text content
function extractMediaUrls(text: string): MediaItem[] {
  const mediaItems: MediaItem[] = [];
  
  // URL patterns for different media types
  const patterns = {
    pdf: /https?:\/\/[^\s]+\.pdf(?:\?[^\s]*)?/gi,
    video: /https?:\/\/[^\s]+\.(?:mp4|avi|mov|webm|mkv)(?:\?[^\s]*)?/gi,
    audio: /https?:\/\/[^\s]+\.(?:mp3|wav|m4a|ogg)(?:\?[^\s]*)?/gi,
    image: /https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp|svg)(?:\?[^\s]*)?/gi,
  };
  
  Object.entries(patterns).forEach(([type, pattern]) => {
    const matches = text.match(pattern) || [];
    matches.forEach(url => {
      // Extract filename for title
      const filename = url.split('/').pop()?.split('?')[0] || url;
      mediaItems.push({
        type: type as MediaItem['type'],
        url,
        title: filename,
      });
    });
  });
  
  return mediaItems;
}

function getMediaIcon(type: MediaItem['type']) {
  switch (type) {
    case 'pdf':
      return <FileText className="w-4 h-4 text-red-500" />;
    case 'video':
      return <Video className="w-4 h-4 text-blue-500" />;
    case 'audio':
      return <Music className="w-4 h-4 text-green-500" />;
    case 'image':
      return <Image className="w-4 h-4 text-purple-500" />;
    default:
      return <FileText className="w-4 h-4 text-gray-500" />;
  }
}

function MediaViewer({ mediaItem }: { mediaItem: MediaItem }) {
  switch (mediaItem.type) {
    case 'pdf':
      return (
        <div className="w-full h-96 border rounded-lg overflow-hidden">
          <PDFViewer
            url={mediaItem.url}
            onClose={() => {}}
            showCloseButton={false}
          />
        </div>
      );
      
    case 'video':
      return (
        <div className="w-full max-w-2xl">
          <VideoPlayer src={mediaItem.url} />
        </div>
      );
      
    case 'audio':
      return (
        <div className="w-full">
          <audio
            controls
            className="w-full"
            src={mediaItem.url}
            aria-label={`Audio: ${mediaItem.title || 'Media content'}`}
          >
            Your browser does not support the audio element.
          </audio>
        </div>
      );
      
    case 'image':
      return (
        <div className="w-full max-w-2xl">
          <img
            src={mediaItem.url}
            alt={mediaItem.title || 'Media content'}
            className="w-full h-auto rounded-lg border"
            loading="lazy"
          />
        </div>
      );
      
    default:
      return (
        <div className="p-4 border rounded-lg bg-muted">
          <p className="text-sm text-muted-foreground">
            Media type not supported for inline viewing.
          </p>
          <a
            href={mediaItem.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline text-sm"
          >
            Open in new tab
          </a>
        </div>
      );
  }
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
    marginTop: "1rem",
    marginBottom: "0.5rem",
  },
};

export function ExpandableMedia({ content, className }: ExpandableMediaProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  
  const mediaItems = useMemo(() => extractMediaUrls(content), [content]);
  
  if (mediaItems.length === 0) {
    return null;
  }
  
  const toggleExpanded = (url: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(url)) {
      newExpanded.delete(url);
    } else {
      newExpanded.add(url);
    }
    setExpandedItems(newExpanded);
  };
  
  return (
    <div className={cn("space-y-3", className)}>
      {mediaItems.map((mediaItem, index) => {
        const isExpanded = expandedItems.has(mediaItem.url);
        
        return (
          <div key={`${mediaItem.url}-${index}`} className="border rounded-lg bg-card">
            <Button
              variant="ghost"
              onClick={() => toggleExpanded(mediaItem.url)}
              className="w-full p-4 justify-between hover:bg-muted/50"
            >
              <div className="flex items-center space-x-3">
                {getMediaIcon(mediaItem.type)}
                <div className="text-left">
                  <div className="font-medium text-sm">
                    {mediaItem.title || `${mediaItem.type.toUpperCase()} Content`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Click to {isExpanded ? 'collapse' : 'expand'} {mediaItem.type} viewer
                  </div>
                </div>
              </div>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </Button>
            
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  key="content"
                  initial="collapsed"
                  animate="expanded"
                  exit="collapsed"
                  variants={variants}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  style={{ overflow: "hidden" }}
                >
                  <div className="p-4 border-t">
                    <MediaViewer mediaItem={mediaItem} />
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