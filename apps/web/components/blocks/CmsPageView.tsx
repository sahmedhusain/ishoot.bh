import type { ReactNode } from "react";
import { getReviews, getStudioEquipment } from "@platform/database";
import { pickText } from "@platform/database/constants/languages";
import type { CmsPageRecord } from "@platform/database/queries/cms-pages";
import { getSite } from "../../lib/site";
import { collectionHref } from "../../lib/site-copy";
import { ExecutiveCtaBanner } from "../about/ExecutiveCtaBanner";
import { Reveal } from "../shared/Reveal";
import { PageBlocks } from "./PageBlocks";

export async function CmsPageView({ page, locale, contact }: { page: CmsPageRecord; locale: string; contact?: ReactNode }) {
  const { website, company, info } = await getSite();
  if (!website) return null;
  const types = new Set(page.blocks.filter((block) => block.visible).map((block) => block.type));
  const [reviews, equipment] = await Promise.all([
    types.has("testimonials") ? getReviews(false) : Promise.resolve([]),
    types.has("equipment") && info.showEquipment ? getStudioEquipment() : Promise.resolve([]),
  ]);
  const content = website;
  const title = locale === "ar" ? page.title_ar || page.title_en : page.title_en || page.title_ar;
  const opensWithHero = page.blocks.find((block) => block.visible)?.type === "hero";
  const showCtaBanner =
    page.page_type === "home" &&
    !types.has("cta") &&
    (website.config.sections.find((s) => s.id === "cta")?.visible ?? true);
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
      {showCtaBanner && (
        <ExecutiveCtaBanner
          locale={locale}
          companyName={pickText(company.company_name_en, company.company_name_ar, locale)}
          catalogueHref={collectionHref(info, locale)}
        />
      )}
    </div>
  );
}

export function findPage(pages: CmsPageRecord[] | undefined, match: { type?: CmsPageRecord["page_type"]; slug?: string }, preview: boolean) {
  const page = pages?.find((p) => (match.type ? p.page_type === match.type : p.page_type === "custom" && p.slug === match.slug));
  return page && (page.is_visible || preview) ? page : page ? null : undefined;
}
