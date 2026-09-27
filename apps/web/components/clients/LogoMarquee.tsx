'use client';

import * as React from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { ClientLogo } from '@ishoot/database';

interface LogoMarqueeProps {
  logos: ClientLogo[];
}

export function LogoMarquee({ logos }: LogoMarqueeProps) {
  const { t } = useTranslation();

  // No fallback data — rely strictly on database records
  if (!logos || logos.length === 0) return null;

  // Duplicate logos to fill the marquee track seamlessly
  const displayLogos = [...logos, ...logos, ...logos, ...logos];

  return (
    <section className="relative py-16 bg-[#050807] overflow-hidden select-none border-y border-white/5">
      {/* Vignette Gradients for Edges */}
      <div className="absolute top-0 bottom-0 left-0 w-24 sm:w-44 bg-gradient-to-r from-[#050807] to-transparent z-10 pointer-events-none" />
      <div className="absolute top-0 bottom-0 right-0 w-24 sm:w-44 bg-gradient-to-l from-[#050807] to-transparent z-10 pointer-events-none" />

      {/* Marquee Header Tag */}
      <div className="shell mb-8 flex items-center justify-between text-xs font-mono text-[#9EADA9]">
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#09937F]" />
          <span>{t('clients.marqueeBadge')}</span>
        </span>
        <span className="text-[11px] text-white/40">BAHRAIN · GCC</span>
      </div>

      {/* Continuous Infinite Marquee Track */}
      <div className="relative flex w-full overflow-hidden marquee-paused">
        <div className="flex w-max shrink-0 animate-marquee" style={{ gap: '1.25rem', paddingRight: '1.25rem' }}>
          {displayLogos.map((client, idx) => (
            <div
              key={`${client.id}-${idx}`}
              className="flex items-center gap-3.5 px-6 py-4 rounded-2xl border border-white/10 bg-[#0B1210]/80 hover:bg-[#014842]/20 hover:border-[#09937F]/50 transition-all duration-300 group shrink-0 cursor-pointer shadow-lg"
            >
              <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center p-1.5 group-hover:border-[#09937F]/40 transition-colors">
                {client.logo_svg_url ? (
                  <img
                    src={client.logo_svg_url}
                    alt={client.client_name}
                    className="w-4 h-4 object-contain opacity-70 group-hover:opacity-100 transition-opacity"
                  />
                ) : (
                  <span className="text-[10px] font-mono text-white/50">{client.client_name.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <span className="font-sans text-xs sm:text-sm font-bold text-white/80 group-hover:text-white transition-colors tracking-wide">
                {client.client_name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
