'use client';

import * as React from 'react';

interface VideoProgressProps {
  currentIndex: number;
  totalSlides: number;
  onSelect: (index: number) => void;
}

export function VideoProgress({ currentIndex, totalSlides, onSelect }: VideoProgressProps) {
  return (
    <div className="flex items-center gap-2 p-1.5 rounded-full bg-black/40 backdrop-blur-xl border border-white/15">
      {Array.from({ length: totalSlides }).map((_, idx) => {
        const isActive = idx === currentIndex;
        return (
          <button
            key={idx}
            onClick={() => onSelect(idx)}
            className={`transition-all duration-500 rounded-full ${
              isActive
                ? 'w-8 h-2 bg-[#09937F] shadow-lg shadow-[#09937F]/50'
                : 'w-2 h-2 bg-white/20 hover:bg-white/40'
            }`}
            aria-label={`Slide ${idx + 1}`}
          />
        );
      })}
    </div>
  );
}
