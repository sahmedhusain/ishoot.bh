"use client";

import * as React from "react";
import Link from "next/link";
import type { PublicService } from "@ishoot/database/website-config";
import { safeWebsiteUrl } from "@ishoot/database/website-config";
import { useTranslation } from "../../hooks/useTranslation";
import { SectionBadge } from "../shared/SectionBadge";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

export function ServicesSection({
  services = [],
}: {
  services?: PublicService[];
}) {
  const { t, isRTL: ar, locale } = useTranslation();
  const reduced = useReducedMotion();

  if (!services.length) return null;

  return (
    <section id="services" className="relative z-10 bg-[#050807] text-[#F2F6F5] py-24 select-none border-t border-white/10">
      {/* Background Graphic Grid */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 pointer-events-none opacity-15"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
          backgroundSize: "32px 32px",
        }}
      />

      <div className="shell relative z-10 space-y-12">
        <div className="grid md:grid-cols-2 gap-8 items-end pb-8 border-b border-white/10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-3"
          >
            <SectionBadge>{t("services.badge")}</SectionBadge>
            <h2 className="text-3xl sm:text-5xl font-display font-bold tracking-tight text-white leading-tight">
              {t("services.title")}
            </h2>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-sm sm:text-base text-[#9EADA9] font-sans leading-relaxed max-w-lg"
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
              transition={{ duration: 0.4, delay: index * 0.08 }}
              className="group grid md:grid-cols-[4rem_1fr_1.4fr_auto] items-start gap-6 py-8 sm:py-10 hover:bg-white/[0.02] px-4 -mx-4 rounded-2xl transition-colors"
            >
              <div className="font-sans font-bold text-xs text-[#09937F] pt-1">
                &lt;&lt; {String(index + 1).padStart(2, "0")} &gt;&gt;
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-bold font-display text-white group-hover:text-[#5EEAD4] transition-colors">
                  {ar ? service.nameAr : service.nameEn}
                </h3>
                {service.imageUrl && (
                  <div className="mt-4 w-full max-w-xs aspect-[16/9] overflow-hidden rounded-xl border border-white/10 bg-[#0B1210]">
                    <img
                      loading="lazy"
                      src={safeWebsiteUrl(service.imageUrl)}
                      alt={ar ? service.nameAr : service.nameEn}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                )}
              </div>

              <p className="text-xs sm:text-sm leading-relaxed text-[#9EADA9] font-sans max-w-xl">
                {ar ? service.descriptionAr : service.descriptionEn}
              </p>

              <div className="pt-1">
                <Link
                  href={`/${locale}/contact?intent=quote_request&service=${encodeURIComponent(service.id)}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#09937F]/15 hover:bg-[#09937F]/25 text-[#5EEAD4] border border-[#09937F]/40 text-xs font-semibold transition-all shadow-sm"
                >
                  <span>{t("cta.requestTreatment") || (ar ? "اطلب عرضاً" : "Request Quote")}</span>
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

