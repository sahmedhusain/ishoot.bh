"use client";

import * as React from "react";
import type { Transition } from "framer-motion";
import { Check, ChevronDown, Moon, Sparkles, Sun } from "lucide-react";
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
  const availableModes = React.useMemo<SiteMode[]>(
    () =>
      design.allowedModes.includes("mixed")
        ? ["light", "dark", "mixed"]
        : ["light", "dark"],
    [design.allowedModes],
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
      const next =
        saved && availableModes.includes(saved as SiteMode)
          ? (saved as SiteMode)
          : resolveSiteMode(design, saved, system.matches);
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
  }, [design, apply, availableModes]);
  function setMode(next: SiteMode) {
    if (!availableModes.includes(next)) return;
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

const MODE_ICONS: Record<SiteMode, typeof Sun> = {
  light: Sun,
  dark: Moon,
  mixed: Sparkles,
};

export function SiteModeSwitch({
  locale,
  placement = "up",
}: {
  locale: string;
  placement?: "up" | "down";
}) {
  const theme = useSiteTheme();
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!theme) return null;

  const modes: SiteMode[] = theme.design.allowedModes.includes("mixed")
    ? ["light", "dark", "mixed"]
    : ["light", "dark"];
  const t = getTranslations(locale as "en" | "ar");
  const names = t.common.themeModes;
  const CurrentIcon = MODE_ICONS[theme.mode] ?? Sparkles;
  const menuPosition =
    placement === "up" ? "bottom-full mb-2 end-0" : "top-full mt-2 end-0";

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        data-testid="appearance-switcher"
        aria-label={t.common.themeAppearance}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 min-h-9 px-3.5 py-2 rounded-full border border-m3-outline-variant bg-m3-surface-container-high text-m3-on-surface text-xs font-medium hover:border-m3-primary transition-colors cursor-pointer"
      >
        <CurrentIcon
          className="w-4 h-4 shrink-0 text-m3-primary"
          aria-hidden="true"
        />
        <span>{names[theme.mode]}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t.common.themeAppearance}
          className={`absolute ${menuPosition} z-[95] min-w-44 rounded-xl border border-m3-outline-variant bg-m3-surface-container-high p-1.5 shadow-xl text-m3-on-surface`}
        >
          {modes.map((m) => {
            const Icon = MODE_ICONS[m] ?? Sparkles;
            const active = theme.mode === m;
            return (
              <button
                key={m}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  theme.setMode(m);
                  setOpen(false);
                }}
                className={`no-btn-shape w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  active
                    ? "bg-m3-secondary-container text-m3-on-secondary-container font-semibold"
                    : "text-m3-on-surface hover:bg-m3-surface-container-highest"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{names[m]}</span>
                </span>
                {active && (
                  <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const ToneContext = React.createContext<SiteTone | "dark">("dark");
export const useSiteTone = () => React.useContext(ToneContext);

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
