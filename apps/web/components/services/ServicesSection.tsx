"use client";
import { ContentImage } from "../shared/ContentImage";

import Link from "next/link";
import type { PublicService } from "@platform/database/website-config";
import { safeWebsiteUrl } from "@platform/database/website-config";
import { useTranslation } from "../../hooks/useTranslation";
import { SectionBadge } from "../shared/SectionBadge";
import { ArrowUpRight } from "lucide-react";
import { motion,useReducedMotion } from "framer-motion";

export function ServicesSection({
  services = [],
}: {
  services?: PublicService[];
}) {
  const { t, isRTL: ar, locale } = useTranslation();
  const reduced = useReducedMotion();

  if (!services.length) return null;

  return (
    <section
      id="services"
      className="relative z-20 bg-brand-surface text-ink py-20 sm:py-28 border-t border-white/10"
    >
      <div className="shell relative z-10 space-y-12">
        <div className="grid md:grid-cols-2 gap-8 items-end pb-8 border-b border-white/10">
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: reduced ? 0 : 0.45, ease: [0.2, 0, 0, 1] }}
            className="space-y-3"
          >
            <SectionBadge>{t("services.badge")}</SectionBadge>
            <h2 className="text-3xl sm:text-5xl font-display font-bold tracking-tight text-white leading-tight">
              {t("services.title")}
            </h2>
          </motion.div>

          <motion.p
            initial={reduced ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: reduced ? 0 : 0.45,
              ease: [0.2, 0, 0, 1],
              delay: 0,
            }}
            className="text-sm sm:text-base text-ink-muted font-sans leading-relaxed max-w-lg"
          >
            {t("services.subtitle")}
          </motion.p>
        </div>

        <div className="divide-y divide-white/10">
          {services.map((service, index) => (
            <motion.article
              key={service.id}
              initial={reduced ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: reduced ? 0 : 0.4,
                ease: [0.2, 0, 0, 1],
                delay: reduced ? 0 : Math.min(index * 0.08, 0.2),
              }}
              className="group grid md:grid-cols-[4rem_1fr_1.4fr_auto] items-start gap-6 py-8 sm:py-10 hover:bg-white/[0.02] px-4 -mx-4 rounded-2xl transition-colors"
            >
              <div className="font-sans font-bold text-xs text-accent pt-1">
                {String(index + 1).padStart(2, "0")}
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-bold font-display text-white group-hover:text-mint transition-colors">
                  {ar ? service.nameAr : service.nameEn}
                </h3>
                {service.imageUrl && (
                  <div className="mt-4 w-full max-w-xs aspect-[16/9] overflow-hidden rounded-xl border border-white/10 bg-brand-surface">
                    <ContentImage
                      loading="lazy"
                      src={safeWebsiteUrl(service.imageUrl)}
                      alt={ar ? service.nameAr : service.nameEn}
                      className="w-full h-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.025]"
                    />
                  </div>
                )}
              </div>

              <p className="text-xs sm:text-sm leading-relaxed text-ink-muted font-sans max-w-xl">
                {ar ? service.descriptionAr : service.descriptionEn}
              </p>

              <div className="pt-1">
                <Link
                  href={`/${locale}/contact?intent=quote_request&service=${encodeURIComponent(service.id)}`}
                  className="inline-flex items-center gap-2 min-h-11 px-4 py-2 rounded-md bg-accent/15 hover:bg-accent/25 text-mint border border-accent/40 text-xs font-semibold transition-colors shadow-sm"
                >
                  <span>{t("cta.requestTreatment")}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 rtl:-scale-x-100" />
                </Link>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
