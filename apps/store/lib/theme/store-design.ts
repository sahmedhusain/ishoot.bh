import {
  SITE_MODES,
  type SiteMode,
  SITE_TONES,
  type SiteTone,
  SITE_REGIONS,
  type SiteRegion,
  type WebsiteDesign,
  defaultWebsiteDesign,
  validateWebsiteDesign,
  resolveSiteMode,
  siteBaseTone,
  siteThemeBootstrap,
} from "../constants/website-design";

export {
  SITE_MODES,
  type SiteMode,
  SITE_TONES,
  type SiteTone,
  SITE_REGIONS,
  type SiteRegion,
  defaultWebsiteDesign,
  validateWebsiteDesign,
  resolveSiteMode,
  siteBaseTone,
  siteThemeBootstrap,
};

export const storeBaseTone = siteBaseTone;

export const STORE_CORNERS = ["brand", "rounded", "square"] as const;
export type StoreCorners = (typeof STORE_CORNERS)[number];

export const STORE_BORDERS = ["subtle", "defined"] as const;
export type StoreBorders = (typeof STORE_BORDERS)[number];

export const STORE_DENSITIES = ["comfortable", "compact"] as const;
export type StoreDensity = (typeof STORE_DENSITIES)[number];

export interface StoreDesign extends WebsiteDesign {
  corners?: StoreCorners;
  borders?: StoreBorders;
}

export function defaultStoreDesign(
  legacyMode: "light" | "dark" = "dark",
): StoreDesign {
  return {
    ...defaultWebsiteDesign(legacyMode),
    corners: "rounded",
    borders: "subtle",
  };
}

export function validateStoreDesign(value: unknown): StoreDesign {
  const base = validateWebsiteDesign(value);
  const raw = value as Partial<StoreDesign>;
  const corners: StoreCorners =
    raw.corners && STORE_CORNERS.includes(raw.corners)
      ? raw.corners
      : "rounded";
  const borders: StoreBorders =
    raw.borders && STORE_BORDERS.includes(raw.borders)
      ? raw.borders
      : "subtle";
  return {
    ...base,
    corners,
    borders,
  };
}

export function storeThemeBootstrap(design: StoreDesign): string {
  const corners = design.corners ?? "rounded";
  const borders = design.borders ?? "subtle";
  return `(()=>{const d=${JSON.stringify(design)};let v;try{v=localStorage.getItem('site-mode')}catch{}if(v==='mixed')v='system';const a=[...new Set((d.allowedModes||[]).map(x=>x==='mixed'?'system':x))];const s=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';const def=d.defaultMode==='mixed'?'system':d.defaultMode;const m=d.visitorSwitching&&a.includes(v)?v:def==='system'?'system':d.followSystem&&a.includes(s)?s:def;const t=m==='system'?s:m;const e=document.documentElement;e.dataset.siteMode=m;e.dataset.siteTone=t;e.dataset.density=d.density||'comfortable';e.dataset.corners=${JSON.stringify(corners)};e.dataset.borders=${JSON.stringify(borders)};e.dataset.siteMotion=d.motion||'full';e.classList.remove('light','dark');e.classList.add(t)})()`;
}
