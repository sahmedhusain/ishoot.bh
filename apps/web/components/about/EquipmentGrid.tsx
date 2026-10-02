"use client";

import * as React from "react";
import { StudioEquipment } from "@ishoot/database";
import { useTranslation } from "../../hooks/useTranslation";
import { SectionBadge } from "../shared/SectionBadge";
import { Camera, Aperture, Sun, Sliders, Warehouse, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface EquipmentGridProps {
  equipment: StudioEquipment[];
}

export function EquipmentGrid({ equipment }: EquipmentGridProps) {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");

  const categories = [
    { id: "all", label: t("about.gearAll") },
    {
      id: "cameras",
      label: t("about.gearCameras"),
      icon: <Camera className="w-4 h-4" />,
    },
    {
      id: "lenses",
      label: t("about.gearLenses"),
      icon: <Aperture className="w-4 h-4" />,
    },
    {
      id: "lighting",
      label: t("about.gearLighting"),
      icon: <Sun className="w-4 h-4" />,
    },
    {
      id: "audio_grading",
      label: t("about.gearAudioGrading"),
      icon: <Sliders className="w-4 h-4" />,
    },
    {
      id: "stages",
      label: t("about.gearStages"),
      icon: <Warehouse className="w-4 h-4" />,
    },
  ];

  const filteredEquipment =
    selectedCategory === "all"
      ? equipment
      : equipment.filter((eq) => eq.category === selectedCategory);

  return (
    <section className="katana-top relative z-30 bg-[#F8FAFC] text-[#0F172A] py-28 select-none border-t border-slate-200">
      <div className="shell space-y-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="space-y-3"
        >
          <SectionBadge>{t("about.gearTitle")}</SectionBadge>
          <h3 className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-950 font-display">
            {t("about.gearSubtitle")}
          </h3>
        </motion.div>

        {/* Category Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-wrap gap-3 font-sans"
        >
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? "bg-[#014842] text-white border border-[#09937F] shadow-lg"
                  : "bg-white text-slate-700 hover:text-slate-950 border border-slate-200 shadow-2xs"
              }`}
            >
              <span>&lt;&lt; {cat.label} &gt;&gt;</span>
            </button>
          ))}
        </motion.div>

        {/* Equipment Cards Grid */}
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AnimatePresence>
            {filteredEquipment.map((gear, idx) => (
              <motion.div
                key={gear.id}
                layout
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                whileHover={{ y: -4, transition: { type: "spring", stiffness: 300, damping: 20 } }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                className="group relative rounded-3xl bg-white border border-slate-200 hover:border-[#09937F] transition-all p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-xl cursor-pointer overflow-hidden"
              >
                <div className="space-y-3 relative z-10">
                  <div className="flex items-center justify-between font-sans">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[#014842] bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                      &lt;&lt; {categories.find((c) => c.id === gear.category)?.label || gear.category.replace("_", " ")} &gt;&gt;
                    </span>
                    <span className="text-[10px] font-bold text-[#014842]">
                      &lt;&lt; {t("about.gear.calibrated")} &gt;&gt;
                    </span>
                  </div>

                  <div>
                    <h4 className="text-lg sm:text-2xl font-bold text-slate-900 group-hover:text-[#014842] transition-colors font-display">
                      {gear.model_name}
                    </h4>
                    <p className="mt-1 text-xs sm:text-sm text-slate-600 font-sans leading-relaxed">
                      {gear.specification}
                    </p>
                  </div>
                </div>

                {gear.daily_rate_bhd && (
                  <div className="relative z-10 pt-4 border-t border-slate-100 flex items-center justify-between font-sans">
                    <span className="text-xs text-slate-500">{t("about.dailyRental")}</span>
                    <div className="text-sm font-bold text-[#014842]">
                      {gear.daily_rate_bhd.toFixed(3)} {t("financials.currency")}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
