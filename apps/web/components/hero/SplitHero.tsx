"use client";

import * as React from "react";
import type { HeroBanner } from "@platform/database/types";
import { ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";
import { useHeroContent, HeroActions } from "./HeroActions";
import { ContentImage } from "../shared/ContentImage";
import { cleanSentenceEnd, fallbackBannerMediaUrl } from "../../lib/format-site";

export function SplitHero({
  banners,
  title,
  subtitle,
}: {
  banners: HeroBanner[];
  title: string;
  subtitle: string;
}) {
  const { t, locale } = useTranslation();
  const [index, setIndex] = React.useState(0);
  const safeBanners = banners.length > 0 ? banners : [];
  const activeIdx = safeBanners.length > 0 ? index % safeBanners.length : 0;
  const banner = safeBanners[activeIdx];
  const hero = useHeroContent(banner, title, subtitle);
  const mediaSrc = banner?.media_url || fallbackBannerMediaUrl(activeIdx);

  return (
    <section
      id="home"
      className="min-h-[min(86vh,700px)] flex items-center bg-m3-surface text-m3-on-surface pt-28 pb-16 lg:pt-32 lg:pb-20"
    >
      <div className="shell grid lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] gap-10 lg:gap-12 items-center">
        <div className="space-y-6">
          <p className="inline-flex items-center gap-2 rounded-full bg-m3-secondary-container text-m3-on-secondary-container px-4 py-1.5 text-xs font-semibold tracking-wider uppercase">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{t("hero.eyebrow")}</span>
          </p>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold leading-[1.08] tracking-tight text-m3-on-surface">
            {cleanSentenceEnd(hero.heading)}
          </h1>

          {hero.subtitle && (
            <p className="max-w-xl text-base sm:text-lg leading-relaxed text-m3-on-surface-variant">
              {hero.subtitle}
            </p>
          )}

          <div className="pt-2">
            <HeroActions banner={banner} tone="dark" />
          </div>
        </div>

        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-[2rem] border border-m3-outline-variant bg-m3-surface-container aspect-[16/11] shadow-m3-3">
            {banner?.media_type === "video" && banner.media_url ? (
              <video
                src={banner.media_url}
                poster={banner.poster_url ?? fallbackBannerMediaUrl(activeIdx)}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <ContentImage
                src={mediaSrc}
                alt={hero.heading}
                width={960}
                height={660}
                className="w-full h-full object-cover"
                fetchPriority="high"
              />
            )}
            <div
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/80 via-black/35 to-transparent pointer-events-none"
            />
            <div className="absolute inset-x-0 bottom-0 p-5 flex items-center justify-between gap-4 text-white">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-white/75 font-semibold">
                  {t("hero.featuredLabel")}
                </p>
                <p className="text-sm font-semibold truncate">
                  {banner ? (locale === "ar" ? banner.title_ar : banner.title_en) || t("hero.trustedPartners") : t("hero.trustedPartners")}
                </p>
              </div>
              {safeBanners.length > 1 && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIndex((i) => (i - 1 + safeBanners.length) % safeBanners.length)}
                    aria-label={t("hero.prevSlide")}
                    className="w-11 h-11 rounded-full bg-black/45 border border-white/25 text-white hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIndex((i) => (i + 1) % safeBanners.length)}
                    aria-label={t("hero.nextSlide")}
                    className="w-11 h-11 rounded-full bg-black/45 border border-white/25 text-white hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
