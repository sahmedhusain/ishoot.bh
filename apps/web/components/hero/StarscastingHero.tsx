'use client';

import * as React from 'react';
import Link from 'next/link';
import { HeroBanner as HeroBannerType } from '@ishoot/database';
import { useTranslation } from '../../hooks/useTranslation';
import { Sparkles, Video, Camera, ArrowRight, ArrowLeft } from 'lucide-react';

interface StarscastingHeroProps {
  banners: HeroBannerType[];
}

export function StarscastingHero({ banners }: StarscastingHeroProps) {
  const { t, locale, isRTL } = useTranslation();
  const [currentIdx, setCurrentIdx] = React.useState(0);
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  // No fallback data — if no banners exist, render nothing.
  const activeBanner = banners[currentIdx];

  // Auto rotate banners every 8 seconds
  React.useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % banners.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [banners.length]);

  if (!activeBanner) return null;

  return (
    <section id="home" data-hero="true" className="relative isolate z-[1] flex min-h-[100svh] flex-col overflow-x-clip bg-hero text-[#F2F6F5] select-none">
      {/* Background Media with Deep Cinematic Overlays */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {activeBanner.media_type === 'video' ? (
          <video
            src={activeBanner.media_url}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover object-center scale-105 transition-transform duration-[8000ms] ease-out opacity-40"
          />
        ) : (
          <div
            className="w-full h-full bg-cover bg-center transition-all duration-[6000ms] ease-out opacity-35"
            style={{ backgroundImage: `url('${activeBanner.media_url}')` }}
          />
        )}

        {/* Starscasting-style Atmospheric Dual Radial Gradients */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background:
              'radial-gradient(120% 78% at 50% 6%, rgba(1,72,66,0.50), transparent 55%), radial-gradient(90% 60% at 50% 118%, rgba(5,8,7,0.95), transparent)',
          }}
        />

        {/* Ambient Dark Scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050807] via-[#050807]/60 to-transparent" />
      </div>

      {/* Main Kinetic Typography Hero */}
      <div className="shell relative z-20 flex-1 flex flex-col justify-center pt-28 sm:pt-32 pb-12 md:pb-16">
        <div className="max-w-4xl space-y-6">
          <h1 className="font-grotesk text-[clamp(2.2rem,6.8vw,5.5rem)] leading-[1.02] tracking-[-0.03em] font-bold text-white">
            <span className="block">
              {isRTL ? activeBanner.title_ar : activeBanner.title_en}
            </span>
            {(isRTL ? activeBanner.subtitle_ar : activeBanner.subtitle_en) && (
              <span className="block text-[#09937F]">
                {isRTL ? activeBanner.subtitle_ar : activeBanner.subtitle_en}
              </span>
            )}
          </h1>

          {/* CTA Buttons */}
          <div className="pt-4 flex flex-wrap items-center gap-4">
            <Link
              href={`/${locale}/contact`}
              className="group inline-flex items-center gap-3 rounded-full border border-white/20 bg-white text-black py-2.5 ps-2.5 pe-7 font-sans text-sm font-bold transition-all duration-300 hover:bg-[#09937F] hover:text-white hover:border-[#09937F] shadow-2xl hover:shadow-[#09937F]/30 h-11"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-black text-white transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:bg-white group-hover:text-[#014842] group-hover:rotate-45">
                <ArrowIcon className="w-4 h-4 transition-transform duration-300" />
              </span>
              <span>{activeBanner.cta_label_en && !isRTL ? activeBanner.cta_label_en : activeBanner.cta_label_ar ?? t('hero.startProject')}</span>
            </Link>

            <Link
              href={`/${locale}/works`}
              className="group inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/[0.04] py-2.5 ps-3 pe-6 font-sans text-sm font-semibold text-white transition-all duration-300 hover:bg-white/10 hover:border-white/30 backdrop-blur-md h-11"
            >
              <Video className="w-4 h-4 text-[#09937F] group-hover:scale-110 transition-transform" />
              <span>{t('hero.exploreWorks')}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Slide Navigation Dots and Metrics */}
      <div className="shell relative z-20 pb-8 flex items-center justify-between text-xs text-[#9EADA9] font-mono">
        <div className="flex items-center gap-2">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIdx(i)}
              className={`h-1.5 transition-all duration-500 rounded-full ${i === currentIdx ? 'w-8 bg-[#09937F]' : 'w-2 bg-white/20 hover:bg-white/40'
                }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>

        <div className="hidden sm:flex items-center gap-6 text-[11px] uppercase tracking-widest">
          <span className="flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-[#09937F]" />
            <span>RED V-Raptor 8K</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#09937F]" />
            <span>ARRI Master Primes</span>
          </span>
        </div>
      </div>
    </section>
  );
}
