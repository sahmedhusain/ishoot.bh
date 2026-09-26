'use client';

import * as React from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { SectionBadge } from '../shared/SectionBadge';
import { ClientLogo } from '@ishoot/database';

interface LogoMarqueeProps {
  logos: ClientLogo[];
}

export function LogoMarquee({ logos }: LogoMarqueeProps) {
  const { t } = useTranslation();

  // Duplicate logos for seamless infinite looping
  const duplicatedLogos = [...logos, ...logos, ...logos];

  return (
    <section className="relative py-24 bg-[#050807] border-y border-white/5 overflow-hidden">
      {/* Background Vignette Gradients for Edges */}
      <div className="absolute top-0 bottom-0 left-0 w-32 bg-gradient-to-r from-[#050807] to-transparent z-10 pointer-events-none" />
      <div className="absolute top-0 bottom-0 right-0 w-32 bg-gradient-to-l from-[#050807] to-transparent z-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 sm:px-8 mb-12 text-center space-y-3">
        <SectionBadge>{t('clients.badge')}</SectionBadge>
        <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-display">
          {t('clients.title')}
        </h3>
      </div>

      {/* Infinite Animated Marquee Row */}
      <div className="flex w-full overflow-hidden select-none">
        <div className="flex items-center gap-12 sm:gap-20 animate-marquee hover:[animation-play-state:paused] whitespace-nowrap">
          {duplicatedLogos.map((client, idx) => (
            <div
              key={`${client.id}-${idx}`}
              className="flex items-center gap-3 grayscale opacity-40 hover:opacity-100 hover:grayscale-0 transition-all duration-300 cursor-pointer"
              title={client.client_name}
            >
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center p-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#09937F]" />
              </div>
              <span className="text-lg sm:text-xl font-bold tracking-wider text-[#F2F6F5]">
                {client.client_name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
