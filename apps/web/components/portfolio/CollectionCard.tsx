"use client";

import Link from "next/link";
import { ArrowUpRight, Calendar, MapPin } from "lucide-react";
import type { PortfolioItem } from "@platform/database/types";
import type { CollectionLayout } from "@platform/database/website-presets";
import { pickText } from "@platform/database/constants/languages";
import { useTranslation } from "../../hooks/useTranslation";
import { collectionHref, formatPrice } from "../../lib/site-copy";
import { fallbackBannerMediaUrl } from "../../lib/format-site";
import { ContentImage } from "../shared/ContentImage";

function deterministicIndex(seed: string): number {
  let sum = 0;
  for (let i = 0; i < seed.length; i++) sum += seed.charCodeAt(i);
  return sum;
}

export function CollectionCard({
  item,
  layout = "media",
  horizontal = false,
  onOpen,
}: {
  item: PortfolioItem;
  layout?: CollectionLayout;
  horizontal?: boolean;
  onOpen?: (item: PortfolioItem) => void;
}) {
  void horizontal;
  const { t, locale, site } = useTranslation();
  const ar = locale === "ar";
  const title = pickText(item.title_en, item.title_ar, locale);
  const subtitle = pickText(item.subtitle_en, item.subtitle_ar, locale);
  const category = item.category
    ? ar
      ? item.category.name_ar
      : item.category.name_en
    : "";
  const href = site ? collectionHref(site, locale, item.slug) : `/${locale}/work/${encodeURIComponent(item.slug)}`;
  const currency = site?.currency || "BHD";
  const imageSrc = item.thumbnail_url || fallbackBannerMediaUrl(deterministicIndex(item.slug || item.id));
  const aspectClass =
    layout === "product" || layout === "listing" ? "aspect-[4/3]" : "aspect-[16/10]";

  const cardInner = (
    <article className="group h-full flex flex-col rounded-3xl overflow-hidden bg-m3-surface-container-low border border-m3-outline-variant hover:border-m3-primary/60 hover:shadow-m3-3 transition-all duration-200">
      <div className={`relative w-full overflow-hidden bg-m3-surface-container ${aspectClass}`}>
        <ContentImage
          src={imageSrc}
          alt={title}
          width={800}
          height={520}
          className="w-full h-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.03]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent pointer-events-none"
        />
        <div className="absolute inset-x-4 top-4 flex items-center justify-between gap-2">
          {category ? (
            <span className="rounded-full bg-black/65 backdrop-blur-md border border-white/15 px-3 py-1 text-[11px] font-semibold text-white">
              {category}
            </span>
          ) : (
            <span />
          )}
          {item.year ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/65 backdrop-blur-md border border-white/15 px-2.5 py-1 text-[11px] font-medium text-white/90">
              <Calendar className="w-3 h-3 text-brand-mint" />
              <bdi dir="ltr">{item.year}</bdi>
            </span>
          ) : null}
        </div>

        {(item.price != null && item.price > 0) && (
          <div className="absolute bottom-3 start-4">
            <span className="rounded-full bg-m3-primary/95 text-m3-on-primary px-3 py-1 text-xs font-bold shadow-sm">
              {formatPrice(item.price, currency, locale)}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-between p-5 sm:p-6 gap-4">
        <div className="space-y-2">
          {(item.client_name || item.location) && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-m3-on-surface-variant">
              {item.client_name && <span className="font-semibold text-m3-primary">{item.client_name}</span>}
              {item.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span>{item.location}</span>
                </span>
              )}
            </div>
          )}

          <h3 className="text-lg sm:text-xl font-display font-bold text-m3-on-surface group-hover:text-m3-primary transition-colors leading-snug line-clamp-2">
            {title}
          </h3>

          {subtitle && (
            <p className="text-sm text-m3-on-surface-variant leading-relaxed line-clamp-2">
              {subtitle}
            </p>
          )}
        </div>

        <div className="pt-3 border-t border-m3-outline-variant/60 flex items-center justify-between text-xs font-semibold text-m3-primary">
          <span>{t("portfolio.viewProject")}</span>
          <ArrowUpRight className="w-4 h-4 rtl:-scale-x-100 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      </div>
    </article>
  );

  if (onOpen) {
    return (
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="text-start w-full h-full cursor-pointer focus-visible:outline-none"
      >
        {cardInner}
      </button>
    );
  }

  return (
    <Link href={href} className="block w-full h-full">
      {cardInner}
    </Link>
  );
}
