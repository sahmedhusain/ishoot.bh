"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslation } from "../../hooks/useTranslation";
import { ArrowUpRight, Film, Compass, Palette, Building } from "lucide-react";

type ServiceItem = {
  id: string;
  number: string;
  title: string;
  desc: string;
  specs: string[];
  image: string;
};

const SERVICE_IMAGES: Record<string, string> = {
  commercial: "/banners/Youtube cover-02.jpg",
  aerial: "/banners/Youtube cover-03.jpg",
  color: "/banners/Youtube cover-04.jpg",
  soundstage: "/banners/Web Banner 04.jpg",
};

const SERVICE_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  commercial: Film,
  aerial: Compass,
  color: Palette,
  soundstage: Building,
};

export function ServicesSection() {
  const { t, locale } = useTranslation();

  const serviceKeys = ["commercial", "aerial", "color", "soundstage"] as const;

  const services: ServiceItem[] = serviceKeys.map((key, i) => {
    const item = t(`services.${key}`) as unknown as Omit<ServiceItem, "image">;
    return {
      ...item,
      image: SERVICE_IMAGES[key] ?? "",
    };
  });

  return (
    <section
      id="services"
      className="relative py-28 bg-[#050807] text-[#F2F6F5] select-none border-t border-white/5"
    >
      <div className="shell space-y-16">
        <div className="relative w-full">
          <span aria-hidden="true" className="block h-px w-full bg-white/10" />
          <div className="mt-4 flex items-center justify-between font-mono text-xs uppercase tracking-wider text-[#9EADA9]">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#09937F]" />
              <span>{t("services.sectionIndex")}</span>
            </span>
            <span className="font-bold text-white">
              ({t("services.sectionLabel")})
            </span>
            <span>© {new Date().getFullYear()}</span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white font-display">
              {t("services.headline")}
            </h2>
            <p className="text-sm sm:text-base text-[#9EADA9] leading-relaxed">
              {t("services.subtitle")}
            </p>
          </div>

          <Link
            href={`/${locale}/contact`}
            className="group inline-flex items-center gap-2 font-mono text-xs font-bold text-[#09937F] hover:text-[#5EEAD4] transition-colors"
          >
            <span>{t("services.requestProposal")}</span>
            <ArrowUpRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {services.map((item) => {
            const Icon = SERVICE_ICONS[item.id] ?? Film;
            return (
              <div
                key={item.id}
                className="group relative rounded-3xl bg-[#0B1210] border border-white/10 hover:border-[#09937F]/50 transition-all duration-500 overflow-hidden flex flex-col justify-between shadow-2xl p-7 sm:p-9 space-y-8"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-0 group-hover:opacity-15 transition-opacity duration-700 ease-out -z-0"
                  style={{ backgroundImage: `url('${item.image}')` }}
                />

                <div className="relative z-10 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-[#014842] border border-[#09937F]/40 flex items-center justify-center text-[#5EEAD4] shadow-lg group-hover:rotate-6 transition-transform">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="font-mono text-xs text-[#9EADA9] font-bold">
                      ({item.number})
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xl sm:text-2xl font-bold text-white group-hover:text-[#5EEAD4] transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#9EADA9] leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>

                <div className="relative z-10 pt-4 border-t border-white/5 flex flex-wrap items-center gap-2">
                  {(item.specs || []).map((spec, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-full text-[10px] font-mono font-medium bg-white/5 text-[#9EADA9] border border-white/10 group-hover:border-[#09937F]/30 group-hover:text-white transition-colors"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
