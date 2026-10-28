"use client";

import type { Statistic } from "@platform/database/types";
import { useTranslation } from "../../hooks/useTranslation";
import { Reveal } from "../shared/Reveal";

export function StatsSection({ stats }: { stats: Statistic[] }) {
  const { t, isArabic: ar } = useTranslation();
  if (!stats || !stats.length) return null;

  return (
    <section className="katana-top relative z-40 bg-brand-surface text-ink pt-32 sm:pt-40 pb-24 select-none border-t border-white/10">
      <div className="shell space-y-12">
        <Reveal className="relative p-5 sm:p-10 rounded-3xl bg-brand-surface border border-white/10 shadow-2xl overflow-hidden">
          {/* Background Graphic Grid */}
          <div
            aria-hidden="true"
            className="absolute inset-0 z-0 pointer-events-none opacity-10"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.2) 1px, transparent 0)`,
              backgroundSize: "24px 24px",
            }}
          />

          <div className="relative z-10 flex items-center justify-between pb-6 mb-6 border-b border-white/10 text-xs font-sans text-ink-muted">
            <div className="flex items-center gap-2 font-bold text-mint uppercase tracking-wider">
              {t("about.stats.badge")}
            </div>
          </div>

          <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8">
            {stats.map((stat) => (
              <Reveal
                key={stat.id}
                className="p-3 sm:p-6 rounded-2xl bg-white/[0.02] border border-white/5  text-center space-y-3"
              >
                {(stat.subLabelAr || stat.subLabelEn) && (
                  <div className="text-xs font-bold text-accent font-sans">
                    {ar ? stat.subLabelAr : stat.subLabelEn}
                  </div>
                )}
                <div>
                  <div className="text-3xl sm:text-5xl font-extrabold text-white  font-display tracking-tight tabular-nums">
                    {stat.value}
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-ink font-sans mt-2">
                    {ar ? stat.labelAr : stat.labelEn}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
