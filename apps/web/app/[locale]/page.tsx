import * as React from "react";
import {
  getActiveBanners,
  getActiveClientLogos,
  getPortfolioItems,
  getStatistics,
  getReviews,
  getFaqs,
  getCompanySettings,
} from "@ishoot/database";
import { CinemaHero } from "../../components/hero/CinemaHero";
import { AboutSection } from "../../components/about/AboutSection";
import { LogoMarquee } from "../../components/clients/LogoMarquee";
import { ServicesSection } from "../../components/services/ServicesSection";
import { WorksSection } from "../../components/portfolio/WorksSection";
import { StatsSection } from "../../components/about/StatsSection";
import { ReviewsSection } from "../../components/about/ReviewsSection";
import { FAQSection } from "../../components/about/FAQSection";
import { CTASection } from "../../components/about/CTASection";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const [banners, clientLogos, portfolioItems, stats, reviews, faqs, company] = await Promise.all([
    getActiveBanners(),
    getActiveClientLogos(),
    getPortfolioItems(),
    getStatistics(),
    getReviews(false),
    getFaqs(false),
    getCompanySettings(),
  ]);

  return (
    <div className="flex flex-col w-full">
      <CinemaHero banners={banners} />

      <AboutSection clientLogos={clientLogos} company={company} />

      <LogoMarquee logos={clientLogos} />

      <ServicesSection />

      <WorksSection items={portfolioItems} />

      <StatsSection stats={stats} />

      <ReviewsSection reviews={reviews} />

      <FAQSection faqs={faqs} />

      <CTASection />
    </div>
  );
}
