"use client";
import { useSiteReducedMotion, useSiteMotionTransition, useSiteTheme } from "../site/SiteTheme";
import { useHeroContent } from "./HeroActions";
import { ContentImage } from "../shared/ContentImage";
import * as React from "react";
import Link from "next/link";
import type { HeroBanner } from "@platform/database/types";
import { safeWebsiteUrl } from "@platform/database/website-config";
import { useTranslation } from "../../hooks/useTranslation";
import { collectionHref } from "../../lib/site-copy";
import { ArrowUpRight, Pause, Play } from "lucide-react";
import { motion } from "framer-motion";

export function ShowcaseHero({ banners, companyName }: { banners: HeroBanner[]; companyName: { en: string; ar: string } }) {
  const { t, locale, site } = useTranslation();
  const catalogue = site ? collectionHref(site, locale) : `/${locale}/works`;
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const [visible, setVisible] = React.useState(true);
  const reduced = useSiteReducedMotion();
  const theme = useSiteTheme();
  const transition = useSiteMotionTransition();
  const section = React.useRef<HTMLElement>(null);
  const video = React.useRef<HTMLVideoElement>(null);
  const banner = banners[index % Math.max(1, banners.length)];
  const moving = !paused && reduced === false && visible;
  React.useEffect(() => {
    const observer = new IntersectionObserver((entries) =>
      setVisible(entries[0].isIntersecting && !document.hidden),
    );
    if (section.current) observer.observe(section.current);
    const update = () =>
      setVisible(
        !document.hidden &&
        !!section.current &&
        section.current.getBoundingClientRect().bottom > 0,
      );
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  React.useEffect(() => {
    if (!moving || banners.length < 2) return;
    const timer = setInterval(
      () => setIndex((i) => (i + 1) % banners.length),
      (theme?.design.bannerIntervalSeconds ?? 8) * 1000,
    );
    return () => clearInterval(timer);
  }, [moving, banners.length, theme?.design.bannerIntervalSeconds]);
  React.useEffect(() => {
    if (moving) video.current?.play().catch(() => { });
    else video.current?.pause();
  }, [moving, banner?.id]);
  const { heading: title, subtitle, primaryLabel, exploreLabel } = useHeroContent(banner, companyName[locale === "ar" ? "ar" : "en"], t("hero.fallbackSubtitle"));
  let href = safeWebsiteUrl(
    banner?.cta_link || "",
    `/${locale}/contact?intent=quote_request`,
  );
  if (/^\/works([/?#]|$)/.test(href)) href = href.replace(/^\/works/, catalogue);
  else if (/^\/(contact|about|services)([/?#]|$)/.test(href))
    href = `/${locale}${href}`;
  if (!banner) return null;
  return (
    <section
      ref={section}
      id="home"
      data-hero="true"
      data-hero-height={theme?.design.heroHeight ?? "comfortable"}
      className="on-media relative flex items-end bg-tone-10 overflow-hidden"
    >
      <div className="absolute inset-0" aria-hidden="true">
        {banner?.media_type === "video" ? (
          <video
            ref={video}
            key={banner.id}
            src={safeWebsiteUrl(banner.media_url)}
            poster={safeWebsiteUrl(
              banner.poster_url || "",
              "",
            )}
            muted
            loop
            playsInline
            preload="metadata"
            className="w-full h-full object-cover"
          />
        ) : (
          <ContentImage
            src={safeWebsiteUrl(
              banner?.media_url || "",
              "",
            )}
            alt=""
            fetchPriority="high"
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-m3-scrim" style={{ opacity: (theme?.design.heroOverlayOpacity ?? 45) / 100 }} />
        <div className="absolute inset-0 bg-gradient-to-b from-m3-scrim/50 via-m3-scrim/10 to-transparent pointer-events-none" />
      </div>

      <div className="site-hero-content shell relative pt-40 pb-16 md:pb-24">
        <motion.div
          key={banner?.id || "fallback"}
          initial={reduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={transition}
          className="max-w-5xl"
        >
          <p className="web-eyebrow text-mint mb-6">{t("hero.eyebrow", { companyName: companyName[locale === "ar" ? "ar" : "en"] })}</p>
          <h1 className="font-display text-5xl sm:text-6xl lg:text-8xl leading-[1.04] tracking-tight font-bold whitespace-pre-line text-white">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-muted">
              {subtitle}
            </p>
          )}
          <div className="mt-9 flex flex-wrap items-center gap-5">
            <div>
              <Link href={href} className="web-button">
                {primaryLabel}
                <ArrowUpRight className="w-4 h-4 rtl:-scale-x-100" />
              </Link>
            </div>
            {href.replace(/[?#].*$/, "") !== catalogue && (
              <div>
                <Link href={catalogue} className="web-hero-secondary">
                  <span>{exploreLabel}</span>
                  <ArrowUpRight
                    aria-hidden="true"
                    className="w-4 h-4 rtl:-scale-x-100"
                  />
                </Link>
              </div>
            )}
          </div>
        </motion.div>
        <div className="mt-12 flex items-center justify-between gap-4 border-t border-white/20 pt-5">
          <span className="text-xs text-ink-muted">{t("hero.caption")}</span>
          <div className="flex items-center gap-3">
            {banners.length > 1 &&
              banners.map((item, i) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setIndex(i);
                    setPaused(true);
                  }}
                  aria-label={`${t("hero.slideLabel")} ${i + 1}`}
                  aria-pressed={i === index % banners.length}
                  className={`w-11 h-11 rounded-full border text-xs transition-colors duration-150 ${i === index % banners.length ? "bg-white text-tone-15 border-white" : "border-white/30 text-white"}`}
                >
                  {i + 1}
                </button>
              ))}
            {(banners.length > 1 || banner?.media_type === "video") && (
              <button
                onClick={() => setPaused((p) => !p)}
                aria-label={paused ? t("hero.resume") : t("hero.pause")}
                aria-pressed={paused}
                className="w-11 h-11 rounded-full border border-white/30 hover:bg-white/10 transition-colors duration-150 flex items-center justify-center"
              >
                {paused ? (
                  <Play className="w-4 h-4" />
                ) : (
                  <Pause className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

