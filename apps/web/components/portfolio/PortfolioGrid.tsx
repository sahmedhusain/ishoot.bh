"use client";

import * as React from "react";
import { PortfolioItem, PortfolioCategory } from "@ishoot/database";
import { CategoryTabs } from "./CategoryTabs";
import { PortfolioCard } from "./PortfolioCard";
import { CinemaLightbox } from "./CinemaLightbox";

interface PortfolioGridProps {
  items: PortfolioItem[];
  categories: PortfolioCategory[];
}

export function PortfolioGrid({ items, categories }: PortfolioGridProps) {
  const [activeCategory, setActiveCategory] = React.useState("all");
  const [selectedItem, setSelectedItem] = React.useState<PortfolioItem | null>(
    null,
  );

  const filteredItems = React.useMemo(() => {
    if (activeCategory === "all") return items;
    const cat = categories.find((c) => c.slug === activeCategory);
    if (!cat) return items;
    return items.filter((item) => item.category_id === cat.id);
  }, [items, categories, activeCategory]);

  return (
    <div className="space-y-12">
      <CategoryTabs
        categories={categories}
        activeCategory={activeCategory}
        onSelect={(slug) => setActiveCategory(slug)}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {filteredItems.map((item) => (
          <PortfolioCard
            key={item.id}
            item={item}
            onClick={(selected) => setSelectedItem(selected)}
          />
        ))}
      </div>

      <CinemaLightbox
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
}
