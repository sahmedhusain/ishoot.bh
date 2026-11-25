"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Check, ChevronDown, Globe } from "lucide-react";
import { LANGUAGES, isLocale } from "@platform/locales/registry";
import { useTranslation } from "../../hooks/useTranslation";

const SHORT_LABELS: Record<string, string> = {
  en: "EN",
  ar: "ع",
};

const FULL_LABELS: Record<string, string> = {
  en: "English (EN)",
  ar: "العربية (ع)",
};

export function LanguageSwitcher({
  variant = "compact",
}: {
  variant?: "compact" | "footer";
}) {
  const { locale, site, t } = useTranslation();
  const pathname = usePathname() || "";
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const languages = LANGUAGES.filter((language) =>
    (site?.languages ?? ["en", "ar"]).includes(language.code),
  );

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

  if (languages.length < 2) return null;

  const switchLocale = (next: string) => {
    setOpen(false);
    if (!isLocale(next) || next === locale) return;
    const path = pathname.startsWith(`/${locale}`)
      ? pathname.replace(`/${locale}`, `/${next}`)
      : `/${next}${pathname}`;
    const search = typeof window !== "undefined" ? window.location.search : "";
    router.push(`${path}${search}`);
  };

  const triggerLabel =
    variant === "footer"
      ? (FULL_LABELS[locale] ?? locale.toUpperCase())
      : (SHORT_LABELS[locale] ?? locale.toUpperCase());

  const menuPosition =
    variant === "footer" ? "bottom-full mb-2 end-0" : "top-full mt-2 end-0";

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        data-testid={
          variant === "footer"
            ? "language-switcher-footer"
            : "language-switcher-compact"
        }
        aria-label={t("common.language")}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={
          variant === "footer"
            ? "inline-flex items-center gap-2 min-h-9 px-3.5 py-2 rounded-full border border-m3-outline-variant bg-m3-surface-container-high text-m3-on-surface text-xs font-medium hover:border-m3-primary transition-colors cursor-pointer"
            : "inline-flex items-center gap-1.5 min-h-9 px-2.5 py-1.5 rounded-full border border-m3-outline-variant bg-m3-surface-container-low/95 text-m3-on-surface text-xs font-semibold hover:border-m3-primary transition-colors cursor-pointer"
        }
      >
        <Globe className="w-4 h-4 shrink-0 text-m3-primary" aria-hidden="true" />
        <span>{triggerLabel}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t("common.language")}
          className={`m3-menu absolute ${menuPosition} z-[95] min-w-44`}
        >
          {languages.map((language) => {
            const active = language.code === locale;
            return (
              <button
                key={language.code}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                lang={language.code}
                onClick={() => switchLocale(language.code)}
                className="m3-menu-item no-btn-shape"
              >
                <span className="flex items-center gap-2">
                  <span className="font-bold opacity-80">
                    {SHORT_LABELS[language.code] ?? language.code.toUpperCase()}
                  </span>
                  <span>—</span>
                  <span>{language.name}</span>
                </span>
                {active && <Check className="w-4 h-4 shrink-0 text-m3-primary" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
