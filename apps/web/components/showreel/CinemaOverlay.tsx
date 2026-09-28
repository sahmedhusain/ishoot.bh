"use client";

import * as React from "react";
import { X, Play, Pause, Volume2, VolumeX, Maximize2 } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";

interface CinemaOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  title: string;
}

export function CinemaOverlay({
  isOpen,
  onClose,
  videoUrl,
  title,
}: CinemaOverlayProps) {
  const { t } = useTranslation();
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(true);
  const [isMuted, setIsMuted] = React.useState(false);
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    if (isOpen && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [isOpen]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isPlaying]);

  if (!isOpen) return null;

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && videoRef.current.duration) {
      setProgress(
        (videoRef.current.currentTime / videoRef.current.duration) * 100,
      );
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current && videoRef.current.duration) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const newTime = (clickX / rect.width) * videoRef.current.duration;
      videoRef.current.currentTime = newTime;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-2xl animate-fade-in">
      <div className="absolute top-6 left-6 right-6 z-20 flex items-center justify-between text-white">
        <div className="text-sm font-semibold tracking-wide text-[#9EADA9]">
          {title}
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          aria-label="Close Cinema Player"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="relative w-full max-w-6xl aspect-video mx-4 rounded-2xl overflow-hidden bg-black shadow-2xl border border-white/10">
        <video
          ref={videoRef}
          src={videoUrl}
          playsInline
          muted={isMuted}
          onTimeUpdate={handleTimeUpdate}
          onClick={togglePlay}
          className="w-full h-full object-contain cursor-pointer"
        />

        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col gap-3">
          <div
            onClick={handleSeek}
            className="w-full h-1.5 bg-white/20 hover:h-2.5 rounded-full cursor-pointer transition-all overflow-hidden"
          >
            <div
              className="h-full bg-[#09937F] rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-white text-sm">
            <div className="flex items-center gap-4">
              <button
                onClick={togglePlay}
                className="hover:text-[#09937F] transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.muted = !isMuted;
                    setIsMuted(!isMuted);
                  }
                }}
                className="hover:text-[#09937F] transition-colors"
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
            </div>
            <div className="text-xs text-[#9EADA9] font-mono">
              {t("showreel.streamTitle")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
