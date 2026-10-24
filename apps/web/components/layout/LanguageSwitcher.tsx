"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "../../hooks/useTranslation";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
  const { t, locale, site } = useTranslation();
  const pathname = usePathname() || "";
  // A company that writes in one language has nothing to switch to.
  if (site && site.languages.length < 2) return null;

  const targetLocale = locale === "en" ? "ar" : "en";
  const targetPathname = pathname.startsWith(`/${locale}`)
    ? pathname.replace(`/${locale}`, `/${targetLocale}`)
    : `/${targetLocale}${pathname}`;

  return (
    <Link
      href={targetPathname}
      className="inline-flex min-h-11 items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-white/90 hover:text-white bg-tone-5/85 hover:bg-tone-5 border border-white/20 transition-colors duration-150"
      title={t("nav.switchLang")}
    >
      <Globe className="w-3.5 h-3.5 text-mint" />
      <span>{t("nav.switchLang")}</span>
    </Link>
  );
}
