"use client";

import * as React from "react";
import { useTranslation } from "../../hooks/useTranslation";

export function StatsCounter() {
  const { t } = useTranslation();

  const stats = [
    { label: t("about.statFilms"), number: "180+" },
    { label: t("about.statYears"), number: "8+" },
    { label: t("about.statAwards"), number: "14" },
    { label: t("about.statClients"), number: "65+" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-12 border-y border-white/10 my-16">
      {stats.map((stat, idx) => (
        <div key={idx} className="text-center space-y-2">
          <div className="text-4xl sm:text-5xl font-extrabold text-[#09937F] font-mono tracking-tight">
            {stat.number}
          </div>
          <div className="text-xs sm:text-sm text-[#9EADA9] max-w-[140px] mx-auto leading-snug">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}
