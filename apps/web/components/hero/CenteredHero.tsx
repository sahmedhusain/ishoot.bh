"use client";

import type { HeroBanner } from "@platform/database/types";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "../../hooks/useTranslation";
import { HeroActions } from "./HeroActions";

/** A bold headline on the brand colour; needs no photo or video, so it also opens websites without banners. */
export function CenteredHero({ banners, title, subtitle }: { banners: HeroBanner[]; title: string; subtitle: string }) {
  const { t, isRTL: ar } = useTranslation();
  const reduced = useReducedMotion();
  const banner = banners[0];
  const heading = (banner && (ar ? banner.title_ar : banner.title_en)) || title;
  const text = (banner && (ar ? banner.subtitle_ar : banner.subtitle_en)) || subtitle;
  return (
    <section id="home" data-hero="true" className="on-media relative overflow-hidden bg-gradient-to-b from-primary-dark via-primary to-brand-base">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgb(var(--brand-accent)/0.35),transparent_60%)]" />
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduced ? 0 : 0.45, ease: [0.2, 0, 0, 1] }}
        className="shell relative flex min-h-[70svh] flex-col items-center justify-center gap-6 pb-20 pt-36 text-center"
      >
        <p className="web-eyebrow text-mint">{t("hero.caption")}</p>
        <h1 className="max-w-4xl font-display text-4xl font-bold leading-[1.06] tracking-tight text-white whitespace-pre-line sm:text-6xl lg:text-7xl">{heading}</h1>
        {text ? <p className="max-w-2xl text-lg leading-relaxed text-white/80">{text}</p> : null}
        <div className="pt-2">
          <HeroActions banner={banner} tone="brand" />
        </div>
      </motion.div>
    </section>
  );
}
