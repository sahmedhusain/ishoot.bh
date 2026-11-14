import { formatMessage, serverTemplates } from "@platform/locales";

export const SITE_MODES = ["light", "dark", "system"] as const;
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
  mixedBase?: "light" | "dark";
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
    allowedModes: ["light", "dark", "system"],
    defaultMode: legacyMode,
    followSystem: false,
    visitorSwitching: false,
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

function normalizeSiteModeValue(value: unknown): unknown {
  return value === "mixed" ? "system" : value;
}

export function validateWebsiteDesign(value: unknown): WebsiteDesign {
  const fail = (): never => {
    throw new Error(formatMessage(serverTemplates.invalid0, { 0: "design" }));
  };
  if (!value || typeof value !== "object" || Array.isArray(value))
    return fail();
  const raw = value as WebsiteDesign;
  const normalizedAllowed = Array.isArray(raw.allowedModes)
    ? Array.from(new Set(raw.allowedModes.map((m) => normalizeSiteModeValue(m))))
    : [];
  const normalizedDefault = normalizeSiteModeValue(raw.defaultMode);
  if (
    raw.version !== 1 ||
    !Array.isArray(raw.allowedModes) ||
    !normalizedAllowed.length ||
    normalizedAllowed.some((mode) => !SITE_MODES.includes(mode as SiteMode)) ||
    !normalizedAllowed.includes(normalizedDefault as SiteMode) ||
    typeof raw.followSystem !== "boolean" ||
    typeof raw.visitorSwitching !== "boolean" ||
    (raw.mixedBase !== undefined && !["light", "dark"].includes(raw.mixedBase)) ||
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
    allowedModes: normalizedAllowed as SiteMode[],
    defaultMode: normalizedDefault as SiteMode,
    followSystem: raw.followSystem,
    visitorSwitching: raw.visitorSwitching,
    ...(raw.mixedBase !== undefined ? { mixedBase: raw.mixedBase } : {}),
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
  const allowed = Array.from(
    new Set(design.allowedModes.map((m) => normalizeSiteModeValue(m) as SiteMode)),
  );
  const normalizedVisitor = normalizeSiteModeValue(visitor);
  if (
    design.visitorSwitching &&
    allowed.includes(normalizedVisitor as SiteMode)
  )
    return normalizedVisitor as SiteMode;
  const def = normalizeSiteModeValue(design.defaultMode) as SiteMode;
  if (def === "system" && systemDark !== undefined) return "system";
  const system = systemDark ? "dark" : "light";
  return design.followSystem &&
    systemDark !== undefined &&
    allowed.includes(system)
    ? system
    : def;
}

export function siteBaseTone(
  design: WebsiteDesign,
  mode: SiteMode,
  systemDark?: boolean,
): "light" | "dark" {
  const normalized = normalizeSiteModeValue(mode);
  if (normalized === "system") {
    if (systemDark !== undefined) return systemDark ? "dark" : "light";
    return design.mixedBase === "dark" ? "dark" : "light";
  }
  return normalized as "light" | "dark";
}

export function siteThemeBootstrap(design: WebsiteDesign) {
  return `(()=>{const d=${JSON.stringify(design)};let v;try{v=localStorage.getItem('site-mode')}catch{}if(v==='mixed')v='system';const a=[...new Set((d.allowedModes||[]).map(x=>x==='mixed'?'system':x))];const s=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';const def=d.defaultMode==='mixed'?'system':d.defaultMode;const m=d.visitorSwitching&&a.includes(v)?v:def==='system'?'system':d.followSystem&&a.includes(s)?s:def;const t=m==='system'?s:m;const e=document.documentElement;e.dataset.siteMode=m;e.dataset.siteTone=t;e.classList.remove('light','dark');e.classList.add(t)})()`;
}
