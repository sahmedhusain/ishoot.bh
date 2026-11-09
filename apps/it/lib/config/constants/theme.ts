import {
  argbFromHex,
  themeFromSourceColor,
  hexFromArgb,
  TonalPalette,
} from "@material/material-color-utilities";

export type FontChoice =
  | { kind: "system" }
  | { kind: "google"; family: string }
  | {
      kind: "upload";
      family: string;
      files: { weight: number; url: string }[];
    };

export type ThemeRadius = "none" | "sm" | "md" | "lg" | "xl";
export type ThemeMode = "light" | "dark" | "system";
export type ThemeButtonShape = "square" | "rounded" | "pill";
export type ThemeFontScale = "sm" | "md" | "lg";
export type ThemeHeadingCase = "normal" | "uppercase";
export type ThemeSurface = "tinted" | "neutral";

export type WebsiteMode = "dark" | "light";

export interface BrandTheme {
  primary: string;
  accent: string;
  fonts: { body: FontChoice; heading: FontChoice };
  radius: ThemeRadius;
  defaultMode: ThemeMode;

  buttonShape: ThemeButtonShape;

  fontScale: ThemeFontScale;

  headingWeight: number;

  headingCase: ThemeHeadingCase;

  surface: ThemeSurface;
  websiteMode: WebsiteMode;
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

  buttonShape: "pill",
  fontScale: "md",
  headingWeight: 700,
  headingCase: "normal",
  surface: "tinted",
  websiteMode: "dark",
};

export type FontCategory = "sans" | "serif" | "display" | "handwriting";
export interface LibraryFont {
  family: string;
  category: FontCategory;

  script: "arabic" | "latin";
  weights: readonly number[];
}

