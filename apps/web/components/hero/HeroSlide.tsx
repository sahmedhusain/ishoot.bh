'use client';

import * as React from 'react';
import Link from 'next/link';
import { HeroBanner } from '@ishoot/database';
import { Button } from '@ishoot/ui';
import { SectionBadge } from '../shared/SectionBadge';
import { ArrowRight, ArrowLeft } from 'lucide-react';

interface HeroSlideProps {
  banner: HeroBanner;
  isActive: boolean;
  isMuted: boolean;
  locale: string;
  isRTL: boolean;
}

export function HeroSlide({ banner, isActive, isMuted, locale, isRTL }: HeroSlideProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isActive]);

  React.useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const title = isRTL ? banner.title_ar : banner.title_en;
  const subtitle = isRTL ? banner.subtitle_ar : banner.subtitle_en;
  const ctaLabel = isRTL ? (banner.cta_label_ar || 'استكشف الأعمال') : (banner.cta_label_en || 'Explore Works');
  const ctaLink = banner.cta_link || `/${locale}/works`;

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <div
      className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${
        isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
      }`}
    >
      {/* Background Media */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        {banner.media_type === 'video' ? (
          <video
            ref={videoRef}
            src={banner.media_url}
            poster={banner.poster_url}
            loop
            playsInline
            muted={isMuted}
            className="w-full h-full object-cover object-center scale-105 transition-transform duration-[10000ms] ease-out transform"
            style={{ transform: isActive ? 'scale(1)' : 'scale(1.08)' }}
          />
        ) : (
          <div
            className="w-full h-full bg-cover bg-center transition-transform duration-[10000ms] ease-out"
            style={{
              backgroundImage: `url(${banner.media_url})`,
              transform: isActive ? 'scale(1)' : 'scale(1.08)',
            }}
          />
        )}

        {/* Cinematic Vignette & Color Grading Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050807] via-[#050807]/50 to-[#050807]/30" />
        <div className="absolute inset-0 bg-radial-vignette opacity-70" />
      </div>

      {/* Hero Content */}
      <div className="relative z-20 h-full max-w-7xl mx-auto px-6 sm:px-8 flex flex-col justify-end pb-24 md:pb-28">
        <div className="max-w-3xl space-y-6">
          <SectionBadge>
            {isRTL ? 'دار الإنتاج السينمائي' : 'Cinema Production House'}
          </SectionBadge>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white leading-[1.08] font-display">
            {title}
          </h1>

          {subtitle && (
            <p className="text-base sm:text-lg md:text-xl text-[#9EADA9] max-w-2xl leading-relaxed">
              {subtitle}
            </p>
          )}

          <div className="pt-2 flex flex-wrap items-center gap-4">
            <Link href={ctaLink}>
              <Button variant="primary" size="lg" className="group">
                <span>{ctaLabel}</span>
                <ArrowIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>

            <Link href={`/${locale}/contact`}>
              <Button variant="secondary" size="lg">
                {isRTL ? 'ابدأ مشروعك' : 'Start a Project'}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
