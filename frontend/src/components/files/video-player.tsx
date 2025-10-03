"use client";

import { useState } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VideoPlayerProps {
  src: string;
  title?: string;
  className?: string;
}

export function VideoPlayer({ src, title, className = "" }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePlay = () => {
    const video = document.getElementById(`video-${src}`) as HTMLVideoElement;
    if (video) {
      if (isPlaying) {
        video.pause();
      } else {
        video.play().catch((err) => {
          setError("Failed to play video. Please check your connection.");
          console.error("Video play error:", err);
        });
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleMute = () => {
    const video = document.getElementById(`video-${src}`) as HTMLVideoElement;
    if (video) {
      video.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleFullscreen = () => {
    const video = document.getElementById(`video-${src}`) as HTMLVideoElement;
    if (video) {
      if (video.requestFullscreen) {
        video.requestFullscreen();
      }
    }
  };

  if (error) {
    return (
      <div className={`border rounded-lg p-4 bg-muted/50 ${className}`}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Play className="h-4 w-4" />
          <span>{title || "Course Video"}</span>
        </div>
        <p className="text-sm text-destructive mt-2">{error}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => window.open(src, '_blank')}
        >
          Open in New Tab
        </Button>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg overflow-hidden bg-black ${className}`}>
      {title && (
        <div className="px-3 py-2 bg-muted/50 border-b">
          <p className="text-sm font-medium">{title}</p>
        </div>
      )}
      
      <div className="relative group">
        <video
          id={`video-${src}`}
          src={src}
          className="w-full h-auto max-h-96"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onError={() => setError("Video failed to load")}
          preload="metadata"
          controls={false}
        />
        
        {/* Custom Controls Overlay */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePlay}
              className="bg-black/50 hover:bg-black/70 text-white"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            
            <Button
              variant="secondary"
              size="sm"
              onClick={handleMute}
              className="bg-black/50 hover:bg-black/70 text-white"
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            
            <Button
              variant="secondary"
              size="sm"
              onClick={handleFullscreen}
              className="bg-black/50 hover:bg-black/70 text-white"
            >
              <Maximize className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}