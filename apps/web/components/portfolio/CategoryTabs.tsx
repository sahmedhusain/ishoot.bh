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
    <div className="flex flex-wrap items-center gap-2 pb-4">
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
        const name = path
          .map((slug) => [cat, ...categories].find((category) => category.slug === slug))
          .filter(Boolean)
          .map((category) => (isArabic ? category!.name_ar : category!.name_en))
          .join(" / ");

        return (
          <button
            key={cat.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onSelect(cat.slug)}
            className={`relative max-w-full break-words text-start min-h-11 px-4 py-2 rounded-[var(--md-sys-shape-corner-small,8px)] text-xs sm:text-sm font-sans font-semibold transition-colors duration-150 select-none border cursor-pointer ${
              isActive
                ? "bg-m3-secondary-container text-m3-on-secondary-container border-transparent"
                : "bg-transparent text-m3-on-surface-variant border-m3-outline hover:bg-m3-on-surface/[0.08] hover:text-m3-on-surface"
            }`}
          >
            {name}
          </button>
        );
      })}
    </div>
  );
}
