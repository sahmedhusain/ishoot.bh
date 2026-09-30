"use client";

import * as React from "react";
import { useTranslation } from "../../hooks/useTranslation";
import { Film, Video, Building2, Flame, Plane, Award } from "lucide-react";
import type { Statistic } from "@ishoot/database/types";

interface StatsSectionProps {
  stats: Statistic[];
}

const ICONS_MAP: Record<string, React.ElementType> = {
  Film,
  Video,
  Building2,
  Flame,
  Plane,
  Award,
};

export function StatsSection({ stats }: StatsSectionProps) {
  const { t, locale } = useTranslation();
  const isAr = locale === "ar";

  const items = stats.length > 0 ? stats : [];

  return (
    <section
      id="stats"
      className="relative py-28 bg-[#050807] text-[#F2F6F5] select-none border-t border-white/5"
    >
      <div className="shell space-y-16">
        <div className="relative w-full">
          <span aria-hidden="true" className="block h-px w-full bg-white/10" />
          <div className="mt-4 flex items-center justify-between  text-xs uppercase tracking-wider text-[#9EADA9]">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#09937F]" />
              <span>{t("stats.sectionIndex")}</span>
            </span>
            <span className="font-bold text-white">
              ({t("stats.sectionLabel")})
            </span>
            <span>© {new Date().getFullYear()}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((stat, i) => {
            const Icon = (stat.icon && ICONS_MAP[stat.icon]) ? ICONS_MAP[stat.icon] : Film;
            return (
              <div
                key={stat.id}
                className="group relative rounded-3xl bg-[#0B1210] border border-white/10 hover:border-[#09937F]/50 transition-all duration-500 p-8 space-y-4 shadow-xl hover:shadow-2xl hover:shadow-[#09937F]/10 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-[#014842]/40 border border-[#09937F]/30 flex items-center justify-center text-[#5EEAD4] group-hover:scale-110 transition-transform">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px]  text-[#9EADA9]">
                    0{i + 1}
                  </span>
                </div>

                <div>
                  <div className="text-4xl sm:text-5xl  font-bold text-white tracking-tight group-hover:text-emerald-shine transition-colors">
                    {stat.value}
                  </div>
                  <div className="mt-2 text-sm sm:text-base font-bold text-white font-sans">
                    {isAr ? stat.labelAr : stat.labelEn}
                  </div>
                  <div className="mt-1 text-xs text-[#9EADA9] font-sans leading-relaxed">
                    {isAr ? stat.subLabelAr : stat.subLabelEn}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
