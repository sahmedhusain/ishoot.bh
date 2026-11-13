"use client";

import { categoryAncestors } from "@platform/database/constants/website-commerce";
import type { PortfolioCategory } from "@platform/database";
import { pickText } from "@platform/database/constants/languages";
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
  const { locale, t } = useTranslation();

  const allCategory = {
    id: "all",
    slug: "all",
    name_en: t("store.allProducts"),
    name_ar: t("store.allProducts"),
    display_order: -1,
  };

  const categoryList = [allCategory, ...categories.filter((cat) => cat.slug !== "all")];

  return (
    <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-m3-outline-variant/60">
      {categoryList.map((cat) => {
        const isActive = activeCategory === cat.slug;
        const path = categoryAncestors(cat.slug, parents).reverse();
        const name = path
          .map((slug) => [cat, ...categories].find((category) => category.slug === slug))
          .filter(Boolean)
          .map((category) => pickText(category!.name_en, category!.name_ar, locale))
          .join(" / ");

        return (
          <button
            key={cat.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onSelect(cat.slug)}
            className={`inline-flex items-center rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition-all select-none ${
              isActive
                ? "bg-m3-primary text-m3-on-primary shadow-sm"
                : "bg-m3-surface-container-low text-m3-on-surface-variant hover:bg-m3-surface-container hover:text-m3-on-surface border border-m3-outline-variant/40"
            }`}
          >
            {name}
          </button>
        );
      })}
    </div>
  );
}
