'use client';

import * as React from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { SectionBadge } from '../shared/SectionBadge';
import { CinemaOverlay } from './CinemaOverlay';
import { Play } from 'lucide-react';

interface ShowreelRevealProps {
  videoUrl?: string;
  posterUrl?: string;
}

export function ShowreelReveal({
  videoUrl = 'https://assets.mixkit.co/videos/preview/mixkit-cinematographer-filming-a-scene-40893-large.mp4',
  posterUrl = 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1920&q=80',
}: ShowreelRevealProps) {
  const { t, isRTL } = useTranslation();
  const [cinemaOpen, setCinemaOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(0.88);
  const [borderRadius, setBorderRadius] = React.useState(32);

  React.useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      // Calculate progress as the section enters the viewport center
      const progress = Math.max(0, Math.min(1, (viewportHeight - rect.top) / (viewportHeight * 0.8)));

      const currentScale = 0.88 + progress * 0.12; // 0.88 -> 1.0
      const currentRadius = 32 - progress * 32;    // 32px -> 0px

      setScale(currentScale);
      setBorderRadius(currentRadius);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <section className="relative py-28 overflow-hidden bg-[#050807]">
        {/* Section Header */}
        <div className="max-w-7xl mx-auto px-6 sm:px-8 text-center space-y-4 mb-16">
          <SectionBadge>{t('showreel.badge')}</SectionBadge>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white font-display">
            {t('showreel.title')}
          </h2>
          <p className="text-base sm:text-lg text-[#9EADA9] max-w-2xl mx-auto leading-relaxed">
            {t('showreel.subtitle')}
          </p>
        </div>

        {/* Scroll-scaling Showreel Container */}
        <div ref={containerRef} className="w-full flex justify-center">
          <div
            onClick={() => setCinemaOpen(true)}
            className="group relative w-full max-w-[1400px] aspect-[21/9] min-h-[360px] overflow-hidden cursor-pointer shadow-2xl transition-all duration-300"
            style={{
              transform: `scale(${scale})`,
              borderRadius: `${borderRadius}px`,
              boxShadow: '0 25px 60px -15px rgba(1, 72, 66, 0.4)',
            }}
          >
            {/* Background Autoplaying Silent Reel */}
            <video
              src={videoUrl}
              poster={posterUrl}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            />

            {/* Gradient Overlays */}
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-500" />
            <div className="absolute inset-0 bg-radial-vignette opacity-50" />

            {/* Glowing Center Play Trigger */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative flex items-center justify-center">
                {/* Ambient pulse halo */}
                <div className="absolute w-24 h-24 rounded-full bg-[#09937F]/40 animate-ping opacity-75" />
                <div className="relative w-20 h-20 rounded-full bg-[#014842]/90 backdrop-blur-xl border border-[#09937F] flex items-center justify-center shadow-xl group-hover:scale-110 group-hover:bg-[#09937F] transition-all duration-300">
                  <Play className="w-8 h-8 text-white fill-white translate-x-0.5" />
                </div>
              </div>
            </div>

            {/* Bottom Caption Pill */}
            <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between text-xs text-white/90">
              <div className="px-4 py-2 rounded-full bg-black/50 backdrop-blur-md border border-white/10">
                {t('showreel.playShowreel')}
              </div>
              <div className="px-4 py-2 rounded-full bg-[#09937F]/20 text-[#09937F] border border-[#09937F]/40 font-mono">
                {t('showreel.watchIn4k')}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Fullscreen Video Lightbox */}
      <CinemaOverlay
        isOpen={cinemaOpen}
        onClose={() => setCinemaOpen(false)}
        videoUrl={videoUrl}
        title={t('showreel.title')}
      />
    </>
  );
}
