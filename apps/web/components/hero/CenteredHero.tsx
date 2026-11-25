"use client";

import * as React from "react";
import type { HeroBanner } from "@platform/database/types";
import { ChevronLeft, ChevronRight, ShieldCheck, Building2 } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";
import { useHeroContent, HeroActions } from "./HeroActions";
import { cleanSentenceEnd, fallbackBannerMediaUrl } from "../../lib/format-site";

export function CenteredHero({
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
      className="on-media relative pt-24 pb-14 lg:pt-28 lg:pb-16 bg-brand-base"
    >
      <div className="shell">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-surface-900 shadow-2xl min-h-[min(74vh,620px)] flex flex-col justify-center items-center text-center px-6 py-14 sm:px-12 sm:py-20">
          {banner?.media_type === "video" && banner.media_url ? (
            <video
              src={banner.media_url}
              poster={banner.poster_url ?? fallbackBannerMediaUrl(activeIdx)}
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover opacity-50"
            />
          ) : (
            <img
              src={mediaSrc}
              alt={hero.heading}
              className="absolute inset-0 w-full h-full object-cover opacity-45"
            />
          )}

          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/85 pointer-events-none"
          />

          <div className="relative z-10 max-w-3xl space-y-6 flex flex-col items-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/12 backdrop-blur-md border border-white/20 px-4 py-1.5 text-xs font-semibold tracking-[0.14em] uppercase text-white">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-mint" />
              <span>{t("hero.eyebrow")}</span>
            </span>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-display font-bold leading-[1.06] tracking-tight text-white">
              {cleanSentenceEnd(hero.heading)}
            </h1>

            {hero.subtitle && (
              <p className="max-w-2xl text-base sm:text-lg leading-relaxed text-white/85">
                {hero.subtitle}
              </p>
            )}

            <div className="pt-2 flex flex-wrap justify-center gap-4">
              <HeroActions banner={banner} />
            </div>

            {safeBanners.length > 1 && (
              <div className="pt-4 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setIndex((i) => (i - 1 + safeBanners.length) % safeBanners.length)}
                  aria-label={t("hero.prevSlide")}
                  className="w-11 h-11 rounded-full bg-black/45 border border-white/25 text-white hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
                </button>
                {safeBanners.map((b, i) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-label={`${t("hero.slideLabel")} ${i + 1}`}
                    aria-pressed={i === activeIdx}
                    className={`min-h-11 min-w-11 px-3 rounded-full border text-xs font-semibold transition-colors cursor-pointer ${
                      i === activeIdx
                        ? "bg-white text-tone-15 border-white"
                        : "bg-black/35 border-white/25 text-white hover:bg-white/15"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
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

            {banner && (
              <p className="inline-flex items-center gap-2 text-xs text-white/75 pt-2">
                <Building2 className="w-3.5 h-3.5 text-brand-mint" />
                <span>{locale === "ar" ? banner.title_ar || banner.title_en : banner.title_en || banner.title_ar}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
