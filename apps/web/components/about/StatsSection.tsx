"use client";

import * as React from "react";
import { useTranslation } from "../../hooks/useTranslation";
import { Film, Video, Building2, Flame } from "lucide-react";

export function StatsSection() {
  const { t } = useTranslation();

  const items = t("stats.items") as unknown as Array<{
    value: string;
    label: string;
    sub: string;
  }>;

  const icons = [Film, Video, Building2, Flame];

  return (
    <section
      id="stats"
      className="relative py-28 bg-[#050807] text-[#F2F6F5] select-none border-t border-white/5"
    >
      <div className="shell space-y-16">
        <div className="relative w-full">
          <span aria-hidden="true" className="block h-px w-full bg-white/10" />
          <div className="mt-4 flex items-center justify-between font-mono text-xs uppercase tracking-wider text-[#9EADA9]">
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
          {(Array.isArray(items) ? items : []).map((stat, i) => {
            const Icon = icons[i] ?? Film;
            return (
              <div
                key={i}
                className="group relative rounded-3xl bg-[#0B1210] border border-white/10 hover:border-[#09937F]/50 transition-all duration-500 p-8 space-y-4 shadow-xl hover:shadow-2xl hover:shadow-[#09937F]/10 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-[#014842]/40 border border-[#09937F]/30 flex items-center justify-center text-[#5EEAD4] group-hover:scale-110 transition-transform">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono text-[#9EADA9]">
                    0{i + 1}
                  </span>
                </div>

                <div>
                  <div className="text-4xl sm:text-5xl font-mono font-bold text-white tracking-tight group-hover:text-emerald-shine transition-colors">
                    {stat.value}
                  </div>
                  <div className="mt-2 text-sm sm:text-base font-bold text-white font-sans">
                    {stat.label}
                  </div>
                  <div className="mt-1 text-xs text-[#9EADA9] font-sans leading-relaxed">
                    {stat.sub}
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
