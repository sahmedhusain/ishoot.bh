"use client";

import * as React from "react";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
}

export function VideoPlayer({
  src,
  poster,
  className = "",
  autoPlay = false,
  loop = false,
  muted = true,
}: VideoPlayerProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-black ${className}`}
    >
      <video
        src={src}
        poster={poster}
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        playsInline
        controls
        className="w-full h-full object-cover"
      />
    </div>
  );
}