export const FONT_LIBRARY: readonly LibraryFont[] = [
  {
    family: "IBM Plex Sans Arabic",
    category: "sans",
    script: "arabic",
    weights: [300, 400, 500, 600, 700],
  },
  {
    family: "Cairo",
    category: "sans",
    script: "arabic",
    weights: [300, 400, 500, 600, 700, 800],
  },
  {
    family: "Tajawal",
    category: "sans",
    script: "arabic",
    weights: [300, 400, 500, 700, 800],
  },
  {
    family: "Almarai",
    category: "sans",
    script: "arabic",
    weights: [300, 400, 700, 800],
  },
  {
    family: "Readex Pro",
    category: "sans",
    script: "arabic",
    weights: [300, 400, 500, 600, 700],
  },
  {
    family: "Alexandria",
    category: "sans",
    script: "arabic",
    weights: [300, 400, 500, 600, 700, 800],
  },
  {
    family: "Noto Sans Arabic",
    category: "sans",
    script: "arabic",
    weights: [300, 400, 500, 600, 700, 800],
  },
  {
    family: "Noto Kufi Arabic",
    category: "sans",
    script: "arabic",
    weights: [300, 400, 500, 600, 700, 800],
  },
  {
    family: "Vazirmatn",
    category: "sans",
    script: "arabic",
    weights: [300, 400, 500, 600, 700, 800],
  },
  {
    family: "Rubik",
    category: "sans",
    script: "arabic",
    weights: [300, 400, 500, 600, 700, 800],
  },
  {
    family: "Zain",
    category: "sans",
    script: "arabic",
    weights: [300, 400, 700, 800],
  },
  {
    family: "Mada",
    category: "sans",
    script: "arabic",
    weights: [300, 400, 500, 600, 700, 800],
  },
  {
    family: "Harmattan",
    category: "sans",
    script: "arabic",
    weights: [400, 500, 600, 700],
  },
  {
    family: "Changa",
    category: "display",
    script: "arabic",
    weights: [300, 400, 500, 600, 700, 800],
  },
  {
    family: "El Messiri",
    category: "display",
    script: "arabic",
    weights: [400, 500, 600, 700],
  },
  {
    family: "Reem Kufi",
    category: "display",
    script: "arabic",
    weights: [400, 500, 600, 700],
  },
  {
    family: "Kufam",
    category: "display",
    script: "arabic",
    weights: [400, 500, 600, 700, 800],
  },
  {
    family: "Baloo Bhaijaan 2",
    category: "display",
    script: "arabic",
    weights: [400, 500, 600, 700, 800],
  },
  {
    family: "Lemonada",
    category: "display",
    script: "arabic",
    weights: [300, 400, 500, 600, 700],
  },
  {
    family: "Marhey",
    category: "display",
    script: "arabic",
    weights: [300, 400, 500, 600, 700],
  },
  { family: "Lalezar", category: "display", script: "arabic", weights: [400] },
  { family: "Rakkas", category: "display", script: "arabic", weights: [400] },
  { family: "Amiri", category: "serif", script: "arabic", weights: [400, 700] },
  {
    family: "Noto Naskh Arabic",
    category: "serif",
    script: "arabic",
    weights: [400, 500, 600, 700],
  },
  {
    family: "Markazi Text",
    category: "serif",
    script: "arabic",
    weights: [400, 500, 600, 700],
  },
  {
    family: "Scheherazade New",
    category: "serif",
    script: "arabic",
    weights: [400, 500, 600, 700],
  },
  {
    family: "Lateef",
    category: "serif",
    script: "arabic",
    weights: [300, 400, 500, 600, 700, 800],
  },
  {
    family: "Mirza",
    category: "serif",
    script: "arabic",
    weights: [400, 500, 600, 700],
  },
  {
    family: "Aref Ruqaa",
    category: "handwriting",
    script: "arabic",
    weights: [400, 700],
  },
  {
    family: "Qahiri",
    category: "handwriting",
    script: "arabic",
    weights: [400],
  },
  {
    family: "Playpen Sans Arabic",
    category: "handwriting",
    script: "arabic",
    weights: [300, 400, 500, 600, 700, 800],
  },
  {
    family: "Inter",
    category: "sans",
    script: "latin",
    weights: [300, 400, 500, 600, 700, 800],
  },
  {
    family: "Poppins",
    category: "sans",
    script: "latin",
    weights: [300, 400, 500, 600, 700, 800],
  },
  {
    family: "Montserrat",
    category: "sans",
    script: "latin",
    weights: [300, 400, 500, 600, 700, 800],
  },
  {
    family: "DM Sans",
    category: "sans",
    script: "latin",
    weights: [300, 400, 500, 600, 700, 800],
  },
  {
    family: "Manrope",
    category: "sans",
    script: "latin",
    weights: [300, 400, 500, 600, 700, 800],
  },
  {
    family: "Plus Jakarta Sans",
    category: "sans",
    script: "latin",
    weights: [300, 400, 500, 600, 700, 800],
  },
  {
    family: "Outfit",
    category: "sans",
    script: "latin",
    weights: [300, 400, 500, 600, 700, 800],
  },
  {
    family: "Figtree",
    category: "sans",
    script: "latin",
    weights: [300, 400, 500, 600, 700, 800],
  },
  {
    family: "Sora",
    category: "sans",
    script: "latin",
    weights: [300, 400, 500, 600, 700, 800],
  },
  {
    family: "Urbanist",
    category: "sans",
    script: "latin",
    weights: [300, 400, 500, 600, 700, 800],
  },
  {
    family: "Lexend",
    category: "sans",
    script: "latin",
    weights: [300, 400, 500, 600, 700, 800],
  },
  {
    family: "Work Sans",
    category: "sans",
    script: "latin",
    weights: [300, 400, 500, 600, 700, 800],
  },
  {
    family: "Open Sans",
    category: "sans",
    script: "latin",
    weights: [300, 400, 500, 600, 700, 800],
  },
  {
    family: "Roboto",
    category: "sans",
    script: "latin",
    weights: [300, 400, 500, 700, 900],
  },
  {
    family: "Lato",
    category: "sans",
    script: "latin",
    weights: [300, 400, 700, 900],
  },
  {
    family: "Nunito",
    category: "sans",
    script: "latin",
    weights: [300, 400, 500, 600, 700, 800],
  },
  {
    family: "Raleway",
    category: "sans",
    script: "latin",
    weights: [300, 400, 500, 600, 700, 800],
  },
  {
    family: "Archivo",
    category: "sans",
    script: "latin",
    weights: [300, 400, 500, 600, 700, 800],
  },
  {
    family: "Barlow",
    category: "sans",
    script: "latin",
    weights: [300, 400, 500, 600, 700, 800],
  },
  {
    family: "Josefin Sans",
    category: "sans",
    script: "latin",
    weights: [300, 400, 500, 600, 700],
  },
  {
    family: "Space Grotesk",
    category: "display",
    script: "latin",
    weights: [300, 400, 500, 600, 700],
  },
  {
    family: "Oswald",
    category: "display",
    script: "latin",
    weights: [300, 400, 500, 600, 700],
  },
  {
    family: "Bebas Neue",
    category: "display",
    script: "latin",
    weights: [400],
  },
  {
    family: "Playfair Display",
    category: "serif",
    script: "latin",
    weights: [400, 500, 600, 700, 800],
  },
  {
    family: "Lora",
    category: "serif",
    script: "latin",
    weights: [400, 500, 600, 700],
  },
  {
    family: "Merriweather",
    category: "serif",
    script: "latin",
    weights: [300, 400, 700, 900],
  },
  {
    family: "Cormorant Garamond",
    category: "serif",
    script: "latin",
    weights: [300, 400, 500, 600, 700],
  },
  {
    family: "Libre Baskerville",
    category: "serif",
    script: "latin",
    weights: [400, 700],
  },
  {
    family: "Fraunces",
    category: "serif",
    script: "latin",
    weights: [300, 400, 500, 600, 700, 800],
  },
  {
    family: "DM Serif Display",
    category: "serif",
    script: "latin",
    weights: [400],
  },
];

