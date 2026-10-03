"use client";

import * as React from "react";
import type { ClientLogo } from "@ishoot/database/types";
import { useTranslation } from "../../hooks/useTranslation";
import { motion } from "framer-motion";

export function LogoMarquee({ logos }: { logos: ClientLogo[] }) {
  const { t, isRTL: ar } = useTranslation();
  if (!logos || !logos.length) return null;

  return (
    <section className="relative z-10 bg-[#050807] py-16 border-y border-white/10 select-none overflow-hidden">
      <div className="shell space-y-8">
        <div className="flex items-center justify-between text-xs font-sans text-[#9EADA9] border-b border-white/5 pb-4">
          <span className="font-bold text-[#5EEAD4] uppercase tracking-wider">
            &lt;&lt; {t("clients.marqueeBadge") || (ar ? "شركاء الإبداع والعلامات التجارية" : "Creative Brand Partners")} &gt;&gt;
          </span>
          <span className="text-[#09937F] font-bold">
            &lt;&lt; {t("clients.regionTag") || (ar ? "البحرين · الخليج العربي" : "Bahrain · Arabian Gulf")} &gt;&gt;
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 sm:gap-8 items-center">
          {logos.map((client, idx) => (
            <motion.div
              key={client.id}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.05 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.05 }}
              className="h-20 px-6 py-4 rounded-2xl bg-[#0B1210] border border-white/5 hover:border-[#09937F]/40 flex items-center justify-center transition-all duration-300 shadow-md group cursor-pointer"
            >
              {client.logo_svg_url ? (
                <img
                  src={client.logo_svg_url}
                  alt={client.client_name}
                  loading="lazy"
                  className="max-w-full max-h-full object-contain filter brightness-0 invert opacity-70 group-hover:opacity-100 transition-opacity duration-300"
                />
              ) : (
                <span className="font-display font-bold text-xs text-[#9EADA9] group-hover:text-white transition-colors text-center">
                  {client.client_name}
                </span>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

