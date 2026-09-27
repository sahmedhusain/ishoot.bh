import * as React from 'react';
import { getActiveBanners, getActiveClientLogos, getPortfolioItems } from '@ishoot/database';
import { StarscastingHero } from '../../components/hero/StarscastingHero';
import { StarscastingAbout } from '../../components/about/StarscastingAbout';
import { LogoMarquee } from '../../components/clients/LogoMarquee';
import { StarscastingServices } from '../../components/services/StarscastingServices';
import { StarscastingWorks } from '../../components/portfolio/StarscastingWorks';
import { StarscastingStats } from '../../components/about/StarscastingStats';
import { StarscastingReviews } from '../../components/about/StarscastingReviews';
import { StarscastingFAQ } from '../../components/about/StarscastingFAQ';
import { StarscastingCTA } from '../../components/about/StarscastingCTA';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const [banners, clientLogos, portfolioItems] = await Promise.all([
    getActiveBanners(),
    getActiveClientLogos(),
    getPortfolioItems(),
  ]);

  return (
    <div className="flex flex-col w-full">
      {/* 1. Cinematic Hero with Dynamic Slot-Machine Kinetic Typography */}
      <StarscastingHero banners={banners} />

      {/* 2. Numbered Katana Cut Section 01: About ishoot */}
      <StarscastingAbout clientLogos={clientLogos} />

      {/* 3. Starscasting Infinite Brand Partners Marquee */}
      <LogoMarquee logos={clientLogos} />

      {/* 4. Numbered Katana Cut Section 02: Capabilities & Cinema Gear */}
      <StarscastingServices />

      {/* 5. Numbered Section 03: Curated Masterworks & 8K Cinema Lightbox */}
      <StarscastingWorks items={portfolioItems} />

      {/* 6. Numbered Section 04: Studio Metrics */}
      <StarscastingStats />

      {/* 7. Numbered Section 05: Client Testimonials */}
      <StarscastingReviews />

      {/* 8. Numbered Section 06: Frequently Asked Questions */}
      <StarscastingFAQ />

      {/* 9. Numbered Katana Cut Section 07: Closing Masterpiece CTA */}
      <StarscastingCTA />
    </div>
  );
}
