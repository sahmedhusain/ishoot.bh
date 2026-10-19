// The company's visual identity: two brand colours, fonts, corner radius and default mode.
// Everything else (hover shades, tinted surfaces, glow) is derived, so a company picks a few values
// in the setup wizard and both apps stay consistent in light and dark mode.

export type FontChoice =
  | { kind: "system" }
  | { kind: "google"; family: string }
  | { kind: "upload"; family: string; files: { weight: number; url: string }[] };

export type ThemeRadius = "none" | "sm" | "md" | "lg" | "xl";
export type ThemeMode = "light" | "dark" | "system";

export interface BrandTheme {
  primary: string;
  accent: string;
  fonts: { body: FontChoice; heading: FontChoice };
  radius: ThemeRadius;
  defaultMode: ThemeMode;
}

export const DEFAULT_THEME: BrandTheme = {
  primary: "#1E3A8A",
  accent: "#2563EB",
  fonts: {
    body: { kind: "google", family: "IBM Plex Sans Arabic" },
    heading: { kind: "google", family: "IBM Plex Sans Arabic" },
  },
  radius: "lg",
  defaultMode: "system",
};

/** Families offered in the setup wizard; each covers Arabic and Latin so bilingual pages never fall back. */
export const CURATED_FONTS = [
  { family: "IBM Plex Sans Arabic", category: "sans", weights: [300, 400, 500, 700] },
  { family: "Cairo", category: "sans", weights: [300, 400, 500, 700] },
  { family: "Tajawal", category: "sans", weights: [300, 400, 500, 700] },
  { family: "Almarai", category: "sans", weights: [300, 400, 700] },
  { family: "Readex Pro", category: "sans", weights: [300, 400, 500, 700] },
  { family: "Noto Sans Arabic", category: "sans", weights: [300, 400, 500, 700] },
  { family: "Noto Kufi Arabic", category: "display", weights: [300, 400, 500, 700] },
  { family: "Rubik", category: "sans", weights: [300, 400, 500, 700] },
  { family: "Changa", category: "display", weights: [300, 400, 500, 700] },
  { family: "Amiri", category: "serif", weights: [400, 700] },
  { family: "Noto Naskh Arabic", category: "serif", weights: [400, 500, 700] },
] as const;

