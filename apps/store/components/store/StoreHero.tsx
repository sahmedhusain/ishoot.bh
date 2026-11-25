"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, Award, ChevronLeft, ChevronRight, ShoppingBag, Sparkles, Tag } from "lucide-react";
import type { HeroBanner, PortfolioCategory, PublicCompanySettings } from "@platform/database/types";
import { pickText } from "@platform/database/constants/languages";
import { useTranslation } from "../../hooks/useTranslation";
import { ContentImage } from "../shared/ContentImage";
import { STORE_SPRING_GRID } from "../../lib/theme";
import { motion } from "framer-motion";
import { useSiteReducedMotion } from "../site/SiteTheme";

export function StoreHero({
  banner,
  banners,
  company,
  locale,
  categories = [],
  loyaltyEnabled = true,
  raffleEnabled = true,
  rafflePrize,
}: {
  banner?: HeroBanner;
  banners?: HeroBanner[];
  company: PublicCompanySettings;
  locale: string;
  categories?: PortfolioCategory[];
  loyaltyEnabled?: boolean;
  raffleEnabled?: boolean;
  rafflePrize?: string;
}) {
  const { t, isRTL } = useTranslation();
  const ar = locale === "ar";
  const reduced = useSiteReducedMotion();

  const slides = React.useMemo(() => {
    const active = (banners ?? []).filter((b) => b && b.is_active !== false);
    if (active.length > 0) return active;
    return banner ? [banner] : [];
  }, [banners, banner]);

  const [activeIndex, setActiveIndex] = React.useState(0);
  const safeIndex = slides.length ? activeIndex % slides.length : 0;
  const activeSlide = slides[safeIndex];

  const companyName = pickText(
    company.company_name_en,
    company.company_name_ar,
    locale,
  );
  const title =
    pickText(activeSlide?.title_en, activeSlide?.title_ar, locale) ||
    t("store.heroTitle", { companyName });
  const subtitle =
    pickText(activeSlide?.subtitle_en, activeSlide?.subtitle_ar, locale) ||
    pickText(company.tagline_en, company.tagline_ar, locale) ||
    t("store.heroSubtitle");

  const ctaHref = (activeSlide as HeroBanner & { cta_link?: string })?.cta_link || `/${locale}/shop`;
  const ctaLabel =
    pickText(
      (activeSlide as HeroBanner & { cta_text_en?: string })?.cta_text_en,
      (activeSlide as HeroBanner & { cta_text_ar?: string })?.cta_text_ar,
      locale,
    ) || t("store.shopNow");

  const sideBannerOne = slides[1] as (HeroBanner & { cta_link?: string; link_url?: string }) | undefined;
  const sideBannerTwo = slides[2] as (HeroBanner & { cta_link?: string; link_url?: string }) | undefined;
  const catOne = categories[0];
  const catTwo = categories[1];

  const cardOneHref = sideBannerOne?.cta_link || sideBannerOne?.link_url
    || (catOne ? `/${locale}/category/${encodeURIComponent(catOne.slug)}` : `/${locale}/deals`);
  const cardOneBadge = catOne
    ? pickText(catOne.name_en, catOne.name_ar, locale)
    : t("nav.products");
  const cardOneTitle =
    (sideBannerOne && pickText(sideBannerOne.title_en, sideBannerOne.title_ar, locale)) ||
    (catOne ? pickText(catOne.name_en, catOne.name_ar, locale) : t("store.bestDeals"));
  const cardOneSubtitle =
    (sideBannerOne && pickText(sideBannerOne.subtitle_en, sideBannerOne.subtitle_ar, locale)) ||
    t("store.bestDealsSub");

  const cardTwoHref = sideBannerTwo?.cta_link || sideBannerTwo?.link_url
    || (catTwo ? `/${locale}/category/${encodeURIComponent(catTwo.slug)}` : `/${locale}/ready-made-pcs`);
  const cardTwoBadge = catTwo
    ? pickText(catTwo.name_en, catTwo.name_ar, locale)
    : t("nav.offers");
  const cardTwoTitle =
    (sideBannerTwo && pickText(sideBannerTwo.title_en, sideBannerTwo.title_ar, locale)) ||
    (catTwo ? pickText(catTwo.name_en, catTwo.name_ar, locale) : (ar ? "باقات مختارة بعناية" : "Curated Store Collections"));
  const cardTwoSubtitle =
    (sideBannerTwo && pickText(sideBannerTwo.subtitle_en, sideBannerTwo.subtitle_ar, locale)) ||
    t("store.browseByCollection");

  return (
    <section
      id="home"
      data-hero="true"
      className="bg-m3-surface pt-6 pb-6"
    >
      <div className="shell grid gap-5 lg:grid-cols-[2.2fr_1fr]">
        {/* Left (~70%): Asymmetric Hero Carousel Frame */}
        <div className="relative min-h-[380px] sm:min-h-[430px] overflow-hidden rounded-3xl border border-m3-outline-variant/50 bg-m3-inverse-surface text-m3-inverse-on-surface flex items-center">
          {activeSlide?.media_url ? (
            (activeSlide as HeroBanner & { media_type?: string }).media_type === "video" ? (
              <video
                src={activeSlide.media_url}
                autoPlay
                muted
                loop
                playsInline
                className="absolute inset-0 h-full w-full object-cover opacity-50"
              />
            ) : (
              <ContentImage
                src={activeSlide.media_url}
                alt={title}
                width={1200}
                height={600}
                className="absolute inset-0 h-full w-full object-cover opacity-45"
              />
            )
          ) : null}
          <div
            className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/20 rtl:bg-gradient-to-l"
            aria-hidden="true"
          />

          <motion.div
            key={activeSlide?.id ?? safeIndex}
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduced ? { duration: 0 } : STORE_SPRING_GRID}
            className="relative z-10 p-6 sm:p-10 lg:p-12 space-y-5 max-w-2xl"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-m3-primary px-3.5 py-1 text-xs font-bold text-m3-on-primary">
                <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
                {t("hero.eyebrow", { companyName })}
              </span>
              {loyaltyEnabled && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs font-semibold">
                  <Award className="h-3.5 w-3.5 text-m3-primary" aria-hidden="true" />
                  {t("store.loyaltyHeroPill", { defaultValue: "Earn Loyalty Points" })}
                </span>
              )}
              {raffleEnabled && rafflePrize && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs font-semibold">
                  <Sparkles className="h-3.5 w-3.5 text-m3-primary" aria-hidden="true" />
                  {rafflePrize}
                </span>
              )}
            </div>

            <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight leading-tight">
              {title}
            </h1>
            <p className="text-sm sm:text-base opacity-85 leading-relaxed max-w-xl">
              {subtitle}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                href={ctaHref}
                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-m3-primary px-6 py-3 text-sm font-bold text-m3-on-primary shadow-sm hover:brightness-95 transition-all"
              >
                <span>{ctaLabel}</span>
                <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
              </Link>
              <Link
                href={`/${locale}/deals`}
                className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold hover:bg-white/20 transition-colors"
              >
                <span>{t("nav.offers")}</span>
              </Link>
            </div>
          </motion.div>

          {slides.length > 1 && (
            <>
              <button
                type="button"
                data-testid="hero-prev"
                aria-label={t("store.heroPrev", { defaultValue: "Previous banner" })}
                onClick={() => setActiveIndex((prev) => (prev - 1 + slides.length) % slides.length)}
                className="absolute start-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/50 border border-white/20 hover:bg-black/75 flex items-center justify-center text-white"
              >
                {isRTL ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
              </button>
              <button
                type="button"
                data-testid="hero-next"
                aria-label={t("store.heroNext", { defaultValue: "Next banner" })}
                onClick={() => setActiveIndex((prev) => (prev + 1) % slides.length)}
                className="absolute end-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/50 border border-white/20 hover:bg-black/75 flex items-center justify-center text-white"
              >
                {isRTL ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </button>
              <div
                data-testid="hero-carousel-controls"
                className="absolute inset-x-0 bottom-4 z-20 flex items-center justify-center gap-1.5"
              >
                {slides.map((s, idx) => (
                  <button
                    key={s.id ?? idx}
                    type="button"
                    aria-label={`Slide ${idx + 1}`}
                    onClick={() => setActiveIndex(idx)}
                    className={`h-2 rounded-full transition-all ${
                      idx === safeIndex ? "w-6 bg-m3-primary" : "w-2 bg-white/50 hover:bg-white/80"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Right (~30%): 2 Stacked Promo Cards Driven by Seeded Banners / Categories */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
          <Link
            href={cardOneHref}
            className="group relative min-h-[195px] sm:min-h-[205px] overflow-hidden rounded-3xl border border-m3-outline-variant bg-m3-inverse-surface text-m3-inverse-on-surface p-6 flex flex-col justify-between transition-all hover:border-m3-primary"
          >
            {sideBannerOne?.media_url && (
              <ContentImage
                src={sideBannerOne.media_url}
                alt={cardOneTitle}
                width={500}
                height={260}
                className="absolute inset-0 h-full w-full object-cover opacity-35 group-hover:scale-105 transition-transform duration-300"
              />
            )}
            <div className="relative z-10 flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-m3-secondary-container px-3 py-1 text-[11px] font-bold text-m3-on-secondary-container">
                <Tag className="w-3.5 h-3.5" aria-hidden="true" />
                {cardOneBadge}
              </span>
              <ArrowUpRight className="w-4 h-4 opacity-75 group-hover:text-m3-primary rtl:-scale-x-100" aria-hidden="true" />
            </div>
            <div className="relative z-10 space-y-1">
              <h2 className="font-display text-lg font-bold line-clamp-1">{cardOneTitle}</h2>
              <p className="text-xs opacity-80 line-clamp-2">{cardOneSubtitle}</p>
            </div>
          </Link>

          <Link
            href={cardTwoHref}
            className="group relative min-h-[195px] sm:min-h-[205px] overflow-hidden rounded-3xl border border-m3-outline-variant bg-m3-inverse-surface text-m3-inverse-on-surface p-6 flex flex-col justify-between transition-all hover:border-m3-primary"
          >
            {sideBannerTwo?.media_url && (
              <ContentImage
                src={sideBannerTwo.media_url}
                alt={cardTwoTitle}
                width={500}
                height={260}
                className="absolute inset-0 h-full w-full object-cover opacity-35 group-hover:scale-105 transition-transform duration-300"
              />
            )}
            <div className="relative z-10 flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-m3-primary px-3 py-1 text-[11px] font-bold text-m3-on-primary">
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                {cardTwoBadge}
              </span>
              <ArrowUpRight className="w-4 h-4 opacity-75 group-hover:text-m3-primary rtl:-scale-x-100" aria-hidden="true" />
            </div>
            <div className="relative z-10 space-y-1">
              <h2 className="font-display text-lg font-bold line-clamp-1">{cardTwoTitle}</h2>
              <p className="text-xs opacity-80 line-clamp-2">{cardTwoSubtitle}</p>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
