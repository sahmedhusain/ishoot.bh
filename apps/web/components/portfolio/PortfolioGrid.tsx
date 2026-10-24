"use client";

import * as React from "react";
import { PortfolioItem, PortfolioCategory } from "@platform/database";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { CategoryTabs } from "./CategoryTabs";
import { CollectionCard, collectionGridClass } from "./CollectionCard";
import type { CollectionLayout } from "@platform/database/website-presets";
import { CinemaLightbox } from "./CinemaLightbox";

interface PortfolioGridProps {
  items: PortfolioItem[];
  categories: PortfolioCategory[];
  layout: CollectionLayout;
}

export function PortfolioGrid({ items, categories, layout }: PortfolioGridProps) {
  const reduced = useReducedMotion();
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

      <motion.div
        layout={!reduced}
        className={collectionGridClass(layout)}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {filteredItems.map((item) => (
            <motion.div
              key={item.id}
              layout={!reduced}
              initial={reduced ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: reduced ? 0 : 0.25,
                ease: [0.2, 0, 0, 1],
              }}
            >
              <CollectionCard item={item} layout={layout} onOpen={setSelectedItem} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      <CinemaLightbox
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
}
