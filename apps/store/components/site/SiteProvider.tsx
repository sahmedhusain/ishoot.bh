"use client";

import * as React from "react";
import { isLocale } from "@platform/locales/registry";
import { CurrencyLocaleProvider } from "@platform/ui";
import { usePathname } from "next/navigation";
import type { SiteInfo } from "../../lib/site-copy";

const SiteContext = React.createContext<SiteInfo | null>(null);

export function SiteProvider({ site, children }: { site: SiteInfo; children: React.ReactNode }) {
  const raw = usePathname().split("/")[1];
  const locale = isLocale(raw) ? raw : site.primaryLanguage;
  return <CurrencyLocaleProvider value={locale}><SiteContext.Provider value={site}>{children}</SiteContext.Provider></CurrencyLocaleProvider>;
}

export function useSite(): SiteInfo | null {
  return React.useContext(SiteContext);
}
