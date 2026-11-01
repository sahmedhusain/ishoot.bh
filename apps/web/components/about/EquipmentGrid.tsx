"use client";
import { useSiteReducedMotion } from "../site/SiteTheme";

import * as React from "react";
import { StudioEquipment } from "@platform/database";
import { useTranslation } from "../../hooks/useTranslation";
import { SectionBadge } from "../shared/SectionBadge";
import { motion, AnimatePresence } from "framer-motion";

interface EquipmentGridProps {
  equipment: StudioEquipment[];
}

export function EquipmentGrid({ equipment }: EquipmentGridProps) {
  const reduced = useSiteReducedMotion();
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = React.useState<string>("");

  const categories = [
    { id: "", label: t("about.gearAll") },
    ...Array.from(new Set(equipment.map((item) => item.category).filter(Boolean))).map((category) => ({ id: category, label: category })),
  ];

  const filteredEquipment =
    selectedCategory === ""
      ? equipment
      : equipment.filter((eq) => eq.category === selectedCategory);

  return (
    <section className="relative z-30 bg-m3-surface text-ink py-20 sm:py-28 border-t border-m3-outline-variant">
      <div className="shell space-y-10">
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: reduced ? 0 : 0.45 }}
          className="space-y-3"
        >
          <SectionBadge className="!text-accent-pressed">
            {t("about.gearTitle")}
          </SectionBadge>
          <h3 className="text-3xl sm:text-5xl font-bold tracking-tight text-ink font-display">
            {t("about.gearSubtitle")}
          </h3>
        </motion.div>

        {/* Category Buttons */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{
            duration: reduced ? 0 : 0.4,
            delay: reduced ? 0 : 0.08,
          }}
          className="flex flex-wrap gap-3 font-sans"
        >
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              aria-pressed={selectedCategory === cat.id}
              className={`min-h-11 rounded-full px-4 py-2 text-xs font-semibold transition-colors duration-150 cursor-pointer ${selectedCategory === cat.id
                ? "bg-m3-secondary-container text-m3-on-secondary-container border border-m3-primary"
                : "bg-m3-surface-container-low text-m3-on-surface-variant hover:text-m3-on-surface border border-m3-outline-variant"
                }`}
            >
              <span>{cat.label}</span>
            </button>
          ))}
        </motion.div>

        {/* Equipment Cards Grid */}
        <motion.div
          layout={!reduced}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <AnimatePresence>
            {filteredEquipment.map((gear, idx) => (
              <motion.div
                key={gear.id}
                layout={!reduced}
                initial={reduced ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: reduced ? 0 : 0.25,
                  delay: reduced ? 0 : Math.min(idx * 0.04, 0.16),
                }}
                className="group relative rounded-2xl bg-m3-surface-container-low border border-m3-outline-variant hover:border-m3-primary/50 p-6 transition-all flex flex-col justify-between space-y-6 overflow-hidden"
              >
                <div className="space-y-3 relative z-10">
                  <div className="flex items-center justify-between font-sans">
                    <span className="text-[11px] uppercase font-semibold tracking-wider text-m3-on-secondary-container bg-m3-secondary-container px-3 py-1 rounded-full">
                      {categories.find((c) => c.id === gear.category)?.label ||
                        gear.category.replace("_", " ")}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-lg sm:text-2xl font-bold text-m3-on-surface group-hover:text-m3-primary transition-colors font-display">
                      {gear.model_name}
                    </h4>
                    <p className="mt-1 text-xs sm:text-sm text-m3-on-surface-variant font-sans leading-relaxed">
                      {gear.specification}
                    </p>
                  </div>
                </div>

              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
