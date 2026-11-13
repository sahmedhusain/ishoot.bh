"use client";

import Link from "next/link";
import { ArrowUpRight, MapPin, Play } from "lucide-react";
import type { PortfolioItem } from "@platform/database/types";
import type { CollectionLayout } from "@platform/database/website-presets";
import { pickText } from "@platform/database/constants/languages";
import { useTranslation } from "../../hooks/useTranslation";
import { collectionHref } from "../../lib/site-copy";
import { useSiteTone } from "../site/SiteTheme";
import { ContentImage } from "../shared/ContentImage";

const ASPECT: Record<CollectionLayout, string> = {
  media: "aspect-[16/10]",
  case: "aspect-[16/10]",
  product: "aspect-square",
  listing: "aspect-[4/3]",
};

function useItemFacts(item: PortfolioItem) {
  const { locale } = useTranslation();
  const subtitle = pickText(item.subtitle_en, item.subtitle_ar, locale);
  const project = [item.client_name, item.year].filter(Boolean).join(" · ");
  return { title: pickText(item.title_en, item.title_ar, locale), subtitle, project };
}

export function CollectionCard({ item, layout, tone: propTone, onOpen, horizontal = false }: { item: PortfolioItem; layout: CollectionLayout; tone?: "dark" | "light"; horizontal?: boolean; onOpen?: (item: PortfolioItem) => void }) {
  const { t, locale, site } = useTranslation();
  const siteTone = useSiteTone();
  const tone = propTone ?? (siteTone === "light" ? "light" : "dark");
  const { title, subtitle, project } = useItemFacts(item);
  const isVideo = Boolean(item.full_video_url || item.preview_video_url);
  const light = tone === "light";
  const heading = light ? "text-m3-on-surface group-hover:text-m3-primary" : "text-m3-on-surface group-hover:text-m3-primary";
  const muted = "text-m3-on-surface-variant";
  const facts = item.attributes.slice(0, 3);

  const body = (
    <>
      <div className={`relative overflow-hidden rounded-brand ${ASPECT[layout]} bg-m3-surface-container-high`}>
        <ContentImage
          src={item.thumbnail_url}
          alt={title}
          loading="lazy"
          width={800}
          height={layout === "product" ? 800 : 500}
          className="h-full w-full object-cover transition-transform duration-300 ease-out motion-safe:group-hover:scale-[1.025]"
        />
        {layout === "media" || layout === "case" ? (
          <span className="absolute bottom-3 end-3 flex h-11 w-11 items-center justify-center rounded-full bg-m3-primary text-m3-on-primary transition-colors duration-150 group-hover:brightness-95">
            {isVideo ? <Play className="h-4 w-4 fill-current" /> : <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" />}
          </span>
        ) : null}
      </div>

      <div className="space-y-1.5 pb-3 pt-4">
        {layout === "case" && project ? <p className="text-xs font-semibold uppercase tracking-wider text-m3-primary">{project}</p> : null}
        <div className="flex items-baseline justify-between gap-3">
          <h3 className={`font-display text-lg font-bold transition-colors sm:text-xl ${heading}`}>{title}</h3>
          {layout === "media" && item.year ? <span className={`shrink-0 text-xs font-semibold ${muted}`}>{item.year}</span> : null}
        </div>
        {layout === "media" && item.client_name ? <p className={`text-xs font-medium sm:text-sm ${muted}`}>{item.client_name}</p> : null}
        {layout !== "media" && subtitle ? <p className={`text-sm ${muted}`}>{subtitle}</p> : null}
        {layout === "listing" && item.location ? (
          <p className={`flex items-center gap-1.5 text-xs ${muted}`}>
            <MapPin className="h-3.5 w-3.5" />
            {item.location}
          </p>
        ) : null}
        {(layout === "listing" || layout === "product") && facts.length ? (
          <ul className="flex flex-wrap gap-1.5 pt-1">
            {facts.map((fact) => (
              <li key={fact.labelEn + fact.valueEn} className="rounded-full px-2.5 py-0.5 text-[11px] bg-m3-surface-container-high text-m3-on-surface-variant">
                {pickText(fact.valueEn, fact.valueAr, locale)} {pickText(fact.labelEn, fact.labelAr, locale)}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </>
  );

  const label = `${t("portfolio.viewProject")}: ${title}`;
  if (layout === "media" && onOpen)
    return (
      <button
        type="button"
        onClick={() => onOpen(item)}
        className={
          horizontal
            ? "group grid w-full grid-cols-[6rem_minmax(0,1fr)] items-center gap-4 text-start sm:grid-cols-[10rem_minmax(0,1fr)]"
            : "group block w-full text-start"
        }
        aria-label={label}
      >
        {body}
      </button>
    );
  return (
    <Link
      href={site ? collectionHref(site, locale, item.slug) : `/${locale}`}
      className={
        horizontal
          ? "group grid w-full grid-cols-[6rem_minmax(0,1fr)] items-center gap-4 text-start sm:grid-cols-[10rem_minmax(0,1fr)]"
          : "group block w-full text-start"
      }
      aria-label={label}
    >
      {body}
    </Link>
  );
}
