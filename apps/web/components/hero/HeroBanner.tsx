"use client";

import * as React from "react";
import { HeroBanner as HeroBannerType } from "@ishoot/database";
import { HeroSlide } from "./HeroSlide";
import { AudioToggle } from "./AudioToggle";
import { VideoProgress } from "./VideoProgress";
import { useTranslation } from "../../hooks/useTranslation";

interface HeroBannerProps {
  banners: HeroBannerType[];
}

export function HeroBanner({ banners }: HeroBannerProps) {
  const { t, locale, isRTL } = useTranslation();
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isMuted, setIsMuted] = React.useState(true);
  const [isPaused, setIsPaused] = React.useState(false);

  React.useEffect(() => {
    if (banners.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 8000);

    return () => clearInterval(timer);
  }, [banners.length, isPaused]);

  if (!banners || banners.length === 0) return null;

  return (
    <section
      id="home"
      data-hero="true"
      className="relative w-full h-[92vh] min-h-[640px] max-h-[1080px] overflow-hidden select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {banners.map((banner, idx) => (
        <HeroSlide
          key={banner.id}
          banner={banner}
          isActive={idx === currentIndex}
          isMuted={isMuted}
          locale={locale}
          isRTL={isRTL}
        />
      ))}

      <div className="absolute bottom-8 left-0 right-0 z-30 pointer-events-none">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 flex items-center justify-between">
          <div className="pointer-events-auto">
            <VideoProgress
              currentIndex={currentIndex}
              totalSlides={banners.length}
              onSelect={(index) => setCurrentIndex(index)}
            />
          </div>

          <div className="pointer-events-auto">
            <AudioToggle
              isMuted={isMuted}
              onToggle={() => setIsMuted((prev) => !prev)}
              labelOn={t("hero.audioOn")}
              labelOff={t("hero.audioOff")}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
