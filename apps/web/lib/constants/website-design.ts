import { formatMessage, serverTemplates } from "@platform/locales";

export const SITE_MODES = ["light", "dark", "mixed"] as const;
export type SiteMode = (typeof SITE_MODES)[number];
export const SITE_TONES = ["inherit", "light", "dark"] as const;
export type SiteTone = (typeof SITE_TONES)[number];
export const SITE_REGIONS = [
  "header",
  "footer",
  "home",
  "about",
  "contact",
  "collection",
  "articles",
  "store",
  "account",
  "custom",
] as const;
export type SiteRegion = (typeof SITE_REGIONS)[number];

export interface WebsiteDesign {
  version: 1;
  allowedModes: SiteMode[];
  defaultMode: SiteMode;
  followSystem: boolean;
  visitorSwitching: boolean;
  mixedBase: "light" | "dark";
  tones: Record<SiteRegion, SiteTone>;
  motion: "full" | "reduced" | "off";
  motionScheme?: "standard" | "expressive";
  heroHeight?: "compact" | "comfortable" | "screen";
  heroOverlayOpacity?: number;
  bannerIntervalSeconds?: number;
  contentWidth: "standard" | "wide";
  density: "comfortable" | "compact";
  headerLayout?: "standard" | "centered" | "compact";
  footerLayout?: "standard" | "compact";
}

export function defaultWebsiteDesign(
  legacyMode: "light" | "dark" = "dark",
): WebsiteDesign {
  return {
    version: 1,
    allowedModes: ["light", "dark", "mixed"],
    defaultMode: legacyMode,
    followSystem: false,
    visitorSwitching: false,
    mixedBase: "light",
    tones: Object.fromEntries(
      SITE_REGIONS.map((region) => [region, "inherit"]),
    ) as WebsiteDesign["tones"],
    motion: "full",
    motionScheme: "expressive",
    heroHeight: "comfortable",
    heroOverlayOpacity: 45,
    bannerIntervalSeconds: 8,
    contentWidth: "wide",
    density: "comfortable",
    headerLayout: "standard",
    footerLayout: "standard",
  };
}

export function validateWebsiteDesign(value: unknown): WebsiteDesign {
  const fail = (): never => {
    throw new Error(formatMessage(serverTemplates.invalid0, { 0: "design" }));
  };
  if (!value || typeof value !== "object" || Array.isArray(value))
    return fail();
  const raw = value as WebsiteDesign;
  if (
    raw.version !== 1 ||
    !Array.isArray(raw.allowedModes) ||
    !raw.allowedModes.length ||
    raw.allowedModes.some((mode) => !SITE_MODES.includes(mode)) ||
    new Set(raw.allowedModes).size !== raw.allowedModes.length ||
    !raw.allowedModes.includes(raw.defaultMode) ||
    typeof raw.followSystem !== "boolean" ||
    typeof raw.visitorSwitching !== "boolean" ||
    !["light", "dark"].includes(raw.mixedBase) ||
    !["full", "reduced", "off"].includes(raw.motion) ||
    !["standard", "wide"].includes(raw.contentWidth) ||
    !["comfortable", "compact"].includes(raw.density) ||
    !raw.tones ||
    SITE_REGIONS.some((region) => !SITE_TONES.includes(raw.tones[region]))
  )
    return fail();
  if ((raw.motionScheme !== undefined && !["standard", "expressive"].includes(raw.motionScheme)) || (raw.heroHeight !== undefined && !["compact", "comfortable", "screen"].includes(raw.heroHeight)) || (raw.heroOverlayOpacity !== undefined && (!Number.isFinite(raw.heroOverlayOpacity) || raw.heroOverlayOpacity < 0 || raw.heroOverlayOpacity > 90)) || (raw.bannerIntervalSeconds !== undefined && (!Number.isInteger(raw.bannerIntervalSeconds) || raw.bannerIntervalSeconds < 5 || raw.bannerIntervalSeconds > 60))) return fail();
  if (
    (raw.headerLayout !== undefined &&
      !["standard", "centered", "compact"].includes(raw.headerLayout)) ||
    (raw.footerLayout !== undefined &&
      !["standard", "compact"].includes(raw.footerLayout))
  )
    return fail();
  return {
    version: 1,
    allowedModes: [...raw.allowedModes],
    defaultMode: raw.defaultMode,
    followSystem: raw.followSystem,
    visitorSwitching: raw.visitorSwitching,
    mixedBase: raw.mixedBase,
    tones: Object.fromEntries(
      SITE_REGIONS.map((region) => [region, raw.tones[region]]),
    ) as WebsiteDesign["tones"],
    motion: raw.motion,
    ...(raw.motionScheme !== undefined ? { motionScheme: raw.motionScheme } : {}),
    ...(raw.heroHeight !== undefined ? { heroHeight: raw.heroHeight } : {}),
    ...(raw.heroOverlayOpacity !== undefined ? { heroOverlayOpacity: raw.heroOverlayOpacity } : {}),
    ...(raw.bannerIntervalSeconds !== undefined ? { bannerIntervalSeconds: raw.bannerIntervalSeconds } : {}),
    contentWidth: raw.contentWidth,
    density: raw.density,
    ...(raw.headerLayout !== undefined
      ? { headerLayout: raw.headerLayout }
      : {}),
    ...(raw.footerLayout !== undefined
      ? { footerLayout: raw.footerLayout }
      : {}),
  };
}

export function resolveSiteMode(
  design: WebsiteDesign,
  visitor?: string | null,
  systemDark?: boolean,
): SiteMode {
  if (
    design.visitorSwitching &&
    design.allowedModes.includes(visitor as SiteMode)
  )
    return visitor as SiteMode;
  const system = systemDark ? "dark" : "light";
  return design.followSystem &&
    systemDark !== undefined &&
    design.allowedModes.includes(system)
    ? system
    : design.defaultMode;
}

export function siteBaseTone(
  design: WebsiteDesign,
  mode: SiteMode,
): "light" | "dark" {
  return mode === "mixed" ? design.mixedBase : mode;
}

export function siteThemeBootstrap(design: WebsiteDesign) {
  return `(()=>{const d=${JSON.stringify(design)};let v;try{v=localStorage.getItem('site-mode')}catch{}const s=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';const m=d.visitorSwitching&&d.allowedModes.includes(v)?v:d.followSystem&&d.allowedModes.includes(s)?s:d.defaultMode;const e=document.documentElement;e.dataset.siteMode=m;e.dataset.siteTone=m==='mixed'?d.mixedBase:m;e.classList.remove('light','dark');e.classList.add(e.dataset.siteTone)})()`;
}
