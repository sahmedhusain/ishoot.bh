import { getReviews, getStudioEquipment } from "@platform/database";
import { pickText } from "@platform/database/constants/languages";
import { formatMessage } from "@platform/locales";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getSite, siteTranslations } from "../../lib/site";
import { ShowcaseHero } from "../../components/hero/ShowcaseHero";
import { SplitHero } from "../../components/hero/SplitHero";
import { CenteredHero } from "../../components/hero/CenteredHero";
import { AboutSection } from "../../components/about/AboutSection";
import { PillarsOfCraft } from "../../components/about/PillarsOfCraft";
import { EquipmentGrid } from "../../components/about/EquipmentGrid";
import { LogoMarquee } from "../../components/clients/LogoMarquee";
import { ServicesSection } from "../../components/services/ServicesSection";
import { WorksSection } from "../../components/portfolio/WorksSection";
import { StatsSection } from "../../components/about/StatsSection";
import { ReviewsSection } from "../../components/about/ReviewsSection";
import { FAQSection } from "../../components/about/FAQSection";
import { collectionHref } from "../../lib/site-copy";
import type { WebsiteSection } from "@platform/database/website-config";
import { notFound } from "next/navigation";
import { isWebsitePreview } from "../../lib/website";
import { CmsPageView, findPage } from "../../components/blocks/CmsPageView";
import { ScrollReveal } from "../../components/shared/ScrollReveal";

const REVEAL_SECTIONS: readonly WebsiteSection[] = ["clients", "services", "portfolio", "reviews", "faq"];

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const [{ website: snapshot, company, info }, reviews, equipment, preview, t] = await Promise.all([
    getSite(),
    getReviews(false),
    getStudioEquipment().catch(() => []),
    isWebsitePreview(),
    siteTranslations(locale),
  ]);
  if (!snapshot) return null;
  const page = findPage(snapshot.pages, { type: "home" }, preview);
  if (page === null) notFound();
  if (page) return <CmsPageView page={page} locale={locale} />;
  const website = snapshot;
  const catalogueItems = website.portfolio;
  const name = pickText(company.company_name_en, company.company_name_ar, locale);
  const tagline = pickText(company.tagline_en, company.tagline_ar, locale);
  const heroStyle = info.heroStyle === "cinematic" && !website.banners.length ? "centered" : info.heroStyle;
  const components: Record<WebsiteSection, React.ReactNode> = {
    about: (
      <>
        <AboutSection imageUrl={website.config.aboutImageUrl} clientLogos={website.clients} company={company} />
        <PillarsOfCraft pillars={website.config.pillars} />
      </>
    ),
    clients: <LogoMarquee logos={website.clients} />,
    services: <ServicesSection services={website.services} />,
    portfolio: <WorksSection items={catalogueItems} categories={website.categories} />,
    stats: <StatsSection stats={website.stats} />,
    reviews: <ReviewsSection reviews={reviews} />,
    faq: <FAQSection faqs={website.faqs} />,
    cta: null,
  };
  const sections = website.config.sections
    .filter((section) => section.visible && section.id !== "cta");
  const showCtaBanner = website.config.sections.find((s) => s.id === "cta")?.visible ?? true;
  return (
    <div className="home-page flex flex-col w-full">
      {heroStyle === "cinematic" ? (
        <ShowcaseHero banners={website.banners} companyName={{ en: company.company_name_en, ar: company.company_name_ar }} />
      ) : heroStyle === "split" ? (
        <SplitHero banners={website.banners} title={name} subtitle={tagline} />
      ) : (
        <CenteredHero banners={website.banners} title={name} subtitle={tagline} />
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
        <section
          data-testid="executive-cta-banner"
          className="relative bg-brand-base text-ink py-20 sm:py-24 border-t border-white/10"
        >
          <div className="shell">
            <div className="rounded-3xl bg-white/[0.04] border border-white/10 p-8 sm:p-12 lg:p-16 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
              <div className="space-y-4 max-w-2xl">
                <span className="inline-block text-xs font-bold uppercase tracking-wider text-mint">
                  {t.about.credentialsBadge}
                </span>
                <h2 className="text-2xl sm:text-4xl font-display font-bold text-white leading-tight">
                  {formatMessage(t.about.executiveCtaTitle, { companyName: name })}
                </h2>
                <p className="text-sm sm:text-base text-ink-muted leading-relaxed">
                  {t.about.executiveCtaSub}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <Link href={`/${locale}/contact?intent=quote_request`} className="web-button">
                  <span>{t.about.requestConsultation}</span>
                  <ArrowUpRight aria-hidden="true" className="w-4 h-4 rtl:-scale-x-100" />
                </Link>
                <Link
                  href={collectionHref(info, locale)}
                  className="inline-flex min-h-11 items-center gap-2 rounded-brand border border-white/20 bg-white/5 hover:bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition-colors"
                >
                  <span>{t.portfolio.filterAll}</span>
                  <ArrowUpRight aria-hidden="true" className="w-4 h-4 rtl:-scale-x-100" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}
      <ScrollReveal />
    </div>
  );
}
