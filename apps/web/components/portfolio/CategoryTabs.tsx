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
    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 py-4 p-1.5 rounded-full bg-white/[0.02] border border-white/5 backdrop-blur-md max-w-fit mx-auto">
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
            className={`relative px-5 py-2 rounded-full text-xs sm:text-sm font-sans tracking-wide transition-all duration-300 select-none ${
              isActive
                ? "text-white font-bold bg-gradient-to-r from-[#09937F] to-[#014842] shadow-[0_0_20px_rgba(9,147,127,0.45)] border border-[#5EEAD4]/40 scale-[1.02]"
                : "text-[#9EADA9] hover:text-[#F2F6F5] bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 active:scale-95"
            }`}
          >
            {name}
          </button>
        );
      })}
    </div>
  );
}
