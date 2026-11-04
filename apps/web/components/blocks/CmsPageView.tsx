import type { ReactNode } from "react";
import { storeEnabled } from "../../lib/customer";
import { getReviews, getStudioEquipment, catalogueProductPrices } from "@platform/database";
import type { CmsPageRecord } from "@platform/database/queries/cms-pages";
import { getSite } from "../../lib/site";
import { Reveal } from "../shared/Reveal";
import { PageBlocks } from "./PageBlocks";

/** A website page built from blocks. Custom pages open with their title; built-in pages start with their first block. */
export async function CmsPageView({ page, locale, contact }: { page: CmsPageRecord; locale: string; contact?: ReactNode }) {
  const { website, company, info } = await getSite();
  if (!website) return null;
  const types = new Set(page.blocks.filter((block) => block.visible).map((block) => block.type));
  const [reviews, equipment] = await Promise.all([
    types.has("testimonials") ? getReviews(false) : Promise.resolve([]),
    types.has("equipment") && info.showEquipment ? getStudioEquipment() : Promise.resolve([]),
  ]);
  const prices = types.has("catalogue") && await storeEnabled() ? await catalogueProductPrices(website.portfolio.map(item => item.id)) : new Map<string, number>();
  const content = { ...website, portfolio: website.portfolio.map(item => prices.has(item.id) ? { ...item, price: prices.get(item.id) as number | undefined } : item) };
  const title = locale === "ar" ? page.title_ar || page.title_en : page.title_en || page.title_ar;
  const opensWithHero = page.blocks.find((block) => block.visible)?.type === "hero";
  return (
    <div className={`${page.page_type === "home" ? "home-page " : ""}flex flex-col w-full min-h-screen bg-brand-base text-ink`}>
      {page.page_type === "custom" && !opensWithHero && (
        <header className="shell page-heading pb-0">
          <Reveal>
            <h1 className="max-w-4xl text-4xl sm:text-6xl font-display font-bold leading-[1.08] tracking-tight text-white">{title}</h1>
          </Reveal>
        </header>
      )}
      <PageBlocks
        blocks={page.blocks}
        context={{ home: page.page_type === "home", locale, website: content, company, reviews, equipment, contact, showEquipment: info.showEquipment, articlesBase: `/${locale}/${info.articles.slug}` }}
      />
    </div>
  );
}

/** The snapshot's page of a built-in type, or a custom page at an address. Hidden pages only show in preview. */
export function findPage(pages: CmsPageRecord[] | undefined, match: { type?: CmsPageRecord["page_type"]; slug?: string }, preview: boolean) {
  const page = pages?.find((p) => (match.type ? p.page_type === match.type : p.page_type === "custom" && p.slug === match.slug));
  return page && (page.is_visible || preview) ? page : page ? null : undefined;
}
