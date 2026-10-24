"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { HeroBanner } from "@platform/database/types";
import { safeWebsiteUrl } from "@platform/database/website-config";
import { useTranslation } from "../../hooks/useTranslation";
import { collectionHref } from "../../lib/site-copy";

/** Where a banner's button goes: its own link (catalogue and page links follow the site's addresses) or a quote request. */
function useHeroLinks(banner?: HeroBanner) {
  const { locale, site } = useTranslation();
  const catalogue = site ? collectionHref(site, locale) : `/${locale}`;
  let primary = safeWebsiteUrl(banner?.cta_link || "", `/${locale}/contact?intent=quote_request`);
  if (/^\/works([/?#]|$)/.test(primary)) primary = primary.replace(/^\/works/, catalogue);
  else if (/^\/(contact|about|services)([/?#]|$)/.test(primary)) primary = `/${locale}${primary}`;
  return { primary, catalogue };
}

export function HeroActions({ banner, tone = "dark" }: { banner?: HeroBanner; tone?: "dark" | "brand" }) {
  const { t, isRTL: ar } = useTranslation();
  const { primary, catalogue } = useHeroLinks(banner);
  const label = (ar ? banner?.cta_label_ar : banner?.cta_label_en) || t("hero.ideaAction");
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Link href={primary} className={tone === "brand" ? "web-button !bg-white !text-tone-10 hover:!bg-tone-90" : "web-button"}>
        {label}
        <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" />
      </Link>
      {primary.replace(/[?#].*$/, "") !== catalogue ? (
        <Link href={catalogue} className="web-hero-secondary">
          <span>{t("hero.explore")}</span>
          <ArrowUpRight aria-hidden="true" className="h-4 w-4 rtl:-scale-x-100" />
        </Link>
      ) : null}
    </div>
  );
}
