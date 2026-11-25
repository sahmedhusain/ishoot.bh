"use client";

import type { WebsiteSnapshot } from "@platform/database";
import { useTranslation } from "../../hooks/useTranslation";
import { Reveal } from "../shared/Reveal";

export function StatsSection({ stats }: { stats: WebsiteSnapshot["stats"] }) {
  const { t, isArabic: ar } = useTranslation();
  if (!stats || !stats.length) return null;

  return (
    <section className="relative z-40 bg-m3-surface text-m3-on-surface py-20 sm:py-28 select-none border-t border-m3-outline-variant">
      <div className="shell space-y-12">
        <Reveal className="relative p-5 sm:p-10 rounded-[var(--md-sys-shape-corner-extra-large,28px)] bg-m3-surface-container-low border border-m3-outline-variant shadow-m3-1 overflow-hidden">
          <div className="relative z-10 flex items-center justify-between pb-6 mb-6 border-b border-m3-outline-variant text-xs font-sans text-m3-on-surface-variant">
            <div className="flex items-center gap-2 font-bold text-m3-primary uppercase tracking-wider">
              {t("about.stats.badge")}
            </div>
          </div>

          <div
            className={`relative z-10 grid gap-4 sm:gap-6 ${
              stats.length === 3 || stats.length === 6 || stats.length === 5
                ? "grid-cols-2 lg:grid-cols-3"
                : "grid-cols-2 md:grid-cols-4"
            }`}
          >
            {stats.map((stat) => (
              <Reveal
                key={stat.id}
                className="p-4 sm:p-6 rounded-[var(--md-sys-shape-corner-large,16px)] bg-m3-surface-container border border-m3-outline-variant text-center space-y-2.5"
              >
                {(stat.subLabelAr || stat.subLabelEn) && (
                  <div className="text-xs font-bold text-m3-primary font-sans">
                    {ar ? stat.subLabelAr : stat.subLabelEn}
                  </div>
                )}
                <div>
                  <div className="text-3xl sm:text-5xl font-extrabold text-m3-on-surface font-display tracking-tight tabular-nums">
                    {stat.value}
                  </div>
                  <div className="text-xs sm:text-sm font-semibold text-m3-on-surface-variant font-sans mt-2">
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
