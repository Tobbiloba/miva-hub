"use client";

import { useRef, useState, useEffect } from 'react';
import { Button } from 'ui/button';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  SkipBack, 
  SkipForward,
  Settings,
  Download
} from 'lucide-react';

interface VideoPlayerProps {
  url?: string;
  src?: string;
  title?: string;
}

export function VideoPlayer({ url, src, title }: VideoPlayerProps) {
  const videoUrl = url || src;
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState<string>('');
  const [isLoadingUrl, setIsLoadingUrl] = useState(true);

  useEffect(() => {
    const fetchSignedUrl = async () => {
      if (!videoUrl) return;
      
      if (videoUrl.startsWith('s3://')) {
        try {
          setIsLoadingUrl(true);
          const response = await fetch(`/api/files/signed-url?url=${encodeURIComponent(videoUrl)}`);
          const data = await response.json();
          
          if (data.signedUrl) {
            setResolvedUrl(data.signedUrl);
          } else {
            console.error('Failed to get signed URL:', data.error);
            setResolvedUrl(videoUrl);
          }
        } catch (error) {
          console.error('Error fetching signed URL:', error);
          setResolvedUrl(videoUrl);
        } finally {
          setIsLoadingUrl(false);
        }
      } else {
        setResolvedUrl(videoUrl);
        setIsLoadingUrl(false);
      }
    };
    
    fetchSignedUrl();
  }, [videoUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => setDuration(video.duration);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  // Auto-hide controls
  useEffect(() => {
    if (!isPlaying) return;

    const timer = setTimeout(() => {
      setShowControls(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [isPlaying, showControls]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !progressRef.current) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;
    
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setIsMuted(newVolume === 0);
    }
  };

  const changePlaybackSpeed = (speed: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      setPlaybackSpeed(speed);
    }
  };

  const skip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(duration, currentTime + seconds));
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      videoRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div 
      className="relative bg-black group"
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={resolvedUrl}
        className="w-full h-full object-contain cursor-pointer"
        onClick={togglePlay}
        onLoadStart={() => console.log('Loading started')}
        onError={(e) => console.error('Video error:', e)}
      />
      
      {/* Play/Pause Overlay */}
      {!isPlaying && (
        <div 
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={togglePlay}
        >
          <div className="bg-black bg-opacity-50 rounded-full p-4 hover:bg-opacity-70 transition-all">
            <Play className="w-12 h-12 text-white ml-1" />
          </div>
        </div>
      )}

      {/* Controls */}
      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4 transition-opacity duration-300 ${showControls && duration > 0 ? 'opacity-100' : 'opacity-0'}`}>
        {/* Progress Bar */}
        <div 
          ref={progressRef}
          className="w-full h-2 bg-gray-600 rounded-full cursor-pointer mb-3 group/progress"
          onClick={handleSeek}
        >
          <div 
            className="h-full bg-blue-500 rounded-full relative transition-all group-hover/progress:h-3"
            style={{ width: `${progressPercentage}%` }}
          >
            <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-blue-500 rounded-full opacity-0 group-hover/progress:opacity-100" />
          </div>
        </div>
        
        {/* Control Buttons */}
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center space-x-3">
            {/* Play/Pause */}
            <Button 
              onClick={togglePlay}
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white hover:bg-opacity-20 p-2"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>
            
            {/* Skip buttons */}
            <Button 
              onClick={() => skip(-10)}
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white hover:bg-opacity-20 p-2"
            >
              <SkipBack className="w-4 h-4" />
            </Button>
            
            <Button 
              onClick={() => skip(10)}
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white hover:bg-opacity-20 p-2"
            >
              <SkipForward className="w-4 h-4" />
            </Button>
            
            {/* Volume */}
            <div className="flex items-center space-x-2">
              <Button 
                onClick={toggleMute}
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white hover:bg-opacity-20 p-2"
              >
                {isMuted || volume === 0 ? 
                  <VolumeX className="w-4 h-4" /> : 
                  <Volume2 className="w-4 h-4" />
                }
              </Button>
              
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-20 accent-blue-500"
              />
            </div>
            
            {/* Time Display */}
            <span className="text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Playback Speed */}
            <select
              value={playbackSpeed}
              onChange={(e) => changePlaybackSpeed(parseFloat(e.target.value))}
              className="bg-transparent text-white text-sm border border-gray-500 rounded px-2 py-1"
            >
              <option value={0.5} className="text-black">0.5x</option>
              <option value={0.75} className="text-black">0.75x</option>
              <option value={1} className="text-black">1x</option>
              <option value={1.25} className="text-black">1.25x</option>
              <option value={1.5} className="text-black">1.5x</option>
              <option value={2} className="text-black">2x</option>
            </select>
            
            {/* Download */}
            <Button 
              onClick={() => window.open(resolvedUrl, '_blank')}
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white hover:bg-opacity-20 p-2"
            >
              <Download className="w-4 h-4" />
            </Button>
            
            {/* Fullscreen */}
            <Button 
              onClick={toggleFullscreen}
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white hover:bg-opacity-20 p-2"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Title Overlay */}
      {title && showControls && (
        <div className="absolute top-4 left-4 right-4">
          <h3 className="text-white text-lg font-semibold bg-black bg-opacity-50 px-3 py-2 rounded">
            {title}
          </h3>
        </div>
      )}

      {/* Loading indicator */}
      {(isLoadingUrl || duration === 0) && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black bg-opacity-75 text-white px-4 py-2 rounded">
            Loading video...
          </div>
        </div>
      )}
    </div>
  );
}