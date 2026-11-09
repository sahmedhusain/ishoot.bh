"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { HeroBanner } from "@platform/database/types";
import { safeWebsiteUrl } from "@platform/database/website-config";
import { useTranslation } from "../../hooks/useTranslation";
import { collectionHref } from "../../lib/site-copy";

function useHeroLinks(banner?: HeroBanner) {
  const { locale, site } = useTranslation();
  const catalogue = site ? collectionHref(site, locale) : `/${locale}`;
  let primary = safeWebsiteUrl(banner?.cta_link || "", `/${locale}/contact?intent=quote_request`);
  if (/^\/works([/?#]|$)/.test(primary)) primary = primary.replace(/^\/works/, catalogue);
  else if (/^\/(contact|about|services)([/?#]|$)/.test(primary)) primary = `/${locale}${primary}`;
  return { primary, catalogue };
}

export function useHeroContent(banner?: HeroBanner, fallbackTitle = "", fallbackSubtitle = "") {
  const { t, locale, site } = useTranslation();
  const override = site?.interfaceCopy?.[locale]?.hero as Record<string, unknown> | undefined;
  const text = (key: string) => typeof override?.[key] === "string" ? override[key] as string : "";
  return {
    heading: text("headline") || (locale === "ar" ? banner?.title_ar : banner?.title_en) || fallbackTitle || t("hero.fallbackTitle"),
    subtitle: text("subheadline") || (locale === "ar" ? banner?.subtitle_ar : banner?.subtitle_en) || fallbackSubtitle,
    primaryLabel: text("startProject") || (locale === "ar" ? banner?.cta_label_ar : banner?.cta_label_en) || t("hero.ideaAction"),
    exploreLabel: text("exploreWorks") || t("hero.explore"),
  };
}

export function HeroActions({ banner, tone = "dark" }: { banner?: HeroBanner; tone?: "dark" | "brand" }) {
  const { primary, catalogue } = useHeroLinks(banner);
  const { primaryLabel: label, exploreLabel } = useHeroContent(banner);
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Link href={primary} className={tone === "brand" ? "web-button !bg-white !text-tone-10 hover:!bg-tone-90" : "web-button"}>
        {label}
        <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" />
      </Link>
      {primary.replace(/[?#].*$/, "") !== catalogue ? (
        <Link href={catalogue} className="web-hero-secondary">
          <span>{exploreLabel}</span>
          <ArrowUpRight aria-hidden="true" className="h-4 w-4 rtl:-scale-x-100" />
        </Link>
      ) : null}
    </div>
  );
}
