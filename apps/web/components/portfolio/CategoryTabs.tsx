"use client";

import * as React from "react";
import { PortfolioCategory } from "@ishoot/database";
import { useLocale } from "../../hooks/useLocale";

interface CategoryTabsProps {
  categories: PortfolioCategory[];
  activeCategory: string;
  onSelect: (slug: string) => void;
}

export function CategoryTabs({
  categories,
  activeCategory,
  onSelect,
}: CategoryTabsProps) {
  const { isRTL } = useLocale();

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 py-4">
      {[
        {
          id: "all",
          slug: "all",
          name_en: "All work",
          name_ar: "جميع الأعمال",
          display_order: -1,
        },
        ...categories.filter((cat) => cat.slug !== "all"),
      ].map((cat) => {
        const isActive = activeCategory === cat.slug;
        const name = isRTL ? cat.name_ar : cat.name_en;

        return (
          <button
            key={cat.id}
            aria-pressed={isActive}
            onClick={() => onSelect(cat.slug)}
            className={`px-5 py-2 rounded-full text-xs sm:text-sm font-medium transition-colors duration-200 ${
              isActive
                ? "bg-[#09937F] text-white"
                : "bg-white/5 hover:bg-white/10 text-[#9EADA9] hover:text-white border border-white/10"
            }`}
          >
            {name}
          </button>
        );
      })}
    </div>
  );
}
