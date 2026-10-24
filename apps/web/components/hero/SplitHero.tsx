"use client";

import type { HeroBanner } from "@platform/database/types";
import { safeWebsiteUrl } from "@platform/database/website-config";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "../../hooks/useTranslation";
import { ContentImage } from "../shared/ContentImage";
import { HeroActions } from "./HeroActions";

/** Headline and buttons beside the first banner's image: calm and clear, suited to products and services. */
export function SplitHero({ banners, title, subtitle }: { banners: HeroBanner[]; title: string; subtitle: string }) {
  const { t, isRTL: ar } = useTranslation();
  const reduced = useReducedMotion();
  const banner = banners[0];
  const heading = (banner && (ar ? banner.title_ar : banner.title_en)) || title;
  const text = (banner && (ar ? banner.subtitle_ar : banner.subtitle_en)) || subtitle;
  const image = banner ? safeWebsiteUrl(banner.media_type === "video" ? banner.poster_url || "" : banner.media_url) : "";
  return (
    <section id="home" data-hero="true" className="relative overflow-hidden bg-brand-base">
      <div className="shell grid items-center gap-10 pb-16 pt-32 md:pb-24 lg:grid-cols-2 lg:gap-16 lg:pt-40">
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0 : 0.45, ease: [0.2, 0, 0, 1] }}
          className="space-y-6"
        >
          <p className="web-eyebrow text-mint">{t("hero.caption")}</p>
          <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-tight text-white whitespace-pre-line sm:text-5xl lg:text-6xl">{heading}</h1>
          {text ? <p className="max-w-xl text-lg leading-relaxed text-ink-muted">{text}</p> : null}
          <div className="pt-2">
            <HeroActions banner={banner} />
          </div>
        </motion.div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-brand bg-gradient-to-br from-tone-30 to-tone-10">
          {banner?.media_type === "video" && !image ? (
            <video src={safeWebsiteUrl(banner.media_url)} muted loop playsInline autoPlay={!reduced} className="h-full w-full object-cover" />
          ) : image ? (
            <ContentImage src={image} alt="" fetchPriority="high" className="h-full w-full object-cover" />
          ) : null}
        </div>
      </div>
    </section>
  );
}
