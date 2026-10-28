"use client";

import * as React from "react";
import type { HeroBanner } from "@platform/database/types";
import { safeWebsiteUrl } from "@platform/database/website-config";
import { motion } from "framer-motion";
import { Pause, Play } from "lucide-react";
import { useSiteReducedMotion, useSiteMotionTransition, useSiteTheme } from "../site/SiteTheme";
import { useTranslation } from "../../hooks/useTranslation";
import { ContentImage } from "../shared/ContentImage";
import { HeroActions, useHeroContent } from "./HeroActions";

export function SplitHero({ banners, title, subtitle }: { banners: HeroBanner[]; title: string; subtitle: string }) {
  const { t } = useTranslation();
  const reduced = useSiteReducedMotion();
  const transition = useSiteMotionTransition();
  const theme = useSiteTheme();
  const banner = banners[0];
  const { heading, subtitle: text } = useHeroContent(banner, title, subtitle);
  const media = safeWebsiteUrl(banner?.media_url ?? "");
  const poster = safeWebsiteUrl(banner?.poster_url ?? "");
  const video = React.useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = React.useState(false);
  React.useEffect(() => {
    const sync = () => { if (reduced || paused || document.hidden) video.current?.pause(); else void video.current?.play().catch(() => {}); };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, [reduced, paused, media]);
  return <section id="home" data-hero="true" data-hero-height={theme?.design.heroHeight ?? "comfortable"} className="site-hero site-hero-split relative overflow-hidden bg-brand-base pt-28 pb-6 sm:pt-32 sm:pb-10">
    <div className="shell">
      <div className="site-hero-content grid items-stretch gap-3 rounded-brand border border-m3-outline-variant bg-m3-surface-container p-3 lg:grid-cols-[1.05fr_1fr]">
        <motion.div initial={reduced ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={transition} className="flex flex-col justify-center gap-6 px-4 py-10 sm:px-9 lg:py-14">
          <p className="web-eyebrow text-m3-primary">{t("hero.caption")}</p>
          <h1 className="max-w-3xl whitespace-pre-line break-words font-display text-4xl font-bold leading-[1.06] tracking-tight text-m3-on-surface sm:text-5xl xl:text-7xl">{heading}</h1>
          {text && <p className="max-w-xl text-base leading-relaxed text-m3-on-surface-variant sm:text-lg">{text}</p>}
          <div className="pt-3"><HeroActions banner={banner} /></div>
        </motion.div>
        <motion.div initial={reduced ? false : { opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={transition} className="relative min-h-72 overflow-hidden rounded-brand bg-m3-primary-container sm:min-h-96 lg:min-h-full">
          {media ? banner?.media_type === "video" ? <video ref={video} src={media} poster={poster || undefined} muted loop playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover" /> : <ContentImage src={media} alt="" fetchPriority="high" className="absolute inset-0 h-full w-full object-cover" /> : <div aria-hidden="true" className="site-hero-brand-shapes"><span /><span /><span /></div>}
          {banner?.media_type === "video" && media && <button type="button" onClick={() => setPaused((value) => !value)} aria-label={paused || reduced ? t("hero.resume") : t("hero.pause")} aria-pressed={paused} disabled={reduced} className="absolute bottom-4 end-4 flex h-12 w-12 items-center justify-center rounded-full bg-m3-surface text-m3-on-surface shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-m3-primary">{paused || reduced ? <Play aria-hidden="true" className="h-4 w-4" /> : <Pause aria-hidden="true" className="h-4 w-4" />}</button>}
        </motion.div>
      </div>
    </div>
  </section>;
}
