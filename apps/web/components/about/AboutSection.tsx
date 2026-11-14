"use client";
import { ContentImage } from "../shared/ContentImage";

import Link from "next/link";
import { useTranslation } from "../../hooks/useTranslation";
import { ArrowUpRight, Target, Eye, Calendar, Building2, MapPin, Award, Quote } from "lucide-react";
import type { PublicCompanySettings } from "@platform/database/types";
import { Reveal } from "../shared/Reveal";
import { SectionBadge } from "../shared/SectionBadge";

interface AboutSectionProps {
  clientLogos?: unknown[];
  company?: PublicCompanySettings;
  imageUrl?: string;
}

export function AboutSection({ company, imageUrl }: AboutSectionProps) {
  const { t, locale } = useTranslation();
  const ar = locale === "ar";
  const ceoName = (ar ? company?.ceo_name_ar : company?.ceo_name_en) || company?.ceo_name_en || company?.ceo_name_ar;
  const ceoTitle = (ar ? company?.ceo_title_ar : company?.ceo_title_en) || company?.ceo_title_en || company?.ceo_title_ar;
  const ceoQuote = (ar ? company?.ceo_quote_ar : company?.ceo_quote_en) || company?.ceo_quote_en || company?.ceo_quote_ar;
  const leadershipValue = [ceoName, ceoTitle].filter(Boolean).join(" — ");
  const hasCredentials = Boolean(company?.founded_year || company?.cr_number || company?.city || leadershipValue);

  return (
    <section
      id="about"
      className="relative bg-m3-surface text-ink py-20 sm:py-28 border-t border-m3-outline-variant"
    >
      <div className="shell space-y-12 sm:space-y-16">
        <Reveal className="max-w-5xl space-y-5">
          <SectionBadge className="!text-accent-pressed">
            {t("about.sectionLabel")}
          </SectionBadge>
          <h2 className="font-display text-[clamp(2rem,4.5vw,4.25rem)] leading-[1.12] tracking-tight font-bold text-ink">
            {(ar ? company?.mission_ar : company?.mission_en) || t("about.headline")}
          </h2>
          <p className="font-sans text-[clamp(1.05rem,1.8vw,1.4rem)] leading-relaxed text-ink-muted max-w-3xl">
            {ar ? company?.about_text_ar : company?.about_text_en}
          </p>
        </Reveal>

        {hasCredentials && (
          <Reveal className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <SectionBadge className="!text-accent-pressed">
                {t("about.credentialsBadge")}
              </SectionBadge>
            </div>
            <div
              data-testid="executive-credentials"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            >
              {company?.founded_year != null && (
                <div className="rounded-2xl bg-m3-surface-container-low border border-m3-outline-variant p-5 flex items-start gap-3.5">
                  <div className="h-10 w-10 rounded-xl bg-m3-primary/10 text-m3-primary flex items-center justify-center shrink-0">
                    <Calendar aria-hidden="true" className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <p className="text-xs font-semibold text-ink-muted">{t("about.foundedLabel")}</p>
                    <p className="text-lg font-display font-bold text-ink tabular-nums" dir="ltr">{company.founded_year}</p>
                  </div>
                </div>
              )}
              {company?.cr_number && (
                <div className="rounded-2xl bg-m3-surface-container-low border border-m3-outline-variant p-5 flex items-start gap-3.5">
                  <div className="h-10 w-10 rounded-xl bg-m3-primary/10 text-m3-primary flex items-center justify-center shrink-0">
                    <Building2 aria-hidden="true" className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <p className="text-xs font-semibold text-ink-muted">{t("about.crLabel")}</p>
                    <p className="text-base font-display font-bold text-ink truncate" dir="ltr">{company.cr_number}</p>
                  </div>
                </div>
              )}
              {company?.city && (
                <div className="rounded-2xl bg-m3-surface-container-low border border-m3-outline-variant p-5 flex items-start gap-3.5">
                  <div className="h-10 w-10 rounded-xl bg-m3-primary/10 text-m3-primary flex items-center justify-center shrink-0">
                    <MapPin aria-hidden="true" className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <p className="text-xs font-semibold text-ink-muted">{t("about.headquartersLabel")}</p>
                    <p className="text-base font-display font-bold text-ink truncate">{company.city}</p>
                  </div>
                </div>
              )}
              {leadershipValue && (
                <div className="rounded-2xl bg-m3-surface-container-low border border-m3-outline-variant p-5 flex items-start gap-3.5">
                  <div className="h-10 w-10 rounded-xl bg-m3-primary/10 text-m3-primary flex items-center justify-center shrink-0">
                    <Award aria-hidden="true" className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <p className="text-xs font-semibold text-ink-muted">{t("about.leadershipLabel")}</p>
                    <p className="text-sm font-display font-bold text-ink leading-snug">{leadershipValue}</p>
                  </div>
                </div>
              )}
            </div>
          </Reveal>
        )}

        <div className="grid gap-10 lg:gap-16 lg:grid-cols-[minmax(0,440px)_1fr] items-center">
          {imageUrl && <Reveal>
            <figure>
              <div className="aspect-[4/5] overflow-hidden rounded-lg bg-m3-surface-container-high">
                <ContentImage
                  src={imageUrl}
                  alt={t("about.behindTheScenes")}
                  loading="lazy"
                  width={600}
                  height={750}
                  className="w-full h-full object-cover object-center"
                />
              </div>
              <figcaption className="mt-4 space-y-1">
                <span className="text-xs font-semibold text-accent-pressed">
                  {t("about.behindTheScenes")}
                </span>
                <p className="text-sm leading-relaxed text-ink-muted">
                  {ar ? company?.company_name_ar : company?.company_name_en}
                </p>
              </figcaption>
            </figure>
          </Reveal>}

          <div className="space-y-8">
            <Reveal className="pb-8 border-b border-m3-outline-variant">
              <h3 className="flex items-center gap-3 text-sm font-semibold text-accent-pressed mb-4">
                <Target aria-hidden="true" className="w-5 h-5" />
                {t("about.missionLabel")}
              </h3>
              <p className="text-base sm:text-lg leading-relaxed text-ink-muted max-w-xl">
                {(ar ? company?.mission_ar : company?.mission_en) || ""}
              </p>
            </Reveal>
            <Reveal delay={0.08}>
              <h3 className="flex items-center gap-3 text-sm font-semibold text-accent-pressed mb-4">
                <Eye aria-hidden="true" className="w-5 h-5" />
                {t("about.visionLabel")}
              </h3>
              <p className="text-base sm:text-lg leading-relaxed text-ink-muted max-w-xl">
                {(ar ? company?.vision_ar : company?.vision_en) || ""}
              </p>
            </Reveal>
            {ceoQuote && (
              <Reveal delay={0.12}>
                <blockquote className="rounded-2xl bg-m3-surface-container-low border border-m3-outline-variant p-6 space-y-3">
                  <div className="flex items-start gap-3">
                    <Quote aria-hidden="true" className="w-5 h-5 text-m3-primary shrink-0 mt-1" />
                    <p className="font-serif text-base sm:text-lg leading-relaxed text-ink">
                      “{ceoQuote}”
                    </p>
                  </div>
                  {leadershipValue && (
                    <footer className="text-xs font-semibold text-ink-muted ps-8">
                      {leadershipValue}
                    </footer>
                  )}
                </blockquote>
              </Reveal>
            )}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link href={`/${locale}/about`} className="web-button">
                {t("about.discoverStudio")}
                <ArrowUpRight
                  aria-hidden="true"
                  className="w-4 h-4 rtl:-scale-x-100"
                />
              </Link>
              <Link
                href={`/${locale}/contact?intent=quote_request`}
                className="inline-flex min-h-11 items-center gap-2 rounded-brand border border-m3-outline bg-m3-surface-container-low hover:bg-m3-surface-container px-5 py-2.5 text-sm font-semibold text-ink transition-colors"
              >
                {t("about.requestConsultation")}
                <ArrowUpRight
                  aria-hidden="true"
                  className="w-4 h-4 rtl:-scale-x-100"
                />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
