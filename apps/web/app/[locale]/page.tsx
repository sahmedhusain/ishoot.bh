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
import type { WebsiteSection } from "@ishoot/database/website-config";
export default async function HomePage() {
  const [website, reviews, company] = await Promise.all([
    getWebsite(),
    getReviews(false),
    getPublicCompanySettings(),
  ]);
  const components: Record<WebsiteSection, React.ReactNode> = {
    about: <AboutSection imageUrl={website.config.aboutImageUrl} clientLogos={website.clients} company={company} />,
    clients: <LogoMarquee logos={website.clients} />,
    services: <ServicesSection services={website.services} />,
    portfolio: <WorksSection items={website.portfolio} />,
    stats: <StatsSection stats={website.stats} />,
    reviews: <ReviewsSection reviews={reviews} />,
    faq: <FAQSection faqs={website.faqs} />,
    cta: null, // The shared footer provides the closing project enquiry.
  };
  let lightBand = 0;
  const sections = website.config.sections
    .filter((section) => section.visible && section.id !== "cta")
    .map((section) => {
      if (
        section.id === "about" ||
        section.id === "portfolio" ||
        section.id === "reviews"
      )
        lightBand += 1;
      return {
        ...section,
        slope: lightBand % 2 === 0 && lightBand > 0 ? "right" : "left",
      };
    });
  return (
    <div className="home-page flex flex-col w-full">
      <CinemaHero banners={website.banners} companyName={{ en: company.company_name_en, ar: company.company_name_ar }} />
      {sections.map((section) => (
        <div key={section.id} data-slope={section.slope}>
          {components[section.id]}
        </div>
      ))}
    </div>
  );
}
