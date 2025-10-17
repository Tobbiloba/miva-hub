"use client";

import { useState, useMemo } from 'react';
import { Video, Play, ChevronDown, ChevronUp } from 'lucide-react';
import { VideoPlayer } from './VideoPlayer';
import { 
  getVideoDisplayName, 
  formatVideoDate 
} from 'lib/video-utils';
import { AnimatePresence, motion } from 'framer-motion';

interface VideoMaterial {
  id: string;
  title: string;
  file_url: string;
  upload_date: string;
  material_type?: string;
}

interface VideoCardProps {
  material: VideoMaterial;
  className?: string;
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

export function VideoCard({ material, className }: VideoCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const videoUrl = material.file_url;
  
  const displayName = useMemo(() => {
    return getVideoDisplayName(material);
  }, [material]);
  
  const formattedDate = useMemo(() => {
    return formatVideoDate(material.upload_date);
  }, [material.upload_date]);
  
  return (
    <div className={className}>
      {/* Video Card Header */}
      <div
        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border cursor-pointer hover:bg-muted/70 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-background rounded-md">
            <Video className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <div className="font-medium text-sm">{displayName}</div>
            <div className="text-xs text-muted-foreground">
              Video • {formattedDate} • Click to {isExpanded ? 'collapse' : 'expand'}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {!isExpanded && (
            <div className="p-1.5 bg-primary/10 rounded-full">
              <Play className="w-3 h-3 text-primary" />
            </div>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
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
            <div className="mt-2 rounded-lg overflow-hidden border bg-background">
              <VideoPlayer 
                src={videoUrl} 
                title={displayName}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}