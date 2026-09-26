import * as React from 'react';
import Link from 'next/link';
import { getActiveBanners, getActiveClientLogos, getPortfolioItems } from '@ishoot/database';
import { getTranslations, Locale } from '@ishoot/locales';
import { HeroBanner } from '../../components/hero/HeroBanner';
import { ShowreelReveal } from '../../components/showreel/ShowreelReveal';
import { ServicesBento } from '../../components/services/ServicesBento';
import { LogoMarquee } from '../../components/clients/LogoMarquee';
import { PortfolioGrid } from '../../components/portfolio/PortfolioGrid';
import { SectionBadge } from '../../components/shared/SectionBadge';
import { Button } from '@ishoot/ui';
import { ArrowRight, ArrowLeft } from 'lucide-react';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale as Locale);
  const isRTL = locale === 'ar';

  const [banners, clientLogos, portfolioItems] = await Promise.all([
    getActiveBanners(),
    getActiveClientLogos(),
    getPortfolioItems(),
  ]);

  const featuredItems = portfolioItems.filter((item) => item.is_featured);
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <div className="flex flex-col w-full">
      {/* 1. Cinematic Hero Video Carousel */}
      <HeroBanner banners={banners} />

      {/* 2. Apple-style Pinned Scroll Showreel Reveal */}
      <ShowreelReveal />

      {/* 3. 5-Pillar Capabilities Bento Grid */}
      <ServicesBento />

      {/* 4. Selected Featured Works Preview */}
      <section className="py-28 max-w-7xl mx-auto px-6 sm:px-8 w-full space-y-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4 max-w-xl">
            <SectionBadge>{t.portfolio.badge}</SectionBadge>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white font-display">
              {t.portfolio.title}
            </h2>
            <p className="text-base sm:text-lg text-[#9EADA9] leading-relaxed">
              {t.portfolio.subtitle}
            </p>
          </div>
          <Link href={`/${locale}/works`}>
            <Button variant="secondary" size="md" className="group">
              <span>{isRTL ? 'عرض جميع الأعمال' : 'View Full Archive'}</span>
              <ArrowIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {featuredItems.slice(0, 4).map((item) => (
            <Link key={item.id} href={`/${locale}/works/${item.slug}`}>
              <div className="group relative overflow-hidden rounded-2xl bg-[#0B1210] border border-white/10 hover:border-[#09937F]/50 transition-all duration-500 cursor-pointer shadow-xl aspect-video">
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-105"
                  style={{ backgroundImage: `url(${item.thumbnail_url})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-80 group-hover:opacity-95 transition-opacity" />
                <div className="absolute bottom-0 left-0 right-0 p-6 space-y-2">
                  <div className="flex items-center justify-between text-xs text-[#09937F] font-mono tracking-widest uppercase">
                    <span>{item.client_name}</span>
                    <span>{item.year}</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight group-hover:text-[#09937F] transition-colors">
                    {isRTL ? item.title_ar : item.title_en}
                  </h3>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 5. Infinite Brand Logo Marquee */}
      <LogoMarquee logos={clientLogos} />
    </div>
  );
}
