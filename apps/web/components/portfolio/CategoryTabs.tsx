"use client";

import { PortfolioCategory } from "@platform/database";
import { useTranslation } from "../../hooks/useTranslation";

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
  const { t, isRTL } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-2 pb-6 border-b border-white/10">
      {[
        {
          id: "all",
          slug: "all",
          name_en: t("portfolio.allWork"),
          name_ar: t("portfolio.allWork"),
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
            className={`relative min-h-11 px-5 py-2 rounded-md text-xs sm:text-sm font-sans tracking-wide transition-colors duration-150 select-none ${
              isActive
                ? "text-white font-semibold bg-[var(--web-accent)] border border-[var(--web-accent)]"
                : "text-[#9EADA9] hover:text-[#F2F6F5] bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-white/20"
            }`}
          >
            {name}
          </button>
        );
      })}
    </div>
  );
}