export const CURATED_FONTS = FONT_LIBRARY.filter(
  (font) => font.script === "arabic",
);

export const LICENSED_FONTS = [
  {
    family: "Thmanyah Sans",
    category: "sans",
    script: "arabic",
    source: "https://thmanyah.com/fonts",
  },
  {
    family: "Thmanyah Serif Display",
    category: "serif",
    script: "arabic",
    source: "https://thmanyah.com/fonts",
  },
  {
    family: "Thmanyah Serif Text",
    category: "serif",
    script: "arabic",
    source: "https://thmanyah.com/fonts",
  },
] as const;

export const FONT_FILE_TYPES = {
  "font/woff2": { extension: "woff2", format: "woff2" },
  "font/woff": { extension: "woff", format: "woff" },
  "font/ttf": { extension: "ttf", format: "truetype" },
  "font/otf": { extension: "otf", format: "opentype" },
} as const;
export type FontMimeType = keyof typeof FONT_FILE_TYPES;
export const FONT_EXTENSIONS = Object.values(FONT_FILE_TYPES).map(
  (t) => t.extension,
);

export const FONT_UPLOAD_URL = new RegExp(
  `^/api/files/brand/[a-zA-Z0-9_-]+\\.(${FONT_EXTENSIONS.join("|")})$`,
);

export function isFontMimeType(value: unknown): value is FontMimeType {
  return typeof value === "string" && Object.hasOwn(FONT_FILE_TYPES, value);
}

export function fontMimeFromName(name: string): FontMimeType | "" {
  const extension = name.split(".").pop()?.toLowerCase();
  return (
    (Object.entries(FONT_FILE_TYPES).find(
      ([, t]) => t.extension === extension,
    )?.[0] as FontMimeType | undefined) ?? ""
  );
}

const WEIGHT_NAMES: [RegExp, number][] = [
  [/hairline|thin/i, 100],
  [/extra-?light|ultra-?light/i, 200],
  [/light/i, 300],
  [/medium/i, 500],
  [/semi-?bold|demi-?bold/i, 600],
  [/extra-?bold|ultra-?bold/i, 800],
  [/black|heavy/i, 900],
  [/bold/i, 700],
  [/regular|normal|book|roman/i, 400],
];

export function weightFromFileName(name: string): number | null {
  const stem = name.replace(/\.[^.]+$/, "");
  const numeric = stem.match(/(?:^|[^0-9])([1-9]00)(?:[^0-9]|$)/);
  if (numeric) return Number(numeric[1]);
  return WEIGHT_NAMES.find(([pattern]) => pattern.test(stem))?.[1] ?? null;
}

