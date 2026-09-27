"use client";

import * as React from "react";
import { useTranslation } from "../../hooks/useTranslation";
import { SectionBadge } from "../shared/SectionBadge";
import { ServiceCard } from "./ServiceCard";
import { Film, Compass, Camera, Sliders, Warehouse } from "lucide-react";

export function ServicesBento() {
  const { t } = useTranslation();

  return (
    <section className="relative py-28 bg-[#050807] overflow-hidden">
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-[#014842]/15 via-[#09937F]/5 to-transparent blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 sm:px-8">
        <div className="space-y-4 max-w-2xl mb-16">
          <SectionBadge>{t("services.badge")}</SectionBadge>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white font-display">
            {t("services.title")}
          </h2>
          <p className="text-base sm:text-lg text-[#9EADA9] leading-relaxed">
            {t("services.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ServiceCard
            title={t("services.cinema.title")}
            desc={t("services.cinema.desc")}
            badge="PILLAR 01"
            icon={<Film className="w-6 h-6" />}
            bgMediaUrl="https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1200&q=80"
            className="md:col-span-2 min-h-[360px]"
          />

          <ServiceCard
            title={t("services.aerial.title")}
            desc={t("services.aerial.desc")}
            badge="PILLAR 02"
            icon={<Compass className="w-6 h-6" />}
            bgMediaUrl="https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=800&q=80"
          />

          <ServiceCard
            title={t("services.photography.title")}
            desc={t("services.photography.desc")}
            badge="PILLAR 03"
            icon={<Camera className="w-6 h-6" />}
            bgMediaUrl="https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=800&q=80"
          />

          <ServiceCard
            title={t("services.color.title")}
            desc={t("services.color.desc")}
            badge="PILLAR 04"
            icon={<Sliders className="w-6 h-6" />}
            bgMediaUrl="https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&w=800&q=80"
          />

          <ServiceCard
            title={t("services.studio.title")}
            desc={t("services.studio.desc")}
            badge="PILLAR 05"
            icon={<Warehouse className="w-6 h-6" />}
            bgMediaUrl="https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=800&q=80"
          />
        </div>
      </div>
    </section>
  );
}
