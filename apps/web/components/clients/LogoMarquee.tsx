"use client";

import * as React from "react";
import { useTranslation } from "../../hooks/useTranslation";
import { ClientLogo } from "@ishoot/database";

interface LogoMarqueeProps {
  logos: ClientLogo[];
}

export function LogoMarquee({ logos }: LogoMarqueeProps) {
  const { t } = useTranslation();

  if (!logos || logos.length === 0) return null;

  return (
    <section className="relative py-16 bg-[#050807] overflow-hidden select-none border-y border-white/5">
      <div className="absolute top-0 bottom-0 left-0 w-24 sm:w-44 bg-gradient-to-r from-[#050807] to-transparent z-10 pointer-events-none" />
      <div className="absolute top-0 bottom-0 right-0 w-24 sm:w-44 bg-gradient-to-l from-[#050807] to-transparent z-10 pointer-events-none" />

      <div className="shell mb-8 flex items-center justify-between text-xs  text-[#9EADA9]">
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#09937F]" />
          <span>{t("clients.marqueeBadge")}</span>
        </span>
        <span className="text-[11px] text-white/40">{t("clients.regionTag")}</span>
      </div>

      <div className="relative flex w-full overflow-hidden marquee-paused">
        <div
          className="flex w-max shrink-0 animate-marquee items-center"
          style={{ "--marquee-duration": "80s" } as React.CSSProperties}
        >
          {[0, 1].map((setIndex) => (
            <div
              key={setIndex}
              className="flex items-center shrink-0"
              style={{ gap: "6rem", paddingRight: "6rem" }}
            >
              {logos.map((client, idx) => (
                <div
                  key={`${client.id}-${idx}`}
                  className="flex items-center justify-center shrink-0 w-52 h-28 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
                >
                  {client.logo_svg_url ? (
                    <img
                      src={client.logo_svg_url}
                      alt={client.client_name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-2xl font-bold text-white/50">
                      {client.client_name}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
