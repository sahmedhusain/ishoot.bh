"use client";

import * as React from "react";
import type { SiteInfo } from "../../lib/site-copy";

const SiteContext = React.createContext<SiteInfo | null>(null);

/** Shares the website's activity, languages, catalogue and form options with client components. */
export function SiteProvider({ site, children }: { site: SiteInfo; children: React.ReactNode }) {
  return <SiteContext.Provider value={site}>{children}</SiteContext.Provider>;
}

export function useSite(): SiteInfo | null {
  return React.useContext(SiteContext);
}
