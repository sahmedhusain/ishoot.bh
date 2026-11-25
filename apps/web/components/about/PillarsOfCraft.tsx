"use client";

import { useSiteReducedMotion } from "../site/SiteTheme";
import { useTranslation } from "../../hooks/useTranslation";
import { SectionBadge } from "../shared/SectionBadge";
import { motion } from "framer-motion";

export function PillarsOfCraft({
  pillars = [],
}: {
  pillars?: import("@platform/database/website-config").WebsitePillar[];
}) {
  const reduced = useSiteReducedMotion();
  const { t, locale } = useTranslation();

  if (!pillars.length) return null;

  return (
    <section className="relative z-10 bg-m3-surface text-m3-on-surface py-20 sm:py-28 border-t border-m3-outline-variant overflow-hidden">
      <div className="shell relative z-10 space-y-12">
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: reduced ? 0 : 0.45, ease: [0.2, 0, 0, 1] }}
          className="space-y-3"
        >
          <SectionBadge>{t("about.pillars.badge")}</SectionBadge>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-m3-on-surface font-display">
            {t("about.pillars.title")}
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pillars.map((entry, idx) => (
            <motion.div
              key={idx}
              initial={reduced ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{
                duration: reduced ? 0 : 0.45,
                delay: reduced ? 0 : Math.min(idx * 0.06, 0.18),
              }}
              className="group relative rounded-[var(--md-sys-shape-corner-large,16px)] bg-m3-surface-container-low border border-m3-outline-variant p-6 sm:p-8 flex flex-col space-y-4 transition-colors hover:border-m3-primary/50"
            >
              <div className="flex items-center justify-between font-sans">
                <span className="inline-flex items-center justify-center min-w-8 h-8 px-2.5 rounded-full bg-m3-secondary-container text-m3-on-secondary-container text-xs font-bold tabular-nums">
                  {String(idx + 1).padStart(2, "0")}
                </span>
              </div>

              <div className="space-y-2.5">
                <h3 className="text-xl sm:text-2xl font-bold text-m3-on-surface group-hover:text-m3-primary transition-colors font-display">
                  {locale === "ar" ? entry.titleAr : entry.titleEn}
                </h3>
                <p className="text-sm text-m3-on-surface-variant font-sans leading-relaxed">
                  {locale === "ar" ? entry.textAr : entry.textEn}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
