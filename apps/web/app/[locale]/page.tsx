import { getPublicCompanySettings } from "../../lib/company";
import { getWebsite } from "../../lib/website";
import { getReviews } from "@ishoot/database";
import { CinemaHero } from "../../components/hero/CinemaHero";
import { AboutSection } from "../../components/about/AboutSection";
import { LogoMarquee } from "../../components/clients/LogoMarquee";
import { ServicesSection } from "../../components/services/ServicesSection";
import { WorksSection } from "../../components/portfolio/WorksSection";
import { StatsSection } from "../../components/about/StatsSection";
import { ReviewsSection } from "../../components/about/ReviewsSection";
import { FAQSection } from "../../components/about/FAQSection";
import { CTASection } from "../../components/about/CTASection";
import type { WebsiteSection } from "@ishoot/database/website-config";
export default async function HomePage() {
  const [website, reviews, company] = await Promise.all([
    getWebsite(),
    getReviews(false),
    getPublicCompanySettings(),
  ]);
  const components: Record<WebsiteSection, React.ReactNode> = {
    about: <AboutSection clientLogos={website.clients} company={company} />,
    clients: <LogoMarquee logos={website.clients} />,
    services: <ServicesSection services={website.services} />,
    portfolio: <WorksSection items={website.portfolio} />,
    stats: <StatsSection stats={website.stats} />,
    reviews: <ReviewsSection reviews={reviews} />,
    faq: <FAQSection faqs={website.faqs} />,
    cta: <CTASection />,
  };
  return (
    <div className="flex flex-col w-full">
      <CinemaHero banners={website.banners} />
      {website.config.sections
        .filter((section) => section.visible)
        .map((section) => (
          <div key={section.id}>{components[section.id]}</div>
        ))}
    </div>
  );
}
