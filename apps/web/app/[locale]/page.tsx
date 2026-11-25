import { getReviews, getStudioEquipment } from "@platform/database";
import { pickText } from "@platform/database/constants/languages";
import { getSite } from "../../lib/site";
import { ShowcaseHero } from "../../components/hero/ShowcaseHero";
import { SplitHero } from "../../components/hero/SplitHero";
import { CenteredHero } from "../../components/hero/CenteredHero";
import { AboutSection } from "../../components/about/AboutSection";
import { PillarsOfCraft } from "../../components/about/PillarsOfCraft";
import { EquipmentGrid } from "../../components/about/EquipmentGrid";
import { ExecutiveCtaBanner } from "../../components/about/ExecutiveCtaBanner";
import { LogoMarquee } from "../../components/clients/LogoMarquee";
import { ServicesSection } from "../../components/services/ServicesSection";
import { WorksSection } from "../../components/portfolio/WorksSection";
import { StatsSection } from "../../components/about/StatsSection";
import { ReviewsSection } from "../../components/about/ReviewsSection";
import { FAQSection } from "../../components/about/FAQSection";
import { collectionHref } from "../../lib/site-copy";
import { synthesizeHeroBanners } from "../../lib/format-site";
import type { WebsiteSection } from "@platform/database/website-config";
import { notFound } from "next/navigation";
import { isWebsitePreview } from "../../lib/website";
import { CmsPageView, findPage } from "../../components/blocks/CmsPageView";
import { ScrollReveal } from "../../components/shared/ScrollReveal";

const REVEAL_SECTIONS: readonly WebsiteSection[] = ["clients", "services", "portfolio", "reviews", "faq"];

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const [{ website: snapshot, company, info }, reviews, equipment, preview] = await Promise.all([
    getSite(),
    getReviews(false),
    getStudioEquipment().catch(() => []),
    isWebsitePreview(),
  ]);
  if (!snapshot) return null;
  const page = findPage(snapshot.pages, { type: "home" }, preview);
  if (page === null) notFound();
  if (page && page.blocks.length > 0) return <CmsPageView page={page} locale={locale} />;
  const website = snapshot;
  const catalogueItems = website.portfolio ?? [];
  const name = pickText(company.company_name_en, company.company_name_ar, locale);
  const tagline = pickText(company.tagline_en, company.tagline_ar, locale);
  const banners = synthesizeHeroBanners({
    banners: website.banners,
    companyNameEn: company.company_name_en,
    companyNameAr: company.company_name_ar,
    taglineEn: company.tagline_en,
    taglineAr: company.tagline_ar,
    services: website.services,
    portfolio: website.portfolio,
    collectionSlug: info.collection.slug,
  });
  const heroStyle = info.heroStyle;
  const config = website.config ?? {
    aboutImageUrl: undefined,
    pillars: [],
    sections: [],
  };
  const components: Record<WebsiteSection, React.ReactNode> = {
    about: (
      <>
        <AboutSection imageUrl={config.aboutImageUrl} clientLogos={website.clients ?? []} company={company} />
        <PillarsOfCraft pillars={config.pillars ?? []} />
      </>
    ),
    clients: <LogoMarquee logos={website.clients ?? []} />,
    services: <ServicesSection services={website.services ?? []} />,
    portfolio: <WorksSection items={catalogueItems} categories={website.categories ?? []} />,
    stats: <StatsSection stats={website.stats ?? []} />,
    reviews: <ReviewsSection reviews={reviews ?? []} />,
    faq: <FAQSection faqs={website.faqs ?? []} />,
    cta: null,
  };
  const sections = (config.sections ?? [])
    .filter((section) => section.visible && section.id !== "cta");
  const showCtaBanner = config.sections?.find((s) => s.id === "cta")?.visible ?? true;
  return (
    <div className="home-page flex flex-col w-full">
      {heroStyle === "cinematic" ? (
        <ShowcaseHero banners={banners} companyName={{ en: company.company_name_en, ar: company.company_name_ar }} />
      ) : heroStyle === "split" ? (
        <SplitHero banners={banners} title={name} subtitle={tagline} />
      ) : (
        <CenteredHero banners={banners} title={name} subtitle={tagline} />
      )}
      {sections.map((section) => (
        <div key={section.id} data-reveal={REVEAL_SECTIONS.includes(section.id) ? "" : undefined}>
          {components[section.id]}
        </div>
      ))}
      {equipment.length > 0 && (
        <div data-reveal="">
          <EquipmentGrid equipment={equipment} />
        </div>
      )}
      {showCtaBanner && (
        <ExecutiveCtaBanner
          locale={locale}
          companyName={name}
          catalogueHref={collectionHref(info, locale)}
        />
      )}
      <ScrollReveal />
    </div>
  );
}
