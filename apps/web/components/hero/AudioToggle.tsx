'use client';

import * as React from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface AudioToggleProps {
  isMuted: boolean;
  onToggle: () => void;
  labelOn?: string;
  labelOff?: string;
}

export function AudioToggle({ isMuted, onToggle, labelOn = 'Sound On', labelOff = 'Sound Off' }: AudioToggleProps) {
  return (
    <button
      onClick={onToggle}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-xl border border-white/15 text-xs font-medium text-white transition-all duration-300 hover:border-[#09937F]/50 group"
      aria-label={isMuted ? labelOn : labelOff}
    >
      {isMuted ? (
        <VolumeX className="w-4 h-4 text-[#9EADA9] group-hover:text-[#09937F] transition-colors" />
      ) : (
        <Volume2 className="w-4 h-4 text-[#09937F] animate-pulse" />
      )}
      <span className="text-[#F2F6F5]">{isMuted ? labelOff : labelOn}</span>
    </button>
  );
}
