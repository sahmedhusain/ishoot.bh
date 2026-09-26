'use client';

import * as React from 'react';
import { PortfolioCategory } from '@ishoot/database';
import { useLocale } from '../../hooks/useLocale';

interface CategoryTabsProps {
  categories: PortfolioCategory[];
  activeCategory: string;
  onSelect: (slug: string) => void;
}

export function CategoryTabs({ categories, activeCategory, onSelect }: CategoryTabsProps) {
  const { isRTL } = useLocale();

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 py-4">
      {categories.map((cat) => {
        const isActive = activeCategory === cat.slug;
        const name = isRTL ? cat.name_ar : cat.name_en;

        return (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.slug)}
            className={`px-5 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 ${
              isActive
                ? 'bg-[#09937F] text-white shadow-lg shadow-[#09937F]/25 scale-105'
                : 'bg-white/5 hover:bg-white/10 text-[#9EADA9] hover:text-white border border-white/10'
            }`}
          >
            {name}
          </button>
        );
      })}
    </div>
  );
}
