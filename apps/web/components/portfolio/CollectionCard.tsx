"use client";

import Link from "next/link";
import { ArrowUpRight, MapPin, Play } from "lucide-react";
import type { PortfolioItem } from "@platform/database/types";
import type { CollectionLayout } from "@platform/database/website-presets";
import { pickText } from "@platform/database/constants/languages";
import { useTranslation } from "../../hooks/useTranslation";
import { collectionHref, formatPrice } from "../../lib/site-copy";
import { ContentImage } from "../shared/ContentImage";

const ASPECT: Record<CollectionLayout, string> = {
  media: "aspect-[16/10]",
  case: "aspect-[16/10]",
  product: "aspect-square",
  listing: "aspect-[4/3]",
};

/** The line under a title: who and when for projects, the subtitle or location otherwise. */
function useItemFacts(item: PortfolioItem) {
  const { locale, site } = useTranslation();
  const subtitle = pickText(item.subtitle_en, item.subtitle_ar, locale);
  const project = [item.client_name, item.year].filter(Boolean).join(" · ");
  const price = item.price !== undefined && site ? formatPrice(item.price, site.currency, locale) : "";
  const priceNote = pickText(item.price_note_en, item.price_note_ar, locale);
  return { title: pickText(item.title_en, item.title_ar, locale), subtitle, project, price, priceNote };
}

/**
 * One catalogue item, drawn for the website's layout. Video projects open in the lightbox (`onOpen`);
 * everything else links to its own page.
 */
export function CollectionCard({ item, layout, tone = "dark", onOpen }: { item: PortfolioItem; layout: CollectionLayout; tone?: "dark" | "light"; onOpen?: (item: PortfolioItem) => void }) {
  const { t, locale, site } = useTranslation();
  const { title, subtitle, project, price, priceNote } = useItemFacts(item);
  const isVideo = Boolean(item.full_video_url || item.preview_video_url);
  const light = tone === "light";
  const heading = light ? "text-slate-950 group-hover:text-accent-pressed" : "text-white group-hover:text-mint";
  const muted = light ? "text-slate-600" : "text-ink-muted";
  const facts = item.attributes.slice(0, 3);

  const body = (
    <>
      <div className={`relative overflow-hidden rounded-brand ${ASPECT[layout]} ${light ? "bg-slate-200" : "bg-black/40"}`}>
        <ContentImage
          src={item.thumbnail_url}
          alt={title}
          loading="lazy"
          width={800}
          height={layout === "product" ? 800 : 500}
          className="h-full w-full object-cover transition-transform duration-300 ease-out motion-safe:group-hover:scale-[1.025]"
        />
        {layout === "media" || layout === "case" ? (
          <span className="absolute bottom-3 end-3 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--web-accent)] text-white transition-colors duration-150 group-hover:bg-mint group-hover:text-brand-base">
            {isVideo ? <Play className="h-4 w-4 fill-current" /> : <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" />}
          </span>
        ) : null}
        {layout === "listing" && price ? (
          <span className="absolute bottom-3 start-3 rounded-brand bg-black/75 px-3 py-1.5 text-sm font-semibold text-paper backdrop-blur-sm">
            {price}
            {priceNote ? <span className="ms-1 text-xs font-normal text-white/75">{priceNote}</span> : null}
          </span>
        ) : null}
      </div>

      <div className="space-y-1.5 pb-3 pt-4">
        {layout === "case" && project ? <p className={`text-xs font-semibold uppercase tracking-wider ${light ? "text-accent-pressed" : "text-mint"}`}>{project}</p> : null}
        <div className="flex items-baseline justify-between gap-3">
          <h3 className={`font-display text-lg font-bold transition-colors sm:text-xl ${heading}`}>{title}</h3>
          {layout === "media" && item.year ? <span className={`shrink-0 text-xs font-semibold ${muted}`}>{item.year}</span> : null}
          {layout === "product" && price ? <span className={`shrink-0 text-sm font-bold ${light ? "text-slate-950" : "text-white"}`}>{price}</span> : null}
        </div>
        {layout === "media" && item.client_name ? <p className={`text-xs font-medium sm:text-sm ${muted}`}>{item.client_name}</p> : null}
        {layout !== "media" && subtitle ? <p className={`text-sm ${muted}`}>{subtitle}</p> : null}
        {layout === "product" && priceNote ? <p className={`text-xs ${muted}`}>{priceNote}</p> : null}
        {layout === "listing" && item.location ? (
          <p className={`flex items-center gap-1.5 text-xs ${muted}`}>
            <MapPin className="h-3.5 w-3.5" />
            {item.location}
          </p>
        ) : null}
        {(layout === "listing" || layout === "product") && facts.length ? (
          <ul className="flex flex-wrap gap-1.5 pt-1">
            {facts.map((fact) => (
              <li key={fact.labelEn + fact.valueEn} className={`rounded-full px-2.5 py-0.5 text-[11px] ${light ? "bg-slate-200/70 text-slate-700" : "bg-white/10 text-ink"}`}>
                {pickText(fact.valueEn, fact.valueAr, locale)} {pickText(fact.labelEn, fact.labelAr, locale)}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </>
  );

  const label = `${t("portfolio.viewProject")}: ${title}`;
  const className = "group block w-full text-start";
  if (layout === "media" && onOpen)
    return (
      <button type="button" onClick={() => onOpen(item)} className={className} aria-label={label}>
        {body}
      </button>
    );
  return (
    <Link href={site ? collectionHref(site, locale, item.slug) : `/${locale}`} className={className} aria-label={label}>
      {body}
    </Link>
  );
}

/** Grid columns for a layout: wide cards for projects, three across for products and listings. */
export function collectionGridClass(layout: CollectionLayout) {
  return layout === "product" || layout === "listing" ? "grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3" : "grid grid-cols-1 gap-x-8 gap-y-12 md:grid-cols-2";
}