export const STYLE_PRESETS: {
  id: string;
  theme: Omit<BrandTheme, "defaultMode">;
}[] = [
  {
    id: "corporate",
    theme: {
      primary: "#1E3A8A",
      accent: "#2563EB",
      fonts: {
        body: { kind: "google", family: "IBM Plex Sans Arabic" },
        heading: { kind: "google", family: "IBM Plex Sans Arabic" },
      },
      radius: "md",
      buttonShape: "rounded",
      fontScale: "md",
      headingWeight: 700,
      headingCase: "normal",
      surface: "tinted",
      websiteMode: "dark",
    },
  },
  {
    id: "cinematic",
    theme: {
      primary: "#0F172A",
      accent: "#0D9488",
      fonts: {
        body: { kind: "google", family: "Readex Pro" },
        heading: { kind: "google", family: "Alexandria" },
      },
      radius: "sm",
      buttonShape: "square",
      fontScale: "md",
      headingWeight: 800,
      headingCase: "uppercase",
      surface: "neutral",
      websiteMode: "dark",
    },
  },
  {
    id: "elegant",
    theme: {
      primary: "#3F2A1D",
      accent: "#B45309",
      fonts: {
        body: { kind: "google", family: "Noto Naskh Arabic" },
        heading: { kind: "google", family: "Amiri" },
      },
      radius: "none",
      buttonShape: "square",
      fontScale: "lg",
      headingWeight: 700,
      headingCase: "normal",
      surface: "neutral",
      websiteMode: "dark",
    },
  },
  {
    id: "modern",
    theme: {
      primary: "#312E81",
      accent: "#4F46E5",
      fonts: {
        body: { kind: "google", family: "Alexandria" },
        heading: { kind: "google", family: "Alexandria" },
      },
      radius: "xl",
      buttonShape: "pill",
      fontScale: "md",
      headingWeight: 700,
      headingCase: "normal",
      surface: "tinted",
      websiteMode: "dark",
    },
  },
  {
    id: "friendly",
    theme: {
      primary: "#9A3412",
      accent: "#EA580C",
      fonts: {
        body: { kind: "google", family: "Tajawal" },
        heading: { kind: "google", family: "Baloo Bhaijaan 2" },
      },
      radius: "xl",
      buttonShape: "pill",
      fontScale: "lg",
      headingWeight: 700,
      headingCase: "normal",
      surface: "tinted",
      websiteMode: "dark",
    },
  },
  {
    id: "fresh",
    theme: {
      primary: "#064E3B",
      accent: "#059669",
      fonts: {
        body: { kind: "google", family: "Cairo" },
        heading: { kind: "google", family: "Cairo" },
      },
      radius: "lg",
      buttonShape: "rounded",
      fontScale: "md",
      headingWeight: 700,
      headingCase: "normal",
      surface: "tinted",
      websiteMode: "dark",
    },
  },
  {
    id: "minimal",
    theme: {
      primary: "#111827",
      accent: "#374151",
      fonts: {
        body: { kind: "google", family: "Noto Sans Arabic" },
        heading: { kind: "google", family: "Noto Kufi Arabic" },
      },
      radius: "sm",
      buttonShape: "square",
      fontScale: "sm",
      headingWeight: 600,
      headingCase: "normal",
      surface: "neutral",
      websiteMode: "dark",
    },
  },
  {
    id: "bold",
    theme: {
      primary: "#7F1D1D",
      accent: "#DC2626",
      fonts: {
        body: { kind: "google", family: "Almarai" },
        heading: { kind: "google", family: "Changa" },
      },
      radius: "md",
      buttonShape: "rounded",
      fontScale: "md",
      headingWeight: 800,
      headingCase: "uppercase",
      surface: "tinted",
      websiteMode: "dark",
    },
  },
  {
    id: "daylight",
    theme: {
      primary: "#0F4C81",
      accent: "#0EA5E9",
      fonts: {
        body: { kind: "google", family: "IBM Plex Sans Arabic" },
        heading: { kind: "google", family: "Readex Pro" },
      },
      radius: "lg",
      buttonShape: "rounded",
      fontScale: "md",
      headingWeight: 700,
      headingCase: "normal",
      surface: "neutral",
      websiteMode: "light",
    },
  },
  {
    id: "boutique",
    theme: {
      primary: "#831843",
      accent: "#DB2777",
      fonts: {
        body: { kind: "google", family: "Tajawal" },
        heading: { kind: "google", family: "El Messiri" },
      },
      radius: "xl",
      buttonShape: "pill",
      fontScale: "md",
      headingWeight: 600,
      headingCase: "normal",
      surface: "tinted",
      websiteMode: "light",
    },
  },
  {
    id: "spa",
    theme: {
      primary: "#365314",
      accent: "#84CC16",
      fonts: {
        body: { kind: "google", family: "Noto Sans Arabic" },
        heading: { kind: "google", family: "Lalezar" },
      },
      radius: "xl",
      buttonShape: "pill",
      fontScale: "lg",
      headingWeight: 400,
      headingCase: "normal",
      surface: "tinted",
      websiteMode: "light",
    },
  },
  {
    id: "energetic",
    theme: {
      primary: "#111827",
      accent: "#F59E0B",
      fonts: {
        body: { kind: "google", family: "Almarai" },
        heading: { kind: "google", family: "Changa" },
      },
      radius: "sm",
      buttonShape: "square",
      fontScale: "md",
      headingWeight: 800,
      headingCase: "uppercase",
      surface: "neutral",
      websiteMode: "dark",
    },
  },
  {
    id: "motor",
    theme: {
      primary: "#1F2937",
      accent: "#EF4444",
      fonts: {
        body: { kind: "google", family: "Readex Pro" },
        heading: { kind: "google", family: "Alexandria" },
      },
      radius: "sm",
      buttonShape: "square",
      fontScale: "md",
      headingWeight: 800,
      headingCase: "uppercase",
      surface: "neutral",
      websiteMode: "dark",
    },
  },
  {
    id: "logistics",
    theme: {
      primary: "#1E3A8A",
      accent: "#F97316",
      fonts: {
        body: { kind: "google", family: "Cairo" },
        heading: { kind: "google", family: "Cairo" },
      },
      radius: "md",
      buttonShape: "rounded",
      fontScale: "md",
      headingWeight: 700,
      headingCase: "normal",
      surface: "tinted",
      websiteMode: "light",
    },
  },
  {
    id: "voyage",
    theme: {
      primary: "#0C4A6E",
      accent: "#14B8A6",
      fonts: {
        body: { kind: "google", family: "Tajawal" },
        heading: { kind: "google", family: "Reem Kufi" },
      },
      radius: "xl",
      buttonShape: "pill",
      fontScale: "md",
      headingWeight: 700,
      headingCase: "normal",
      surface: "tinted",
      websiteMode: "light",
    },
  },
  {
    id: "hospitality",
    theme: {
      primary: "#422006",
      accent: "#CA8A04",
      fonts: {
        body: { kind: "google", family: "Noto Naskh Arabic" },
        heading: { kind: "google", family: "Aref Ruqaa" },
      },
      radius: "sm",
      buttonShape: "square",
      fontScale: "lg",
      headingWeight: 700,
      headingCase: "normal",
      surface: "neutral",
      websiteMode: "dark",
    },
  },
  {
    id: "counsel",
    theme: {
      primary: "#172554",
      accent: "#A16207",
      fonts: {
        body: { kind: "google", family: "Noto Naskh Arabic" },
        heading: { kind: "google", family: "Amiri" },
      },
      radius: "none",
      buttonShape: "square",
      fontScale: "md",
      headingWeight: 700,
      headingCase: "normal",
      surface: "neutral",
      websiteMode: "light",
    },
  },
  {
    id: "civic",
    theme: {
      primary: "#14532D",
      accent: "#22C55E",
      fonts: {
        body: { kind: "google", family: "IBM Plex Sans Arabic" },
        heading: { kind: "google", family: "Noto Kufi Arabic" },
      },
      radius: "lg",
      buttonShape: "rounded",
      fontScale: "md",
      headingWeight: 700,
      headingCase: "normal",
      surface: "tinted",
      websiteMode: "light",
    },
  },
  {
    id: "clinical",
    theme: {
      primary: "#0F766E",
      accent: "#06B6D4",
      fonts: {
        body: { kind: "google", family: "Noto Sans Arabic" },
        heading: { kind: "google", family: "Cairo" },
      },
      radius: "lg",
      buttonShape: "rounded",
      fontScale: "md",
      headingWeight: 600,
      headingCase: "normal",
      surface: "neutral",
      websiteMode: "light",
    },
  },
  {
    id: "industrial",
    theme: {
      primary: "#27272A",
      accent: "#EAB308",
      fonts: {
        body: { kind: "google", family: "Almarai" },
        heading: { kind: "google", family: "Changa" },
      },
      radius: "none",
      buttonShape: "square",
      fontScale: "md",
      headingWeight: 800,
      headingCase: "uppercase",
      surface: "neutral",
      websiteMode: "dark",
    },
  },
  {
    id: "tech",
    theme: {
      primary: "#1E1B4B",
      accent: "#8B5CF6",
      fonts: {
        body: { kind: "google", family: "Readex Pro" },
        heading: { kind: "google", family: "Readex Pro" },
      },
      radius: "lg",
      buttonShape: "rounded",
      fontScale: "md",
      headingWeight: 700,
      headingCase: "normal",
      surface: "tinted",
      websiteMode: "dark",
    },
  },
  {
    id: "market",
    theme: {
      primary: "#7C2D12",
      accent: "#F97316",
      fonts: {
        body: { kind: "google", family: "Cairo" },
        heading: { kind: "google", family: "Baloo Bhaijaan 2" },
      },
      radius: "xl",
      buttonShape: "pill",
      fontScale: "md",
      headingWeight: 700,
      headingCase: "normal",
      surface: "tinted",
      websiteMode: "light",
    },
  },
];

