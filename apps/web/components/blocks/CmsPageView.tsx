import type { ReactNode } from "react";
import Link from "next/link";
import { getReviews, getStudioEquipment } from "@platform/database";
import { pickText } from "@platform/database/constants/languages";
import type { CmsPageRecord } from "@platform/database/queries/cms-pages";
import { getSite, siteTranslations } from "../../lib/site";
import { collectionHref } from "../../lib/site-copy";
import { ExecutiveCtaBanner } from "../about/ExecutiveCtaBanner";
import { FAQSection } from "../about/FAQSection";
import { ArticlesIndex, liveArticles } from "../articles/ArticleViews";
import { Reveal } from "../shared/Reveal";
import { PageBlocks } from "./PageBlocks";

export async function CmsPageView({ page, locale, contact }: { page: CmsPageRecord; locale: string; contact?: ReactNode }) {
  const [{ website, company, info }, t] = await Promise.all([getSite(), siteTranslations(locale)]);
  if (!website) return null;
  const visibleBlocks = page.blocks.filter((block) => block.visible);
  const types = new Set(visibleBlocks.map((block) => block.type));
  const [reviews, equipment] = await Promise.all([
    types.has("testimonials") ? getReviews(false) : Promise.resolve([]),
    types.has("equipment") && info.showEquipment ? getStudioEquipment() : Promise.resolve([]),
  ]);
  const content = website;
  const title = locale === "ar" ? page.title_ar || page.title_en : page.title_en || page.title_ar;
  const description = locale === "ar"
    ? page.seo_description_ar || page.seo_description_en
    : page.seo_description_en || page.seo_description_ar;
  const opensWithHero = visibleBlocks[0]?.type === "hero";
  const showCtaBanner =
    page.page_type === "home" &&
    !types.has("cta") &&
    (website.config.sections.find((s) => s.id === "cta")?.visible ?? true);

  const isEmptyBlocks = visibleBlocks.length === 0;
  const isInsightsFallback = isEmptyBlocks && (page.slug === "insights" || page.slug === "articles" || page.slug === "news");
  const isFaqFallback = isEmptyBlocks && page.slug === "faq";
  const isGenericFallback = isEmptyBlocks && !isInsightsFallback && !isFaqFallback && !contact;

  return (
    <div className={`${page.page_type === "home" ? "home-page " : ""}flex flex-col w-full min-h-screen bg-brand-base text-ink`}>
      {page.page_type === "custom" && !opensWithHero && !isInsightsFallback && (
        <header className="shell page-heading pb-0">
          <Reveal>
            <h1 className="max-w-4xl text-4xl sm:text-6xl font-display font-bold leading-[1.08] tracking-tight text-ink">
              {title}
            </h1>
            {description && (
              <p className="mt-4 max-w-2xl text-base sm:text-lg text-ink-muted leading-relaxed">
                {description}
              </p>
            )}
          </Reveal>
        </header>
      )}

      {visibleBlocks.length > 0 && (
        <PageBlocks
          blocks={page.blocks}
          context={{
            home: page.page_type === "home",
            locale,
            website: content,
            company,
            reviews,
            equipment,
            contact,
            showEquipment: info.showEquipment,
            articlesBase: `/${locale}/${info.articles.slug}`,
          }}
        />
      )}

      {isInsightsFallback && (
        <ArticlesIndex
          articles={liveArticles(website.articles ?? [])}
          locale={locale}
          base={`/${locale}/${info.articles.slug}`}
          query={{}}
        />
      )}

      {isFaqFallback && (
        <div className="pt-8">
          <FAQSection faqs={website.faqs ?? []} />
        </div>
      )}

      {isGenericFallback && (
        <section className="shell py-14 space-y-6">
          <div className="rounded-3xl border border-m3-outline-variant bg-m3-surface-container-low p-6 sm:p-10 space-y-4">
            <p className="text-base text-ink-muted leading-relaxed max-w-3xl">
              {description || pickText(company.tagline_en, company.tagline_ar, locale)}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link href={collectionHref(info, locale)} className="web-button">
                {t.nav.works}
              </Link>
              <Link href={`/${locale}/contact`} className="web-hero-secondary">
                {t.nav.contact}
              </Link>
            </div>
          </div>
        </section>
      )}

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
