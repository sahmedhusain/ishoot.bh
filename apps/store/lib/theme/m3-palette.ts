import {
  argbFromHex,
  themeFromSourceColor,
  hexFromArgb,
  TonalPalette,
} from "@material/material-color-utilities";
import {
  type BrandTheme,
  type FontChoice,
  type ThemeRadius,
  type ThemeMode,
  type ThemeButtonShape,
  type ThemeFontScale,
  type ThemeHeadingCase,
  type ThemeSurface,
  type WebsiteMode,
  DEFAULT_THEME,
  FONT_LIBRARY,
  STYLE_PRESETS,
  THEME_TONES,
  normalizeTheme,
  themeVariables,
  themeStylesheet,
  websiteThemeStylesheet,
  googleFontsHref,
  isHexColor,
  contrastRatio,
  readableOn,
  shade,
  mix,
} from "../constants/theme";

export {
  type BrandTheme,
  type FontChoice,
  type ThemeRadius,
  type ThemeMode,
  type ThemeButtonShape,
  type ThemeFontScale,
  type ThemeHeadingCase,
  type ThemeSurface,
  type WebsiteMode,
  DEFAULT_THEME,
  FONT_LIBRARY,
  STYLE_PRESETS,
  THEME_TONES,
  normalizeTheme,
  themeVariables,
  themeStylesheet,
  websiteThemeStylesheet,
  googleFontsHref,
  isHexColor,
  contrastRatio,
  readableOn,
  shade,
  mix,
};

export const STORE_SPRING_DRAWER = {
  type: "spring" as const,
  stiffness: 400,
  damping: 40,
  mass: 1,
};

export const STORE_SPRING_GRID = {
  type: "spring" as const,
  stiffness: 240,
  damping: 32,
  mass: 1,
};

export interface M3TonalPaletteTokens {
  light: Record<string, string>;
  dark: Record<string, string>;
}

export function generateM3TonalPalette(
  primaryHex: string,
  accentHex: string,
  surfaceMode: ThemeSurface = "tinted",
): M3TonalPaletteTokens {
  const m3 = themeFromSourceColor(argbFromHex(primaryHex), [
    { name: "accent", value: argbFromHex(accentHex), blend: true },
  ]);
  const neutral =
    surfaceMode === "neutral"
      ? TonalPalette.fromHueAndChroma(0, 0)
      : m3.palettes.neutral;
  const neutralVariant =
    surfaceMode === "neutral" ? neutral : m3.palettes.neutralVariant;

  const toRgbChannels = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
  };

  const buildMode = (mode: "light" | "dark"): Record<string, string> => {
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
          [`--m3-color-${name}`, toRgbChannels(hex)],
        ];
      }),
    );
  };

  return {
    light: buildMode("light"),
    dark: buildMode("dark"),
  };
}

export const storeThemeStylesheet = websiteThemeStylesheet;
