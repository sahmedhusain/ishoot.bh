"use client";

import * as React from "react";
import { useTranslation } from "../../hooks/useTranslation";
import { SectionBadge } from "../shared/SectionBadge";

export function CEOHero() {
  const { t, isRTL } = useTranslation();

  return (
    <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-12 items-center py-12">
      <div className="lg:col-span-5 relative">
        <div className="relative aspect-[3/4] rounded-3xl overflow-hidden bg-[#0B1210] border border-[#09937F]/30 shadow-2xl">
          <div
            className="w-full h-full bg-cover bg-top"
            style={{
              backgroundImage:
                "url(https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80)",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050807] via-transparent to-transparent opacity-80" />

          <div className="absolute bottom-6 left-6 right-6 p-4 rounded-xl bg-black/60 backdrop-blur-md border border-white/10">
            <div className="text-xs text-[#09937F] font-mono uppercase tracking-wider">
              {t("about.ceoTitle")}
            </div>
            <div className="text-xl font-bold text-white mt-0.5">
              {t("about.ceoName")}
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-7 space-y-6">
        <SectionBadge>{t("about.badge")}</SectionBadge>
        <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white font-display">
          {t("about.title")}
        </h2>
        <p className="text-base sm:text-lg text-[#9EADA9] leading-relaxed">
          {t("about.subtitle")}
        </p>

        <blockquote className="p-6 rounded-2xl bg-[#0B1210] border-l-4 border-[#09937F] text-lg sm:text-xl font-serif italic text-white/90 leading-relaxed my-6">
          {t("about.ceoQuote")}
        </blockquote>

        <p className="text-sm text-[#9EADA9] leading-relaxed">
          {t("about.storyP1")}
        </p>
      </div>
    </div>
  );
}
