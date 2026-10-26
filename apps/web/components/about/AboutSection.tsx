"use client";
import { ContentImage } from "../shared/ContentImage";

import Link from "next/link";
import { useTranslation } from "../../hooks/useTranslation";
import { ArrowUpRight, Target, Eye } from "lucide-react";
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

  return (
    <section
      id="about"
      className="relative bg-[#F8FAFC] text-[#0F172A] py-20 sm:py-28 border-t border-slate-200"
    >
      <div className="shell space-y-12 sm:space-y-16">
        <Reveal className="max-w-5xl space-y-5">
          <SectionBadge className="!text-accent-pressed">
            {t("about.sectionLabel")}
          </SectionBadge>
          <h2 className="font-display text-[clamp(2rem,4.5vw,4.25rem)] leading-[1.12] tracking-tight font-bold text-slate-950">
            {(ar ? company?.mission_ar : company?.mission_en) || t("about.headline")}
          </h2>
          <p className="font-sans text-[clamp(1.05rem,1.8vw,1.4rem)] leading-relaxed text-slate-600 max-w-3xl">
            {ar ? company?.about_text_ar : company?.about_text_en}
          </p>
        </Reveal>

        <div className="grid gap-10 lg:gap-16 lg:grid-cols-[minmax(0,440px)_1fr] items-center">
          {imageUrl && <Reveal>
            <figure>
              <div className="aspect-[4/5] overflow-hidden rounded-lg bg-slate-200">
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
                <p className="text-sm leading-relaxed text-slate-600">
                  {ar ? company?.company_name_ar : company?.company_name_en}
                </p>
              </figcaption>
            </figure>
          </Reveal>}

          <div className="space-y-8">
            <Reveal className="pb-8 border-b border-slate-200">
              <h3 className="flex items-center gap-3 text-sm font-semibold text-accent-pressed mb-4">
                <Target aria-hidden="true" className="w-5 h-5" />
                {t("about.missionLabel")}
              </h3>
              <p className="text-base sm:text-lg leading-relaxed text-slate-700 max-w-xl">
                {(ar ? company?.mission_ar : company?.mission_en) || ""}
              </p>
            </Reveal>
            <Reveal delay={0.08}>
              <h3 className="flex items-center gap-3 text-sm font-semibold text-accent-pressed mb-4">
                <Eye aria-hidden="true" className="w-5 h-5" />
                {t("about.visionLabel")}
              </h3>
              <p className="text-base sm:text-lg leading-relaxed text-slate-700 max-w-xl">
                {(ar ? company?.vision_ar : company?.vision_en) || ""}
              </p>
            </Reveal>
            <Link href={`/${locale}/about`} className="web-button">
              {t("about.discoverStudio")}
              <ArrowUpRight
                aria-hidden="true"
                className="w-4 h-4 rtl:-scale-x-100"
              />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
