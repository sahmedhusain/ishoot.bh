"use client";

import { useSiteReducedMotion } from "../site/SiteTheme";
import * as React from "react";
import { useTranslation } from "../../hooks/useTranslation";
import { ArrowUp } from "lucide-react";

export function BackToTop() {
  const reduced = useSiteReducedMotion();
  const { t, isRTL } = useTranslation();
  const [isVisible, setIsVisible] = React.useState(false);
  const [scrollProgress, setScrollProgress] = React.useState(0);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const totalScroll =
        document.documentElement.scrollHeight - window.innerHeight;

      setIsVisible(scrollY > 400);

      if (totalScroll > 0) {
        setScrollProgress(Math.min(1, Math.max(0, scrollY / totalScroll)));
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: reduced ? "instant" : "smooth",
    });
  };

  if (!mounted) return null;

  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - scrollProgress * circumference;

  const label = t("common.backToTop");

  return (
    <button
      type="button"
      data-testid="back-to-top"
      onClick={scrollToTop}
      aria-label={label}
      aria-hidden={!isVisible}
      tabIndex={isVisible ? 0 : -1}
      title={label}
      className={`fixed bottom-6 sm:bottom-8 z-[70] flex items-center justify-center w-12 h-12 rounded-full transition-[opacity,transform,background-color,border-color,box-shadow] duration-200 ease-standard group cursor-pointer ${
        isRTL ? "left-6 sm:left-8" : "right-6 sm:right-8"
      } ${
        isVisible
          ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
          : "opacity-0 scale-75 translate-y-4 pointer-events-none"
      } bg-m3-primary-container text-m3-on-primary-container border border-m3-outline-variant shadow-m3-3 hover:shadow-m3-4 active:scale-95`}
    >
      <svg
        aria-hidden="true"
        className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none p-1"
        viewBox="0 0 48 48"
      >
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          stroke="rgb(var(--m3-color-outline-variant) / 0.55)"
          strokeWidth="2.5"
        />
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          stroke="rgb(var(--m3-color-primary))"
          strokeWidth="2.5"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-150 ease-out"
        />
      </svg>

      <ArrowUp className="w-5 h-5 text-m3-on-primary-container group-hover:-translate-y-0.5 transition-transform duration-200" />
    </button>
  );
}
