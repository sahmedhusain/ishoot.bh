"use client";
import * as React from "react";
import Link from "next/link";
import type { HeroBanner } from "@ishoot/database/types";
import { safeWebsiteUrl } from "@ishoot/database/website-config";
import { useTranslation } from "../../hooks/useTranslation";
import { ArrowUpRight, Pause, Play } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
export function CinemaHero({ banners }: { banners: HeroBanner[] }) {
  const { locale, isRTL: ar } = useTranslation();
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
    : ar
      ? "قصص تُرى.\nوأثر يبقى."
      : "Stories in motion.\nAn impression that stays.";
  const subtitle = banner
    ? ar
      ? banner.subtitle_ar
      : banner.subtitle_en
    : ar
      ? "إنتاج مرئي من الفكرة الأولى إلى المشهد الأخير، من البحرين."
      : "Visual production from the first idea to the final frame. Based in Bahrain.";
  let href = safeWebsiteUrl(
    banner?.cta_link || "",
    `/${locale}/contact?intent=quote_request`,
  );
  if (/^\/(contact|works|about|services)([/?#]|$)/.test(href))
    href = `/${locale}${href}`;
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
              "/banners/web-banner-04.jpg",
            )}
            muted
            loop
            playsInline
            preload="metadata"
            className="w-full h-full object-cover"
          />
        ) : (
          <img
            src={safeWebsiteUrl(
              banner?.media_url || "",
              "/banners/web-banner-04.jpg",
            )}
            alt=""
            fetchPriority="high"
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050807] via-[#050807]/60 to-[#050807]/30" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#050807]/85 via-[#050807]/30 to-transparent pointer-events-none" />
        {/* Background Graphic Grid */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
            backgroundSize: "32px 32px",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute -top-40 start-1/4 w-[600px] h-[600px] bg-radial from-[#09937F]/20 via-[#014842]/10 to-transparent blur-3xl pointer-events-none"
        />
      </div>

      {/* Viewfinder Corner Framing Brackets */}
      <div className="absolute top-24 start-8 sm:start-12 w-5 h-5 border-t-2 border-s-2 border-[#09937F]/40 pointer-events-none hidden md:block" />
      <div className="absolute top-24 end-8 sm:end-12 w-5 h-5 border-t-2 border-e-2 border-[#09937F]/40 pointer-events-none hidden md:block" />

      {/* Viewfinder Telemetry HUD */}
      <div className="absolute top-24 end-8 sm:end-12 z-20 hidden sm:flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-[#09937F]/40 shadow-xl select-none">
        <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-[#5EEAD4]">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span>REC · 8K VV · 24FPS</span>
        </div>
        <span className="text-white/20">|</span>
        <span className="text-[10px] font-mono text-[#9EADA9] font-medium tracking-widest">
          SHUTTER 180°
        </span>
        <span className="text-white/20">|</span>
        <span className="text-[10px] font-mono text-[#09937F] font-bold">
          ISO 800
        </span>
      </div>

      <div className="shell relative pt-40 pb-16 md:pb-24">
        <motion.div
          key={banner?.id || "fallback"}
          initial={reduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="max-w-5xl"
        >
          <p className="web-eyebrow text-[#5EEAD4] mb-6 flex items-center gap-2">
            <span className="text-[#09937F] font-mono opacity-80">&lt;&lt;</span>
            <span>
              {ar
                ? "آي شوت / إنتاج مرئي سينمائي / البحرين"
                : "iShoot / Cinematic Production / Bahrain"}
            </span>
            <span className="text-[#09937F] font-mono opacity-80">&gt;&gt;</span>
          </p>
          <h1 className="font-display text-5xl sm:text-6xl lg:text-8xl leading-[1.04] tracking-tight font-bold whitespace-pre-line text-white">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#d4dfd8]">
              {subtitle}
            </p>
          )}
          <div className="mt-9 flex flex-wrap items-center gap-5">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link href={href} className="web-button">
                {(ar ? banner?.cta_label_ar : banner?.cta_label_en) ||
                  (ar ? "ناقش مشروعك" : "Tell us your idea")}
                <ArrowUpRight className="w-4 h-4 rtl:-scale-x-100" />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link
                href={`/${locale}/works`}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-[#09937F]/40 bg-white/5 hover:bg-[#09937F]/15 hover:border-[#09937F] text-white text-sm font-medium transition-all duration-300"
              >
                <span>{ar ? "استكشف أعمالنا" : "Explore our work"}</span>
                <span className="text-[#09937F] font-mono">&gt;</span>
              </Link>
            </motion.div>
          </div>
        </motion.div>
        <div className="mt-12 flex items-center justify-between gap-4 border-t border-white/20 pt-5">
          <span className="text-xs text-[#bdcec4]">
            {ar ? "من الفكرة إلى الشاشة" : "From an idea to the screen"}
          </span>
          <div className="flex items-center gap-3">
            {banners.length > 1 &&
              banners.map((item, i) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setIndex(i);
                    setPaused(true);
                  }}
                  aria-label={`${ar ? "الشريحة" : "Slide"} ${i + 1}`}
                  aria-pressed={i === index % banners.length}
                  className={`w-8 h-8 rounded-full border text-xs ${i === index % banners.length ? "bg-white text-[#162a24] border-white" : "border-white/30 text-white"}`}
                >
                  {i + 1}
                </button>
              ))}
            {(banners.length > 1 || banner?.media_type === "video") && (
              <button
                onClick={() => setPaused((p) => !p)}
                aria-label={
                  paused
                    ? ar
                      ? "تشغيل الحركة"
                      : "Resume motion"
                    : ar
                      ? "إيقاف الحركة"
                      : "Pause motion"
                }
                aria-pressed={paused}
                className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center"
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
