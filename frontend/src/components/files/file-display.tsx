"use client";

import { VideoPlayer } from "./video-player";
import { PDFViewer } from "./pdf-viewer";
import { AudioPlayer } from "./audio-player";
import { FileIcon, ExternalLink, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileDisplayProps {
  publicUrl: string;
  title?: string;
  materialType?: string;
  mimeType?: string;
  fileName?: string;
  className?: string;
}

export function FileDisplay({ 
  publicUrl, 
  title, 
  materialType, 
  mimeType, 
  fileName, 
  className = "" 
}: FileDisplayProps) {
  
  // Determine file type from mimeType or fileName
  const getFileType = (): 'video' | 'pdf' | 'audio' | 'other' => {
    if (mimeType) {
      if (mimeType.startsWith('video/')) return 'video';
      if (mimeType === 'application/pdf') return 'pdf';
      if (mimeType.startsWith('audio/')) return 'audio';
    }
    
    // Fallback to file extension
    if (fileName) {
      const ext = fileName.toLowerCase().split('.').pop();
      if (['mp4', 'mov', 'avi', 'webm'].includes(ext || '')) return 'video';
      if (ext === 'pdf') return 'pdf';
      if (['mp3', 'wav', 'm4a', 'ogg'].includes(ext || '')) return 'audio';
    }
    
    return 'other';
  };

  const fileType = getFileType();
  const displayTitle = title || fileName || 'Course Material';

  // For unsupported file types, show a simple link
  if (fileType === 'other') {
    return (
      <div className={`border rounded-lg p-4 bg-muted/50 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{displayTitle}</span>
            {materialType && (
              <span className="text-xs text-muted-foreground">({materialType})</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(publicUrl, '_blank')}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Open
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const link = document.createElement('a');
                link.href = publicUrl;
                link.download = fileName || 'download';
                link.click();
              }}
            >
              <Download className="h-3 w-3 mr-1" />
              Download
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Render appropriate component based on file type
  switch (fileType) {
    case 'video':
      return <VideoPlayer src={publicUrl} title={displayTitle} className={className} />;
    case 'pdf':
      return <PDFViewer src={publicUrl} title={displayTitle} className={className} />;
    case 'audio':
      return <AudioPlayer src={publicUrl} title={displayTitle} className={className} />;
    default:
      return null;
  }
}