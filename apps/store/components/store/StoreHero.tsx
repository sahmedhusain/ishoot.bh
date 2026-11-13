"use client";

import Link from "next/link";
import { ArrowUpRight, ShoppingBag } from "lucide-react";
import type { HeroBanner, PublicCompanySettings } from "@platform/database/types";
import { pickText } from "@platform/database/constants/languages";
import { useTranslation } from "../../hooks/useTranslation";
import { ContentImage } from "../shared/ContentImage";
import { STORE_SPRING_GRID } from "../../lib/theme";
import { motion } from "framer-motion";
import { useSiteReducedMotion } from "../site/SiteTheme";

export function StoreHero({
  banner,
  company,
  locale,
}: {
  banner?: HeroBanner;
  company: PublicCompanySettings;
  locale: string;
}) {
  const { t } = useTranslation();
  const reduced = useSiteReducedMotion();
  const companyName = pickText(
    company.company_name_en,
    company.company_name_ar,
    locale,
  );
  const title =
    pickText(banner?.title_en, banner?.title_ar, locale) ||
    t("store.heroTitle", { companyName });
  const subtitle =
    pickText(banner?.subtitle_en, banner?.subtitle_ar, locale) ||
    pickText(company.tagline_en, company.tagline_ar, locale) ||
    t("store.heroSubtitle");

  return (
    <section
      id="home"
      data-hero="true"
      className="relative overflow-hidden bg-m3-surface-container-low border-b border-m3-outline-variant pt-28 pb-16 sm:pt-36 sm:pb-24"
    >
      <div className="shell grid gap-10 lg:grid-cols-[1.2fr_0.8fr] items-center">
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduced ? { duration: 0 } : STORE_SPRING_GRID}
          className="space-y-6"
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-m3-secondary-container px-4 py-1.5 text-xs font-semibold text-m3-on-secondary-container">
            <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
            {t("hero.eyebrow", { companyName })}
          </span>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-m3-on-surface">
            {title}
          </h1>
          <p className="max-w-2xl text-base sm:text-lg text-m3-on-surface-variant leading-relaxed">
            {subtitle}
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href={`/${locale}/products`}
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-m3-primary px-6 py-3 text-sm font-bold text-m3-on-primary shadow-sm hover:brightness-95 transition-all"
            >
              <span>{t("store.shopNow")}</span>
              <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
            </Link>
            <Link
              href={`/${locale}/offers`}
              className="inline-flex min-h-12 items-center gap-2 rounded-full border border-m3-outline bg-m3-surface-container-lowest px-5 py-3 text-sm font-semibold text-m3-on-surface hover:bg-m3-surface-container-high transition-colors"
            >
              <span>{t("nav.offers")}</span>
            </Link>
          </div>
        </motion.div>

        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-m3-outline-variant bg-m3-surface-container">
          {banner?.media_url ? (
            <ContentImage
              src={banner.media_url}
              alt={title}
              width={900}
              height={675}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="site-hero-brand-shapes" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
