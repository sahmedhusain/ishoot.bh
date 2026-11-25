"use client";

import * as React from "react";
import { Pause, Play, ChevronLeft, ChevronRight, ShieldCheck, Globe2, Award } from "lucide-react";
import type { HeroBanner } from "@platform/database/types";
import { useTranslation } from "../../hooks/useTranslation";
import { useSiteReducedMotion, useSiteTheme } from "../site/SiteTheme";
import { cleanSentenceEnd, fallbackBannerMediaUrl } from "../../lib/format-site";
import { HeroActions, useHeroContent } from "./HeroActions";

function HeroMedia({ banner, slideIndex }: { banner?: HeroBanner; slideIndex: number }) {
  const { isArabic: ar } = useTranslation();
  const title = banner ? (ar ? banner.title_ar : banner.title_en) || banner.title_en || banner.title_ar : "";
  const mediaSrc = banner?.media_url || fallbackBannerMediaUrl(slideIndex);

  if (banner?.media_type === "video" && banner.media_url) {
    return (
      <video
        src={banner.media_url}
        poster={banner.poster_url ?? fallbackBannerMediaUrl(slideIndex)}
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />
    );
  }
  return (
    <img
      src={mediaSrc}
      alt={title}
      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 scale-[1.01]"
    />
  );
}

export function ShowcaseHero({
  banners,
  companyName,
}: {
  banners: HeroBanner[];
  companyName: { en: string; ar: string };
}) {
  const { t, locale } = useTranslation();
  const theme = useSiteTheme();
  const siteReduced = useSiteReducedMotion();
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  const safeBanners = banners.length > 0 ? banners : [];
  const activeIdx = safeBanners.length > 0 ? index % safeBanners.length : 0;
  const banner = safeBanners[activeIdx];

  const brand = locale === "ar" ? companyName.ar || companyName.en : companyName.en || companyName.ar;
  const { heading, subtitle } = useHeroContent(banner, brand, t("hero.fallbackSubtitle"));

  const moving = !paused && !siteReduced;
  const seconds = Math.max(4, Math.min(20, theme?.design.bannerIntervalSeconds ?? 7));

  React.useEffect(() => {
    if (!moving || safeBanners.length < 2) return;
    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % safeBanners.length),
      seconds * 1000,
    );
    return () => window.clearInterval(id);
  }, [moving, safeBanners.length, seconds]);

  React.useEffect(() => {
    if (!banner || banner.media_type !== "video") return;
    document.querySelectorAll<HTMLVideoElement>("#home video").forEach((video) => {
      if (paused) video.pause();
      else void video.play().catch(() => {});
    });
  }, [paused, banner]);

  const prevSlide = () => {
    if (safeBanners.length < 2) return;
    setIndex((i) => (i - 1 + safeBanners.length) % safeBanners.length);
  };
  const nextSlide = () => {
    if (safeBanners.length < 2) return;
    setIndex((i) => (i + 1) % safeBanners.length);
  };

  return (
    <section
      id="home"
      className="relative min-h-[min(92vh,760px)] pt-24 pb-14 lg:pt-28 lg:pb-16 flex flex-col justify-end overflow-hidden bg-m3-surface text-m3-on-surface"
    >
      <div className="shell relative z-10 flex-1 flex flex-col justify-end">
        <div className="on-media relative rounded-[var(--md-sys-shape-corner-extra-large,28px)] overflow-hidden border border-m3-outline-variant bg-m3-surface-container-highest shadow-m3-3 min-h-[min(78vh,640px)] flex flex-col justify-between">
          <HeroMedia banner={banner} slideIndex={activeIdx} />

          {/* Multi-stop scrim so white foreground meets WCAG AA over any photography */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/30 pointer-events-none"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent pointer-events-none rtl:bg-gradient-to-l"
          />

          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 px-6 pt-6 sm:px-10 sm:pt-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-black/45 backdrop-blur-md border border-white/25 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-white">
              <ShieldCheck aria-hidden="true" className="w-3.5 h-3.5 text-white" />
              <span>{cleanSentenceEnd(brand)}</span>
            </span>

            {safeBanners.length > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={prevSlide}
                  aria-label={t("hero.prevSlide")}
                  className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-md border border-white/25 text-white hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ChevronLeft aria-hidden="true" className="w-4 h-4 rtl:rotate-180" />
                </button>
                <button
                  type="button"
                  onClick={nextSlide}
                  aria-label={t("hero.nextSlide")}
                  className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-md border border-white/25 text-white hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ChevronRight aria-hidden="true" className="w-4 h-4 rtl:rotate-180" />
                </button>
                <button
                  type="button"
                  onClick={() => setPaused((p) => !p)}
                  aria-label={paused ? t("hero.resume") : t("hero.pause")}
                  aria-pressed={paused}
                  className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-md border border-white/25 text-white hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
                >
                  {paused ? <Play aria-hidden="true" className="w-4 h-4" /> : <Pause aria-hidden="true" className="w-4 h-4" />}
                </button>
              </div>
            )}
          </div>

          <div className="relative z-10 px-6 pb-8 pt-10 sm:px-10 sm:pb-10 grid lg:grid-cols-[minmax(0,1.45fr)_minmax(0,0.85fr)] gap-8 items-end">
            <div className="space-y-5 max-w-3xl">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/90">
                <Award aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                <span>{t("hero.featuredLabel")}</span>
              </p>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-display font-bold leading-[1.08] tracking-tight text-white whitespace-pre-line">
                {cleanSentenceEnd(heading)}
              </h1>

              {subtitle && (
                <p className="max-w-2xl text-base sm:text-lg leading-relaxed text-white/90">
                  {subtitle}
                </p>
              )}

              <div className="pt-2">
                <HeroActions banner={banner} />
              </div>
            </div>

            <div className="flex flex-col gap-4 lg:items-end justify-end">
              <div className="w-full max-w-sm rounded-[var(--md-sys-shape-corner-large,16px)] bg-black/55 backdrop-blur-xl border border-white/20 p-5 space-y-3 text-white">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/90">
                  <Globe2 aria-hidden="true" className="w-4 h-4" />
                  <span>{t("hero.trustedPartners")}</span>
                </div>
                <p className="text-sm text-white/90 leading-relaxed">
                  {t("hero.caption")}
                </p>
                {safeBanners.length > 1 && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/15">
                    {safeBanners.map((item, i) => {
                      const active = i === activeIdx;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setIndex(i)}
                          aria-label={`${t("hero.slideLabel")} ${i + 1}`}
                          aria-pressed={active}
                          className={`min-h-11 min-w-11 px-3 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
                            active
                              ? "bg-m3-primary text-m3-on-primary border-m3-primary shadow-m3-1"
                              : "bg-black/35 border-white/25 text-white hover:bg-white/15"
                          }`}
                        >
                          {i + 1}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
