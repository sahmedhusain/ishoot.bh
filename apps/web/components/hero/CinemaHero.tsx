"use client";
import {ContentImage} from "../shared/ContentImage";
import * as React from "react";
import Link from "next/link";
import type { HeroBanner } from "@ishoot/database/types";
import { safeWebsiteUrl } from "@ishoot/database/website-config";
import { useTranslation } from "../../hooks/useTranslation";
import { ArrowUpRight, Pause, Play } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
export function CinemaHero({ banners }: { banners: HeroBanner[] }) {
  const { t, locale, isRTL: ar } = useTranslation();
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const [visible, setVisible] = React.useState(true);
  const reduced = useReducedMotion();
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
      8000,
    );
    return () => clearInterval(timer);
  }, [moving, banners.length]);
  React.useEffect(() => {
    if (moving) video.current?.play().catch(() => {});
    else video.current?.pause();
  }, [moving, banner?.id]);
  const title = banner
    ? ar
      ? banner.title_ar
      : banner.title_en
    : "";
  const subtitle = banner
    ? ar
      ? banner.subtitle_ar
      : banner.subtitle_en
    : "";
  let href = safeWebsiteUrl(
    banner?.cta_link || "",
    `/${locale}/contact?intent=quote_request`,
  );
  if (/^\/(contact|works|about|services)([/?#]|$)/.test(href))
    href = `/${locale}${href}`;
  if (!banner) return null;
  return (
    <section
      ref={section}
      id="home"
      data-hero="true"
      className="relative min-h-[88svh] flex items-end bg-[#101b16] overflow-hidden"
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
        <div className="absolute inset-0 bg-gradient-to-t from-[#050807] via-[#050807]/60 to-[#050807]/30" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#050807]/85 via-[#050807]/30 to-transparent pointer-events-none" />
      </div>

      <div className="shell relative pt-40 pb-16 md:pb-24">
        <motion.div
          key={banner?.id || "fallback"}
          initial={reduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0 : 0.45, ease: [0.2, 0, 0, 1] }}
          className="max-w-5xl"
        >
          <p className="web-eyebrow text-[#5EEAD4] mb-6">{t("hero.eyebrow")}</p>
          <h1 className="font-display text-5xl sm:text-6xl lg:text-8xl leading-[1.04] tracking-tight font-bold whitespace-pre-line text-white">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#d4dfd8]">
              {subtitle}
            </p>
          )}
          <div className="mt-9 flex flex-wrap items-center gap-5">
            <div>
              <Link href={href} className="web-button">
                {(ar ? banner?.cta_label_ar : banner?.cta_label_en) ||
                  t("hero.ideaAction")}
                <ArrowUpRight className="w-4 h-4 rtl:-scale-x-100" />
              </Link>
            </div>
            {href.replace(/[?#].*$/, "") !== `/${locale}/works` && (
              <div>
                <Link href={`/${locale}/works`} className="web-hero-secondary">
                  <span>{t("hero.explore")}</span>
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
          <span className="text-xs text-[#bdcec4]">{t("hero.caption")}</span>
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
                  className={`w-11 h-11 rounded-full border text-xs transition-colors duration-150 ${i === index % banners.length ? "bg-white text-[#162a24] border-white" : "border-white/30 text-white"}`}
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