const RADII: Record<ThemeRadius, string> = { none: "0px", sm: "0.25rem", md: "0.5rem", lg: "0.75rem", xl: "1rem" };
const HEX = /^#([0-9a-f]{6})$/i;
const FAMILY = /^[A-Za-z0-9 ]{1,60}$/;
const FONT_URL = /^\/api\/files\/brand\/[a-zA-Z0-9_-]+\.woff2$/;

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX.test(value);
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: number[]) {
  return "#" + [r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("");
}

function hsl(hex: string): [number, number, number] {
  const [r, g, b] = rgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function fromHsl(h: number, s: number, l: number) {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return toHex([f(0) * 255, f(8) * 255, f(4) * 255]);
}

/** Same hue and saturation, lightness moved by `delta` (−1…1). */
export function shade(hex: string, delta: number) {
  const [h, s, l] = hsl(hex);
  return fromHsl(h, s, Math.min(1, Math.max(0, l + delta)));
}

function luminance(hex: string) {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** `hex` blended towards `toward` by `amount` (0…1); used where CSS variables cannot be (PDF, email). */
export function mix(hex: string, toward: string, amount: number) {
  const a = rgb(hex), b = rgb(toward);
  return toHex(a.map((v, i) => v + (b[i] - v) * amount));
}

/** WCAG contrast ratio between two colours, 1 to 21. */
export function contrastRatio(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** White or near-black, whichever reads better on the given background. */
export function readableOn(background: string) {
  return contrastRatio(background, "#FFFFFF") >= contrastRatio(background, "#0F172A") ? "#FFFFFF" : "#0F172A";
}

function validFont(value: unknown): FontChoice | null {
  const font = value as FontChoice | null;
  if (!font || typeof font !== "object") return null;
  if (font.kind === "system") return { kind: "system" };
  if (font.kind === "google" && FAMILY.test(font.family ?? "")) return { kind: "google", family: font.family };
  if (font.kind === "upload" && FAMILY.test(font.family ?? "") && Array.isArray(font.files)) {
    const files = font.files
      .filter((f) => f && FONT_URL.test(f.url) && Number.isInteger(f.weight) && f.weight >= 100 && f.weight <= 900)
      .slice(0, 9)
      .map((f) => ({ weight: f.weight, url: f.url }));
    return files.length ? { kind: "upload", family: font.family, files } : null;
  }
  return null;
}

/** A stored theme with anything missing or invalid replaced by the default, so rendering never fails. */
export function normalizeTheme(value: unknown): BrandTheme {
  const input = (value && typeof value === "object" ? value : {}) as Partial<BrandTheme>;
  const fonts = (input.fonts ?? {}) as Partial<BrandTheme["fonts"]>;
  return {
    primary: isHexColor(input.primary) ? input.primary.toUpperCase() : DEFAULT_THEME.primary,
    accent: isHexColor(input.accent) ? input.accent.toUpperCase() : DEFAULT_THEME.accent,
    fonts: {
      body: validFont(fonts.body) ?? DEFAULT_THEME.fonts.body,
      heading: validFont(fonts.heading) ?? validFont(fonts.body) ?? DEFAULT_THEME.fonts.heading,
    },
    radius: input.radius && input.radius in RADII ? input.radius : DEFAULT_THEME.radius,
    defaultMode: input.defaultMode === "light" || input.defaultMode === "dark" || input.defaultMode === "system" ? input.defaultMode : DEFAULT_THEME.defaultMode,
  };
}

/** Problems a person choosing colours should see before saving (contrast below WCAG AA for text/buttons). */
export function themeWarnings(theme: BrandTheme) {
  const warnings: ("primaryOnLight" | "accentOnDark" | "accentButtonText")[] = [];
  if (contrastRatio(theme.primary, "#FFFFFF") < 4.5) warnings.push("primaryOnLight");
  if (contrastRatio(shade(theme.accent, 0.12), "#0B1210") < 4.5) warnings.push("accentOnDark");
  if (contrastRatio(theme.accent, readableOn(theme.accent)) < 4.5) warnings.push("accentButtonText");
  return warnings;
}

const channels = (hex: string) => rgb(hex).join(" ");
const familyCss = (font: FontChoice, fallback: string) =>
  font.kind === "system" ? fallback : `"${font.family}", ${fallback}`;

/** Every CSS variable both apps read. Colours are RGB channels so Tailwind opacity modifiers work. */
/** Lightness steps of the accent's tonal palette (tone-5 is near black, tone-95 near white). */
export const THEME_TONES = [5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 95] as const;

export function themeVariables(input: BrandTheme) {
  const theme = normalizeTheme(input);
  const [hue] = hsl(theme.primary);
  const tint = (s: number, l: number) => channels(fromHsl(hue, s, l));
  const [accentHue, accentSaturation] = hsl(theme.accent);
  const tones = Object.fromEntries(
    THEME_TONES.map((tone) => [`--brand-tone-${tone}`, channels(fromHsl(accentHue, Math.min(accentSaturation, 0.75), tone / 100))]),
  );
  const sans = 'system-ui, -apple-system, "Segoe UI", Tahoma, sans-serif';
  const common = {
    "--brand-primary": channels(theme.primary),
    "--brand-primary-light": channels(shade(theme.primary, 0.08)),
    "--brand-primary-dark": channels(shade(theme.primary, -0.08)),
    "--brand-primary-hover": channels(shade(theme.primary, -0.04)),
    "--brand-on-primary": channels(readableOn(theme.primary)),
    "--brand-accent": channels(theme.accent),
    "--brand-accent-hover": channels(shade(theme.accent, 0.07)),
    "--brand-accent-pressed": channels(shade(theme.accent, -0.06)),
    "--brand-on-accent": channels(readableOn(theme.accent)),
    "--brand-mint": channels(shade(theme.accent, 0.3)),
    "--brand-radius": RADII[theme.radius],
    "--brand-font-body": familyCss(theme.fonts.body, sans),
    "--brand-font-heading": familyCss(theme.fonts.heading, sans),
    ...tones,
  };
  // Neutrals carry a faint tint of the primary hue (tonal surfaces), in both modes.
  const dark = {
    "--brand-bg-base": tint(0.25, 0.025),
    "--brand-bg-surface": tint(0.23, 0.057),
    "--brand-bg-elevated": tint(0.23, 0.09),
    "--brand-text-accent": channels(shade(theme.accent, 0.12)),
    "--ui-surface": tint(0.23, 0.057),
    "--ui-surface-raised": tint(0.2, 0.088),
    "--ui-surface-sunken": tint(0.25, 0.025),
    "--ui-ink": tint(0.15, 0.955),
    "--ui-ink-muted": tint(0.08, 0.65),
  };
  const light = {
    "--brand-bg-base": tint(0.25, 0.97),
    "--brand-bg-surface": "255 255 255",
    "--brand-bg-elevated": tint(0.25, 0.94),
    "--brand-text-accent": channels(theme.primary),
    "--ui-surface": "255 255 255",
    "--ui-surface-raised": tint(0.25, 0.97),
    "--ui-surface-sunken": tint(0.25, 0.94),
    "--ui-ink": "15 23 42",
    "--ui-ink-muted": "84 99 121",
  };
  return { common, dark, light };
}

const block = (selector: string, vars: Record<string, string>) =>
  `${selector}{${Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(";")}}`;

/** The stylesheet injected into each app's <head>: variables plus @font-face for uploaded fonts. */
export function themeStylesheet(input: BrandTheme) {
  const theme = normalizeTheme(input);
  const { common, dark, light } = themeVariables(theme);
  const faces = [theme.fonts.body, theme.fonts.heading]
    .filter((f): f is Extract<FontChoice, { kind: "upload" }> => f.kind === "upload")
    .flatMap((f) => f.files.map((file) => `@font-face{font-family:"${f.family}";src:url("${file.url}") format("woff2");font-weight:${file.weight};font-display:swap}`));
  return Array.from(new Set(faces)).join("") + block(":root", { ...common, ...dark }) + block("html.dark", dark) + block("html.light", light);
}

/** Google Fonts stylesheet for any Google families in the theme, or null when none are used. */
export function googleFontsHref(input: BrandTheme) {
  const theme = normalizeTheme(input);
  const families = Array.from(new Set([theme.fonts.body, theme.fonts.heading].flatMap((f) => (f.kind === "google" ? [f.family] : []))));
  if (!families.length) return null;
  const query = families.map((family) => {
    // Asking for a weight a family lacks fails the whole request, so unknown families get the default weight only.
    const weights = CURATED_FONTS.find((f) => f.family === family)?.weights;
    return `family=${family.replace(/ /g, "+")}${weights ? `:wght@${weights.join(";")}` : ""}`;
  });
  return `https://fonts.googleapis.com/css2?${query.join("&")}&display=swap`;
}
