'use client';

import * as React from 'react';
import { useTranslation } from '../../hooks/useTranslation';

interface CinematicPreloaderProps {
  isRTL?: boolean;
}

export function CinematicPreloader({ isRTL = false }: CinematicPreloaderProps) {
  const { t } = useTranslation();
  const [progress, setProgress] = React.useState(0);
  const [isFinished, setIsFinished] = React.useState(false);
  const [shouldRender, setShouldRender] = React.useState(true);

  React.useEffect(() => {
    // Only show once per session to maintain high UX speed
    const visited = sessionStorage.getItem('ishoot_entered_session');
    if (visited) {
      setShouldRender(false);
      return;
    }

    const startTime = Date.now();
    const duration = 1600; // 1.6s quick elegant intro

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const nextProgress = Math.min(100, Math.floor((elapsed / duration) * 100));
      setProgress(nextProgress);

      if (nextProgress >= 100) {
        clearInterval(timer);
        setTimeout(() => {
          setIsFinished(true);
          sessionStorage.setItem('ishoot_entered_session', 'true');
          setTimeout(() => setShouldRender(false), 700);
        }, 200);
      }
    }, 20);

    return () => clearInterval(timer);
  }, []);

  if (!shouldRender) return null;

  return (
    <div
      onClick={() => {
        setIsFinished(true);
        sessionStorage.setItem('ishoot_entered_session', 'true');
        setTimeout(() => setShouldRender(false), 300);
      }}
      className={`fixed inset-0 z-[100] overflow-hidden bg-[#050807] text-[#F2F6F5] select-none cursor-pointer transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isFinished ? 'opacity-0 -translate-y-6 pointer-events-none' : 'opacity-100 translate-y-0'
      }`}
    >
      {/* Radial Atmospheric Ambient Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[70vmax] w-[70vmax] -translate-x-1/2 -translate-y-1/2 opacity-70"
        style={{
          background:
            'radial-gradient(circle, rgba(9,147,127,0.18) 0%, rgba(1,72,66,0.08) 35%, transparent 68%)',
        }}
      />

      {/* Top Bar Status Monospace Counter */}
      <div className="absolute inset-x-0 top-8 px-[clamp(1.25rem,4vw,2.5rem)] flex items-center justify-between font-mono text-xs uppercase tracking-[0.2em] text-[#9EADA9]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#09937F] animate-pulse" />
          <span>{t('preloader.initializing')}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#9EADA9]/60">{t('preloader.load')}</span>
          <span className="text-white font-bold tabular-nums text-sm">
            {String(progress).padStart(2, '0')}%
          </span>
        </div>
      </div>

      {/* Centered Brand Presentation */}
      <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
        {/* Shimmering Aperture Brand Emblem */}
        <div className="relative mb-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#0B1210] border border-[#09937F]/40 p-3.5 flex items-center justify-center shadow-2xl shadow-[#09937F]/20 group">
            <img
              src="/icon.svg"
              alt="ishoot"
              className="w-full h-full object-contain filter drop-shadow-[0_0_12px_rgba(9,147,127,0.4)]"
            />
          </div>
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#014842] via-[#09937F] to-[#014842] opacity-30 blur-md -z-10 animate-pulse" />
        </div>

        {/* Wordmark */}
        <img
          src="/images/logo-color.svg"
          alt="ishoot"
          className="h-8 sm:h-10 w-auto object-contain brightness-110 mb-8"
        />

        {/* Progress Hairline */}
        <div className="h-0.5 w-[clamp(180px,26vw,320px)] overflow-hidden bg-white/10 rounded-full">
          <div
            className="h-full bg-gradient-to-r from-[#014842] via-[#09937F] to-[#5EEAD4] transition-all duration-75 ease-out rounded-full shadow-[0_0_10px_#09937F]"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Cinematic Slogan */}
        <p className="mt-8 font-mono text-[11px] sm:text-xs uppercase tracking-[0.28em] text-[#9EADA9] font-medium">
          {t('preloader.slogan')}
        </p>

        {/* Skip hint */}
        <span className="mt-4 text-[10px] text-white/30 font-mono tracking-widest uppercase">
          {t('preloader.skipHint')}
        </span>
      </div>
    </div>
  );
}
