import { Reveal } from "../../../components/shared/Reveal";
import { isWebsitePreview } from "../../../lib/website";
import { notFound, permanentRedirect } from "next/navigation";
import { PortfolioGrid } from "../../../components/portfolio/PortfolioGrid";
import { SectionBadge } from "../../../components/shared/SectionBadge";
import { getSite, siteTranslations } from "../../../lib/site";
import { collectionHref } from "../../../lib/site-copy";

/** The website's catalogue at the address chosen in the website settings (works, products, menu…). */
export default async function CollectionPage({
  params,
}: {
  params: Promise<{ locale: string; collection: string }>;
}) {
  const { locale, collection } = await params;
  const [{ website, config, info }, isPreview, t] = await Promise.all([getSite(), isWebsitePreview(), siteTranslations(locale)]);
  if (!website) notFound();
  // Links shared before the catalogue was renamed still arrive.
  if (collection !== info.collection.slug) {
    if (collection === "works") permanentRedirect(collectionHref(info, locale));
    notFound();
  }

  const pageVisible = config.pages.find((p) => p.id === "works")?.visible ?? true;
  if (!pageVisible && !isPreview) {
    notFound();
  }

  const items = website.portfolio;
  const categories = Array.from(
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

        <PortfolioGrid items={items} categories={categories} layout={info.collection.layout} />
      </div>
    </div>
  );
}
