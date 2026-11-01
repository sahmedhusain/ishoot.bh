"use client";

import * as React from "react";
import type { Transition } from "framer-motion";
import { useSite } from "./SiteProvider";
import { usePathname } from "next/navigation";
import { getTranslations } from "@platform/locales";
import {
  resolveSiteMode,
  siteBaseTone,
  type SiteMode,
  type SiteRegion,
  type SiteTone,
  type WebsiteDesign,
} from "@platform/database/constants/website-design";

const ThemeContext = React.createContext<{
  design: WebsiteDesign;
  mode: SiteMode;
  setMode: (mode: SiteMode) => void;
} | null>(null);
export const useSiteTheme = () => React.useContext(ThemeContext);
const motionQuery = "(prefers-reduced-motion: reduce)";
const subscribeMotion = (changed: () => void) => {
  const query = window.matchMedia(motionQuery);
  query.addEventListener("change", changed);
  return () => query.removeEventListener("change", changed);
};
const motionSnapshot = () => window.matchMedia(motionQuery).matches;
const serverMotionSnapshot = () => true;
export function useSiteReducedMotion() {
  const theme = useSiteTheme();
  const reduced = React.useSyncExternalStore(
    subscribeMotion,
    motionSnapshot,
    serverMotionSnapshot,
  );
  return reduced || (!!theme && theme.design.motion !== "full");
}

/** Material motion profiles share spring physics and always defer to the visitor's reduced-motion setting. */
export function useSiteMotionTransition(): Transition {
  const theme = useSiteTheme();
  const reduced = useSiteReducedMotion();
  return reduced ? { duration: 0 } : theme?.design.motionScheme === "expressive" ? { type: "spring", stiffness: 180, damping: 22, mass: 0.8 } : { type: "spring", stiffness: 240, damping: 32, mass: 1 };
}

export function SiteThemeProvider({
  design,
  children,
}: {
  design: WebsiteDesign;
  children: React.ReactNode;
}) {
  const [mode, setCurrentMode] = React.useState(design.defaultMode);
  const apply = React.useCallback(
    (next: SiteMode) => {
      const root = document.documentElement;
      root.dataset.siteMode = next;
      root.dataset.siteTone = siteBaseTone(design, next);
      root.classList.remove("light", "dark");
      root.classList.add(root.dataset.siteTone);
    },
    [design],
  );
  React.useEffect(() => {
    const system = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      let saved: string | null = null;
      try {
        saved = localStorage.getItem("site-mode");
        const rawWebAppearance = JSON.parse(
          localStorage.getItem("platform_web_appearance") || "null",
        );
        if (rawWebAppearance && typeof rawWebAppearance === "object") {
          const root = document.documentElement;
          for (const key of [
            "density",
            "corners",
            "borders",
            "motion",
            "dialogPlacement",
            "backdrop",
          ]) {
            if (typeof rawWebAppearance[key] === "string") {
              root.dataset[key] = rawWebAppearance[key];
            }
          }
        }
      } catch {}
      const next = resolveSiteMode(design, saved, system.matches);
      apply(next);
      setCurrentMode(next);
    };
    sync();
    system.addEventListener("change", sync);
    window.addEventListener("storage", sync);
    return () => {
      system.removeEventListener("change", sync);
      window.removeEventListener("storage", sync);
    };
  }, [design, apply]);
  function setMode(next: SiteMode) {
    if (!design.visitorSwitching || !design.allowedModes.includes(next)) return;
    try {
      localStorage.setItem("site-mode", next);
    } catch {}
    apply(next);
    setCurrentMode(next);
  }
  return (
    <ThemeContext.Provider value={{ design, mode, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function SiteModeSwitch({ locale }: { locale: string }) {
  const theme = useSiteTheme();
  if (!theme?.design.visitorSwitching || theme.design.allowedModes.length < 2)
    return null;
  const t = getTranslations(locale as "en" | "ar");
  const names = t.common.themeModes;
  return (
    <fieldset className="site-mode-switch">
      <legend className="sr-only">
        {t.common.themeAppearance}
      </legend>
      {theme.design.allowedModes.map((mode) => (
        <button
          type="button"
          key={mode}
          aria-pressed={theme.mode === mode}
          onClick={() => theme.setMode(mode)}
        >
          {names[mode]}
        </button>
      ))}
    </fieldset>
  );
}

const ToneContext = React.createContext<SiteTone | "dark">("dark");
export const useSiteTone = () => React.useContext(ToneContext);

/** A data block can override a page; header/footer/page tones apply in mixed mode only. */
export function SiteRegion({
  region,
  tone,
  children,
  className,
  as: Tag = "div",
  id,
}: {
  region?: SiteRegion | "page";
  tone?: SiteTone;
  children: React.ReactNode;
  className?: string;
  as?: "div" | "main";
  id?: string;
}) {
  const theme = useSiteTheme();
  const site = useSite();
  const pathname = usePathname();
  const path = pathname.split("/").filter(Boolean).slice(1);
  const page: SiteRegion = !path.length
    ? "home"
    : ["cart", "checkout", "pay", "track"].includes(path[0])
      ? "store"
      : ["about", "contact", "account"].includes(path[0])
        ? (path[0] as SiteRegion)
        : path[0] === site?.collection.slug
          ? "collection"
          : path[0] === site?.articles.slug
            ? "articles"
            : "custom";
  const selected =
    tone ??
    (region
      ? theme?.design.tones[region === "page" ? page : region]
      : "inherit");
  const actualTone: SiteTone =
    selected && selected !== "inherit"
      ? selected
      : theme?.mode === "light"
        ? "light"
        : theme?.mode === "dark"
          ? "dark"
          : theme
            ? siteBaseTone(theme.design, theme.mode)
            : "dark";
  return (
    <ToneContext.Provider value={actualTone}>
      <Tag
        id={id}
        className={className}
        data-site-region={region}
        data-site-tone={selected !== "inherit" ? selected : undefined}
      >
        {children}
      </Tag>
    </ToneContext.Provider>
  );
}
