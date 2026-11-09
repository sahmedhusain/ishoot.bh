"use client";
import { useSiteReducedMotion, useSiteMotionTransition, useSiteTheme } from "../site/SiteTheme";

import type { HeroBanner } from "@platform/database/types";
import { motion } from "framer-motion";
import { useTranslation } from "../../hooks/useTranslation";
import { HeroActions, useHeroContent } from "./HeroActions";

export function CenteredHero({ banners, title, subtitle }: { banners: HeroBanner[]; title: string; subtitle: string }) {
  const { t } = useTranslation();
  const theme = useSiteTheme();
  const transition = useSiteMotionTransition();
  const reduced = useSiteReducedMotion();
  const banner = banners[0];
  const { heading, subtitle: text } = useHeroContent(banner, title, subtitle);
  return (
    <section id="home" data-hero="true" data-hero-height={theme?.design.heroHeight ?? "comfortable"} className="site-hero site-hero-centered relative overflow-hidden bg-m3-surface-container text-m3-on-surface">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgb(var(--brand-accent)/0.35),transparent_60%)]" />
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={transition}
        className="shell relative flex site-hero-content flex-col items-center justify-center gap-6 pb-20 pt-36 text-center"
      >
        <p className="web-eyebrow text-mint">{t("hero.caption")}</p>
        <h1 className="max-w-4xl font-display text-4xl font-bold leading-[1.06] tracking-tight text-m3-on-surface whitespace-pre-line sm:text-6xl lg:text-7xl">{heading}</h1>
        {text ? <p className="max-w-2xl text-lg leading-relaxed text-m3-on-surface-variant">{text}</p> : null}
        <div className="pt-2">
          <HeroActions banner={banner}  />
        </div>
      </motion.div>
    </section>
  );
}
