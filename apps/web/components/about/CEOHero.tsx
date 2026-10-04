"use client";

import type { CompanySettings } from "@ishoot/database/types";
import { useTranslation } from "../../hooks/useTranslation";
import { SectionBadge } from "../shared/SectionBadge";
import { Reveal } from "../shared/Reveal";

export function CEOHero({
  company,
  imageUrl = "/banners/web-banner-04.jpg",
}: {
  company?: CompanySettings;
  imageUrl?: string;
}) {
  const { t, locale } = useTranslation();
  const ar = locale === "ar";
  const title =
    (ar ? company?.ceo_title_ar : company?.ceo_title_en) || t("about.ceoTitle");
  const name =
    (ar ? company?.ceo_name_ar : company?.ceo_name_en) || t("about.ceoName");
  const quote =
    (ar ? company?.ceo_quote_ar : company?.ceo_quote_en) || t("about.ceoQuote");
  const story =
    (ar ? company?.about_text_ar : company?.about_text_en) ||
    t("about.storyP1");

  const subtitle = t("about.subtitle");
  const showSubtitle = !story.trim().startsWith(subtitle.trim());

  return (
    <section className="bg-[var(--ishoot-bg-base)] text-[var(--ishoot-text-primary)]">
      <div className="shell page-heading grid lg:grid-cols-12 gap-10 lg:gap-16 items-start">
        <Reveal className="lg:col-span-7 space-y-7">
          <SectionBadge>{t("about.badge")}</SectionBadge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold leading-[1.12]">
            {t("about.title")}
          </h1>
          {showSubtitle && (
            <p className="text-lg leading-relaxed text-[var(--ishoot-text-secondary)]">
              {subtitle}
            </p>
          )}
          <p className="text-base leading-loose text-[var(--ishoot-text-secondary)] whitespace-pre-line">
            {story}
          </p>
          <blockquote className="border-s-2 border-[#5EEAD4] ps-6 py-2">
            <p className="font-serif text-xl sm:text-2xl leading-relaxed">
              “{quote}”
            </p>
            <footer className="mt-5 text-sm text-[var(--ishoot-text-secondary)]">
              {name} / {title}
            </footer>
          </blockquote>
        </Reveal>
        <Reveal className="lg:col-span-5" delay={0.08}>
          <figure>
            <div className="aspect-[3/4] overflow-hidden rounded-lg bg-[var(--ishoot-bg-surface)]">
              <img
                src={imageUrl}
                alt={t("about.studioImageAlt")}
                width={600}
                height={800}
                className="w-full h-full object-cover object-top"
              />
            </div>
            <figcaption className="flex flex-wrap items-center justify-between gap-3 mt-5 text-sm">
              <span className="font-medium">
                {t("about.studioImageCaption")}
              </span>
              <span className="text-[var(--ishoot-text-secondary)]">
                {t("about.location")}
              </span>
            </figcaption>
          </figure>
        </Reveal>
      </div>
    </section>
  );
}
