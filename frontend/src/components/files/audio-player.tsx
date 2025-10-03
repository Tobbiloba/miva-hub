"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Music } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AudioPlayerProps {
  src: string;
  title?: string;
  className?: string;
}

export function AudioPlayer({ src, title, className = "" }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState([1]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnd = () => setIsPlaying(false);
    const handleError = () => setError("Failed to load audio file");

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnd);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnd);
      audio.removeEventListener('error', handleError);
    };
  }, []);

  const handlePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch((err) => {
        setError("Failed to play audio. Please check your connection.");
        console.error("Audio play error:", err);
      });
    }
    setIsPlaying(!isPlaying);
  };

  const handleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newVolume = parseFloat(e.target.value);
    audio.volume = newVolume;
    setVolume([newVolume]);
    
    // Auto-unmute if volume is increased from 0
    if (newVolume > 0 && isMuted) {
      audio.muted = false;
      setIsMuted(false);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div className={`border rounded-lg p-4 bg-muted/50 ${className}`}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Music className="h-4 w-4" />
          <span>{title || "Course Audio"}</span>
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
    <div className={`border rounded-lg p-4 bg-muted/20 ${className}`}>
      <audio ref={audioRef} src={src} preload="metadata" />
      
      {title && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <Music className="h-4 w-4" />
          <span className="font-medium">{title}</span>
        </div>
      )}

      {/* Progress Bar */}
      <div className="mb-3">
        <input
          type="range"
          value={currentTime}
          onChange={handleSeek}
          max={duration || 100}
          step={1}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          disabled={!duration}
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePlay}
            disabled={!duration}
          >
            {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMute}
            disabled={!duration}
          >
            {isMuted || volume[0] === 0 ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
          </Button>
        </div>

        {/* Volume Control */}
        <div className="flex items-center gap-2 w-24">
          <input
            type="range"
            value={volume[0]}
            onChange={handleVolumeChange}
            max={1}
            step={0.1}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            disabled={!duration}
          />
        </div>
      </div>
    </div>
  );
}