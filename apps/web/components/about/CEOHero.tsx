"use client";

import { ContentImage } from "../shared/ContentImage";
import type { PublicCompanySettings } from "@platform/database/types";
import { useTranslation } from "../../hooks/useTranslation";
import { SectionBadge } from "../shared/SectionBadge";
import { Reveal } from "../shared/Reveal";

export function CEOHero({
  company,
  imageUrl = "",
}: {
  company?: PublicCompanySettings;
  imageUrl?: string;
}) {
  const { t, locale } = useTranslation();
  const ar = locale === "ar";
  const title = (ar ? company?.ceo_title_ar : company?.ceo_title_en) || "";
  const name = (ar ? company?.ceo_name_ar : company?.ceo_name_en) || "";
  const quote = (ar ? company?.ceo_quote_ar : company?.ceo_quote_en) || "";
  const story = (ar ? company?.about_text_ar : company?.about_text_en) || "";

  const subtitle = "";
  const showSubtitle = !story.trim().startsWith(subtitle.trim());

  return (
    <section className="bg-m3-surface text-m3-on-surface">
      <div className="shell page-heading grid lg:grid-cols-12 gap-10 lg:gap-16 items-start">
        <Reveal className="lg:col-span-7 space-y-7">
          <SectionBadge>{t("about.badge")}</SectionBadge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold leading-[1.12] text-m3-on-surface">
            {t("about.title")}
          </h1>
          {showSubtitle && (
            <p className="text-lg leading-relaxed text-m3-on-surface-variant">
              {subtitle}
            </p>
          )}
          <p className="text-base leading-loose text-m3-on-surface-variant whitespace-pre-line">
            {story}
          </p>
          {quote && (
            <blockquote className="rounded-[var(--md-sys-shape-corner-large,16px)] bg-m3-surface-container-low border border-m3-outline-variant border-s-4 border-s-m3-primary ps-6 pe-5 py-5">
              <p className="font-serif text-xl sm:text-2xl leading-relaxed text-m3-on-surface">
                “{quote}”
              </p>
              <footer className="mt-4 text-sm font-medium text-m3-on-surface-variant">
                {name} / {title}
              </footer>
            </blockquote>
          )}
        </Reveal>
        {imageUrl && (
          <Reveal className="lg:col-span-5" delay={0.08}>
            <figure>
              <div className="aspect-[3/4] overflow-hidden rounded-[var(--md-sys-shape-corner-large,16px)] border border-m3-outline-variant bg-m3-surface-container">
                <ContentImage
                  src={imageUrl}
                  alt={t("about.studioImageAlt")}
                  width={600}
                  height={800}
                  className="w-full h-full object-cover object-top"
                />
              </div>
              <figcaption className="flex flex-wrap items-center justify-between gap-3 mt-5 text-sm">
                <span className="font-semibold text-m3-on-surface">
                  {ar ? company?.company_name_ar : company?.company_name_en}
                </span>
                <span className="text-m3-on-surface-variant">
                  {ar ? company?.address_ar : company?.address_en}
                </span>
              </figcaption>
            </figure>
          </Reveal>
        )}
      </div>
    </section>
  );
}
