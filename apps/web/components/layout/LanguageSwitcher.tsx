"use client";

import { usePathname, useRouter } from "next/navigation";
import { Select } from "@platform/ui";
import { LANGUAGES, isLocale } from "@platform/locales/registry";
import { useTranslation } from "../../hooks/useTranslation";

export function LanguageSwitcher() {
  const { locale, site, t } = useTranslation();
  const pathname = usePathname() || "";
  const router = useRouter();
  const languages = LANGUAGES.filter((language) => (site?.languages ?? ["en", "ar"]).includes(language.code));
  if (languages.length < 2) return null;
  return <Select value={locale} aria-label={t("common.language")} className="w-36 text-sm" onChange={(event) => {
    const next = event.target.value;
    if (!isLocale(next)) return;
    const path = pathname.startsWith(`/${locale}`) ? pathname.replace(`/${locale}`, `/${next}`) : `/${next}${pathname}`;
    router.push(`${path}${window.location.search}`);
  }}>{languages.map((language) => <option key={language.code} value={language.code} lang={language.code}>{language.name}</option>)}</Select>;
}
