'use client';

import * as React from 'react';
import { useLocale } from '../../hooks/useLocale';
import { ClientLogo } from '@ishoot/database';

interface LogoMarqueeProps {
  logos: ClientLogo[];
}

export function LogoMarquee({ logos }: LogoMarqueeProps) {
  const { locale, isRTL } = useLocale();

  // If logos list is short, duplicate to fill the marquee track seamlessly
  const displayLogos =
    logos.length > 0
      ? [...logos, ...logos, ...logos, ...logos]
      : [
          { id: '1', client_name: 'National Bank of Bahrain', logo_url: '' },
          { id: '2', client_name: 'Bapco Energies', logo_url: '' },
          { id: '3', client_name: 'Batelco Beyon', logo_url: '' },
          { id: '4', client_name: 'Gulf Air', logo_url: '' },
          { id: '5', client_name: 'Bahrain Tourism Authority', logo_url: '' },
          { id: '6', client_name: 'Seef Properties', logo_url: '' },
          { id: '7', client_name: 'Toyota Ebrahim K. Kanoo', logo_url: '' },
          { id: '8', client_name: 'Bahrain International Airshow', logo_url: '' },
        ];

  return (
    <section className="relative py-16 bg-[#050807] overflow-hidden select-none border-y border-white/5">
      {/* Vignette Gradients for Edges */}
      <div className="absolute top-0 bottom-0 left-0 w-24 sm:w-44 bg-gradient-to-r from-[#050807] to-transparent z-10 pointer-events-none" />
      <div className="absolute top-0 bottom-0 right-0 w-24 sm:w-44 bg-gradient-to-l from-[#050807] to-transparent z-10 pointer-events-none" />

      {/* Marquee Header Tag */}
      <div className="shell mb-8 flex items-center justify-between text-xs font-mono text-[#9EADA9]">
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#09937F]" />
          <span>{isRTL ? 'شركاء الإبداع والعلامات التجارية' : 'TRUSTED BY VISIONARY BRANDS'}</span>
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
                <img
                  src="/icon.svg"
                  alt="ishoot client"
                  className="w-4 h-4 object-contain opacity-70 group-hover:opacity-100 transition-opacity"
                />
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
