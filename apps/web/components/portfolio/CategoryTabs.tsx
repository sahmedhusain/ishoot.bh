"use client";

import { categoryAncestors } from "@platform/database/constants/website-commerce";
import { PortfolioCategory } from "@platform/database";
import { useTranslation } from "../../hooks/useTranslation";

interface CategoryTabsProps {
  categories: PortfolioCategory[];
  parents?: Record<string, string>;
  activeCategory: string;
  onSelect: (slug: string) => void;
}

export function CategoryTabs({
  categories,
  activeCategory,
  onSelect,
  parents = {},
}: CategoryTabsProps) {
  const { isArabic, t } = useTranslation();

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
        const path = categoryAncestors(cat.slug, parents).reverse();
        const name = path.map(slug => [cat, ...categories].find(category => category.slug === slug)).filter(Boolean).map(category => isArabic ? category!.name_ar : category!.name_en).join(" / ");

        return (
          <button
            key={cat.id}
            aria-pressed={isActive}
            onClick={() => onSelect(cat.slug)}
            className={`relative max-w-full break-words text-start min-h-11 px-5 py-2 rounded-md text-xs sm:text-sm font-sans tracking-wide transition-colors duration-150 select-none ${isActive
              ? "text-m3-on-primary font-semibold bg-m3-primary border border-m3-primary"
              : "text-ink-muted hover:text-ink bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-white/20"
              }`}
          >
            {name}
          </button>
        );
      })}
    </div>
  );
}
