import * as React from 'react';
import { getPortfolioItems, getPortfolioCategories } from '@ishoot/database';
import { PortfolioGrid } from '../../../components/portfolio/PortfolioGrid';
import { SectionBadge } from '../../../components/shared/SectionBadge';
import { getTranslations, Locale } from '@ishoot/locales';

export default async function WorksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale as Locale);

  const [items, categories] = await Promise.all([
    getPortfolioItems(),
    getPortfolioCategories(),
  ]);

  return (
    <div className="py-20 max-w-7xl mx-auto px-6 sm:px-8">
      {/* Page Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto mb-16">
        <SectionBadge>{t.portfolio.badge}</SectionBadge>
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white font-display">
          {t.portfolio.title}
        </h1>
        <p className="text-base sm:text-lg text-[#9EADA9] leading-relaxed">
          {t.portfolio.subtitle}
        </p>
      </div>

      {/* Interactive Filterable Works Grid */}
      <PortfolioGrid items={items} categories={categories} />
    </div>
  );
}