const RADII: Record<ThemeRadius, string> = {
  none: "0px",
  sm: "0.25rem",
  md: "0.5rem",
  lg: "0.75rem",
  xl: "1rem",
};
const FONT_SCALES: Record<ThemeFontScale, string> = {
  sm: "15px",
  md: "16px",
  lg: "17px",
};
export const HEADING_WEIGHTS = [400, 500, 600, 700, 800];
const BUTTON_RADII: Record<ThemeButtonShape, string | null> = {
  square: "0px",
  rounded: null,
  pill: "9999px",
};
const HEX = /^#([0-9a-f]{6})$/i;
const FAMILY = /^[A-Za-z0-9 ]{1,60}$/;

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX.test(value);
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: number[]) {
  return (
    "#" +
    [r, g, b]
      .map((v) =>
        Math.round(Math.min(255, Math.max(0, v)))
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

function hsl(hex: string): [number, number, number] {
  const [r, g, b] = rgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === r
      ? (g - b) / d + (g < b ? 6 : 0)
      : max === g
        ? (b - r) / d + 2
        : (r - g) / d + 4;
  return [h * 60, s, l];
}

function fromHsl(h: number, s: number, l: number) {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return toHex([f(0) * 255, f(8) * 255, f(4) * 255]);
}

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

export function mix(hex: string, toward: string, amount: number) {
  const a = rgb(hex),
    b = rgb(toward);
  return toHex(a.map((v, i) => v + (b[i] - v) * amount));
}

export function contrastRatio(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export function readableOn(background: string) {
  return contrastRatio(background, "#FFFFFF") >=
    contrastRatio(background, "#0F172A")
    ? "#FFFFFF"
    : "#0F172A";
}

function validFont(value: unknown): FontChoice | null {
  const font = value as FontChoice | null;
  if (!font || typeof font !== "object") return null;
  if (font.kind === "system") return { kind: "system" };
  if (font.kind === "google" && FAMILY.test(font.family ?? ""))
    return { kind: "google", family: font.family };
  if (
    font.kind === "upload" &&
    FAMILY.test(font.family ?? "") &&
    Array.isArray(font.files)
  ) {
    const files = font.files
      .filter(
        (f) =>
          f &&
          FONT_UPLOAD_URL.test(f.url) &&
          Number.isInteger(f.weight) &&
          f.weight >= 100 &&
          f.weight <= 900,
      )
      .slice(0, 9)
      .map((f) => ({ weight: f.weight, url: f.url }));
    return files.length ? { kind: "upload", family: font.family, files } : null;
  }
  return null;
}

export function normalizeTheme(value: unknown): BrandTheme {
  const input = (
    value && typeof value === "object" ? value : {}
  ) as Partial<BrandTheme>;
  const fonts = (input.fonts ?? {}) as Partial<BrandTheme["fonts"]>;
  return {
    primary: isHexColor(input.primary)
      ? input.primary.toUpperCase()
      : DEFAULT_THEME.primary,
    accent: isHexColor(input.accent)
      ? input.accent.toUpperCase()
      : DEFAULT_THEME.accent,
    fonts: {
      body: validFont(fonts.body) ?? DEFAULT_THEME.fonts.body,
      heading:
        validFont(fonts.heading) ??
        validFont(fonts.body) ??
        DEFAULT_THEME.fonts.heading,
    },
    radius:
      input.radius && input.radius in RADII
        ? input.radius
        : DEFAULT_THEME.radius,
    defaultMode:
      input.defaultMode === "light" ||
      input.defaultMode === "dark" ||
      input.defaultMode === "system"
        ? input.defaultMode
        : DEFAULT_THEME.defaultMode,
    buttonShape:
      input.buttonShape && input.buttonShape in BUTTON_RADII
        ? input.buttonShape
        : DEFAULT_THEME.buttonShape,
    fontScale:
      input.fontScale && input.fontScale in FONT_SCALES
        ? input.fontScale
        : DEFAULT_THEME.fontScale,
    headingWeight: HEADING_WEIGHTS.includes(input.headingWeight as number)
      ? (input.headingWeight as number)
      : DEFAULT_THEME.headingWeight,
    headingCase: input.headingCase === "uppercase" ? "uppercase" : "normal",
    surface: input.surface === "neutral" ? "neutral" : "tinted",
    websiteMode: input.websiteMode === "light" ? "light" : "dark",
  };
}

export function themeWarnings(theme: BrandTheme) {
  const warnings: ("primaryOnLight" | "accentOnDark" | "accentButtonText")[] =
    [];
  if (contrastRatio(theme.primary, "#FFFFFF") < 4.5)
    warnings.push("primaryOnLight");
  if (contrastRatio(shade(theme.accent, 0.12), "#0B1210") < 4.5)
    warnings.push("accentOnDark");
  if (contrastRatio(theme.accent, readableOn(theme.accent)) < 4.5)
    warnings.push("accentButtonText");
  return warnings;
}

const channels = (hex: string) => rgb(hex).join(" ");
const familyCss = (font: FontChoice, fallback: string) =>
  font.kind === "system" ? fallback : `"${font.family}", ${fallback}`;

export const THEME_TONES = [
  5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 95,
] as const;

export function themeVariables(input: BrandTheme) {
  const theme = normalizeTheme(input);
  const [hue] = hsl(theme.primary);

  const tintStrength = theme.surface === "neutral" ? 0.06 : 1;
  const tint = (s: number, l: number) =>
    channels(fromHsl(hue, s * tintStrength, l));
  const [accentHue, accentSaturation] = hsl(theme.accent);
  const tones = Object.fromEntries(
    THEME_TONES.map((tone) => [
      `--brand-tone-${tone}`,
      channels(
        fromHsl(accentHue, Math.min(accentSaturation, 0.75), tone / 100),
      ),
    ]),
  );

  const m3 = themeFromSourceColor(argbFromHex(theme.primary), [
    { name: "accent", value: argbFromHex(theme.accent), blend: true },
  ]);
  const neutral =
    theme.surface === "neutral"
      ? TonalPalette.fromHueAndChroma(0, 0)
      : m3.palettes.neutral;
  const neutralVariant =
    theme.surface === "neutral" ? neutral : m3.palettes.neutralVariant;
  const materialColors = (mode: "light" | "dark") => {
    const dark = mode === "dark";
    const accent = m3.customColors[0][mode];
    const roles = {
      ...m3.schemes[mode].toJSON(),
      tertiary: accent.color,
      onTertiary: accent.onColor,
      tertiaryContainer: accent.colorContainer,
      onTertiaryContainer: accent.onColorContainer,
      surface: neutral.tone(dark ? 6 : 98),
      surfaceDim: neutral.tone(dark ? 6 : 87),
      surfaceBright: neutral.tone(dark ? 24 : 98),
      surfaceContainerLowest: neutral.tone(dark ? 4 : 100),
      surfaceContainerLow: neutral.tone(dark ? 10 : 96),
      surfaceContainer: neutral.tone(dark ? 12 : 94),
      surfaceContainerHigh: neutral.tone(dark ? 17 : 92),
      surfaceContainerHighest: neutral.tone(dark ? 22 : 90),
      onSurface: neutral.tone(dark ? 90 : 10),
      onSurfaceVariant: neutralVariant.tone(dark ? 80 : 30),
      outline: neutralVariant.tone(dark ? 60 : 50),
      outlineVariant: neutralVariant.tone(dark ? 30 : 80),
      inverseSurface: neutral.tone(dark ? 90 : 20),
      inverseOnSurface: neutral.tone(dark ? 20 : 95),
      inversePrimary: m3.schemes[dark ? "light" : "dark"].primary,
    };
    return Object.fromEntries(
      Object.entries(roles).flatMap(([role, value]) => {
        const name = role.replace(
          /[A-Z]/g,
          (letter) => `-${letter.toLowerCase()}`,
        );
        const hex = hexFromArgb(value);

        return [
          [`--md-sys-color-${name}`, hex],
          [`--m3-color-${name}`, channels(hex)],
        ];
      }),
    );
  };

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
    "--brand-button-radius":
      BUTTON_RADII[theme.buttonShape] ?? RADII[theme.radius],
    "--brand-font-size": FONT_SCALES[theme.fontScale],
    "--brand-heading-weight": String(theme.headingWeight),
    "--brand-heading-case":
      theme.headingCase === "uppercase" ? "uppercase" : "none",
    "--brand-font-body": familyCss(theme.fonts.body, sans),
    "--brand-font-heading": familyCss(theme.fonts.heading, sans),

    "--md-sys-shape-corner-none": "0px",
    "--md-sys-shape-corner-extra-small": "4px",
    "--md-sys-shape-corner-small": "8px",
    "--md-sys-shape-corner-medium": "12px",
    "--md-sys-shape-corner-large": "16px",
    "--md-sys-shape-corner-extra-large": "28px",
    "--md-sys-shape-corner-full": "9999px",

    "--md-sys-motion-easing-standard": "cubic-bezier(0.2, 0, 0, 1)",
    "--md-sys-motion-easing-emphasized": "cubic-bezier(0.05, 0.7, 0.1, 1.0)",
    "--md-sys-motion-easing-emphasized-decelerate":
      "cubic-bezier(0.05, 0.7, 0.1, 1)",
    "--md-sys-motion-easing-emphasized-accelerate":
      "cubic-bezier(0.3, 0.0, 0.8, 0.15)",
    "--md-sys-motion-duration-short1": "50ms",
    "--md-sys-motion-duration-short2": "100ms",
    "--md-sys-motion-duration-short3": "150ms",
    "--md-sys-motion-duration-short4": "200ms",
    "--md-sys-motion-duration-medium1": "250ms",
    "--md-sys-motion-duration-medium2": "300ms",
    "--md-sys-motion-duration-medium3": "350ms",
    "--md-sys-motion-duration-medium4": "400ms",
    "--md-sys-motion-duration-long1": "450ms",
    "--md-sys-motion-duration-long2": "500ms",

    "--md-sys-state-hover-opacity": "0.08",
    "--md-sys-state-focus-opacity": "0.12",
    "--md-sys-state-pressed-opacity": "0.12",
    "--md-sys-state-dragged-opacity": "0.16",
    "--md-sys-elevation-level0": "none",
    "--md-sys-elevation-level1":
      "0 1px 2px 0 rgba(0, 0, 0, 0.05), 0 1px 3px 1px rgba(0, 0, 0, 0.08)",
    "--md-sys-elevation-level2":
      "0 2px 4px 0 rgba(0, 0, 0, 0.08), 0 4px 6px 2px rgba(0, 0, 0, 0.10)",
    "--md-sys-elevation-level3":
      "0 4px 8px 3px rgba(0, 0, 0, 0.10), 0 8px 12px 4px rgba(0, 0, 0, 0.12)",
    "--md-sys-elevation-level4":
      "0 6px 10px 4px rgba(0, 0, 0, 0.12), 0 10px 16px 5px rgba(0, 0, 0, 0.14)",
    "--md-sys-elevation-level5":
      "0 8px 12px 6px rgba(0, 0, 0, 0.14), 0 12px 20px 7px rgba(0, 0, 0, 0.16)",
    ...tones,
  };

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
    ...materialColors("dark"),
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
    ...materialColors("light"),
  };
  return { common, dark, light };
}

const block = (selector: string, vars: Record<string, string>) =>
  `${selector}{${Object.entries(vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(";")}}`;

function fontFormat(url: string) {
  const extension = url.split(".").pop();
  return (
    Object.values(FONT_FILE_TYPES).find((t) => t.extension === extension)
      ?.format ?? "woff2"
  );
}

export function themeStylesheet(input: BrandTheme) {
  const theme = normalizeTheme(input);
  const { common, dark, light } = themeVariables(theme);
  const faces = [theme.fonts.body, theme.fonts.heading]
    .filter(
      (f): f is Extract<FontChoice, { kind: "upload" }> => f.kind === "upload",
    )
    .flatMap((f) =>
      f.files.map(
        (file) =>
          `@font-face{font-family:"${f.family}";src:url("${file.url}") format("${fontFormat(file.url)}");font-weight:${file.weight};font-display:swap}`,
      ),
    );
  return (
    Array.from(new Set(faces)).join("") +
    block(":root", { ...common, ...dark }) +
    block("html.dark", dark) +
    block("html.light", light) +
    "html{font-size:var(--brand-font-size)}"
  );
}

export function websiteThemeStylesheet(input: BrandTheme) {
  const { light, dark } = themeVariables(normalizeTheme(input));
  return (["light", "dark"] as const).map(mode => block(
    `:root[data-site-tone="${mode}"],html[data-site-mode="mixed"] [data-site-tone="${mode}"]`,
    {
      ...(mode === "light" ? light : dark),
      "--brand-bg-base": "var(--m3-color-surface)",
      "--brand-bg-surface": "var(--m3-color-surface-container-low)",
      "--brand-bg-elevated": "var(--m3-color-surface-container-high)",
      "--ui-ink": "var(--m3-color-on-surface)",
      "--ui-ink-muted": "var(--m3-color-on-surface-variant)",
      "--site-fg": "var(--m3-color-on-surface)",
      "--web-accent": "var(--md-sys-color-primary)",
      "--site-client-filter": mode === "light" ? "brightness(0) opacity(0.75)" : "initial",
      "--brand-mint": "var(--m3-color-primary)",
      "--site-logo-light": mode === "light" ? "block" : "none",
      "--site-logo-dark": mode === "dark" ? "block" : "none",
      "color-scheme": mode,
    },
  )).join("");
}

export function googleFontsHref(input: BrandTheme) {
  const theme = normalizeTheme(input);
  const families = Array.from(
    new Set(
      [theme.fonts.body, theme.fonts.heading].flatMap((f) =>
        f.kind === "google" ? [f.family] : [],
      ),
    ),
  );
  if (!families.length) return null;
  const query = families.map((family) => {

    const weights = FONT_LIBRARY.find((f) => f.family === family)?.weights;
    return `family=${family.replace(/ /g, "+")}${weights ? `:wght@${weights.join(";")}` : ""}`;
  });
  return `https://fonts.googleapis.com/css2?${query.join("&")}&display=swap`;
}
