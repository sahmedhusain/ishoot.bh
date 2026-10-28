import { Promotions } from "../../../components/store/Promotions";
import { catalogueProductPrices } from "@platform/database/queries/store";
import { storeEnabled } from "../../../lib/customer";
import { Reveal } from "../../../components/shared/Reveal";
import { isWebsitePreview } from "../../../lib/website";
import { notFound, permanentRedirect } from "next/navigation";
import { PortfolioGrid } from "../../../components/portfolio/PortfolioGrid";
import { SectionBadge } from "../../../components/shared/SectionBadge";
import { getSite, siteTranslations } from "../../../lib/site";
import { collectionHref } from "../../../lib/site-copy";
import { CmsPageView, findPage } from "../../../components/blocks/CmsPageView";
import { ArticlesIndex, liveArticles } from "../../../components/articles/ArticleViews";

/** The website's catalogue at the address chosen in the website settings (works, products, menu…). */
export default async function CollectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; collection: string }>;
  searchParams: Promise<{ category?: string; q?: string; page?: string }>;
}) {
  const { locale, collection } = await params;
  const [{ website, config, info }, isPreview, t, query] = await Promise.all([getSite(), isWebsitePreview(), siteTranslations(locale), searchParams]);
  if (!website) notFound();
  // The same address level also holds the articles list and the company's own pages.
  if (collection === info.articles.slug && collection !== info.collection.slug)
    return <ArticlesIndex articles={liveArticles(website.articles)} locale={locale} base={`/${locale}/${info.articles.slug}`} query={query} />;
  if (collection !== info.collection.slug) {
    const page = findPage(website.pages, { slug: collection }, isPreview);
    if (page) return <CmsPageView page={page} locale={locale} />;
  }
  // Links shared before the catalogue was renamed still arrive.
  if (collection !== info.collection.slug) {
    if (collection === "works") permanentRedirect(collectionHref(info, locale));
    notFound();
  }

  const pageVisible = config.pages.find((p) => p.id === "works")?.visible ?? true;
  if (!pageVisible && !isPreview) {
    notFound();
  }

  const prices = await storeEnabled() ? await catalogueProductPrices(website.portfolio.map(item => item.id)) : new Map<string, number>();
  const items = website.portfolio.map(item => prices.has(item.id) ? { ...item, price: prices.get(item.id) } : item);
  const categories = website.categories ?? Array.from(
    new Map(
      items
        .filter((item) => item.category)
        .map((item) => [item.category!.id, item.category!]),
    ).values(),
  );

  return (
    <div className="relative min-h-screen bg-brand-base text-ink overflow-hidden">
      <div className="shell relative z-10 page-heading">
        <Reveal className="space-y-5 max-w-3xl mb-12 sm:mb-16">
          <SectionBadge>{t.portfolio.badge}</SectionBadge>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white font-display">
            {t.portfolio.title}
          </h1>
          <p className="text-base sm:text-lg text-ink-muted leading-relaxed">
            {t.portfolio.subtitle}
          </p>
        </Reveal>

      </div>
      <Promotions locale={locale} placement="catalogue" category={typeof query.category === "string" ? query.category : ""} />
      <div className="shell pb-16">
        <PortfolioGrid items={items} categories={categories} layout={info.collection.layout} />
      </div>
    </div>
  );
}
