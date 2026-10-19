import { describe, expect, test } from "vitest";
import {
  DEFAULT_THEME,
  contrastRatio,
  googleFontsHref,
  isHexColor,
  mix,
  normalizeTheme,
  readableOn,
  shade,
  themeStylesheet,
  themeVariables,
  themeWarnings,
  THEME_TONES,
} from "../../packages/database/src/constants/theme";

describe("normalizeTheme", () => {
  test("missing or broken input falls back to the default theme", () => {
    expect(normalizeTheme(null)).toEqual(DEFAULT_THEME);
    expect(normalizeTheme("nonsense")).toEqual(DEFAULT_THEME);
    expect(normalizeTheme({ primary: "red", accent: "#12", radius: "huge", defaultMode: "dim" })).toEqual(DEFAULT_THEME);
  });

  test("valid values are kept and colours upper-cased", () => {
    const theme = normalizeTheme({ primary: "#abcdef", accent: "#123456", radius: "sm", defaultMode: "dark" });
    expect(theme).toMatchObject({ primary: "#ABCDEF", accent: "#123456", radius: "sm", defaultMode: "dark" });
  });

  test("heading font falls back to the body font", () => {
    const theme = normalizeTheme({ fonts: { body: { kind: "google", family: "Cairo" } } });
    expect(theme.fonts.heading).toEqual({ kind: "google", family: "Cairo" });
  });

  test("uploaded fonts only accept public brand woff2 files and real weights", () => {
    const theme = normalizeTheme({
      fonts: {
        body: {
          kind: "upload",
          family: "Brand Sans",
          files: [
            { weight: 400, url: "/api/files/brand/sans_1.woff2" },
            { weight: 700, url: "/api/files/vault/secret.woff2" },
            { weight: 50, url: "/api/files/brand/thin.woff2" },
            { weight: 700, url: "https://evil.example/font.woff2" },
          ],
        },
      },
    });
    expect(theme.fonts.body).toEqual({ kind: "upload", family: "Brand Sans", files: [{ weight: 400, url: "/api/files/brand/sans_1.woff2" }] });
  });

  test("a font family cannot inject CSS", () => {
    const theme = normalizeTheme({ fonts: { body: { kind: "google", family: 'X"; } body { display:none } /*' } } });
    expect(theme.fonts.body).toEqual(DEFAULT_THEME.fonts.body);
  });
});

describe("colour maths", () => {
  test("contrast ratio matches WCAG reference values", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 1);
    expect(contrastRatio("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
    expect(contrastRatio("#767676", "#FFFFFF")).toBeCloseTo(4.54, 1);
  });

  test("readable text colour flips with the background", () => {
    expect(readableOn("#111827")).toBe("#FFFFFF");
    expect(readableOn("#FDE68A")).toBe("#0F172A");
  });

  test("shade keeps the hue and clamps lightness", () => {
    expect(shade("#808080", 1)).toBe("#ffffff");
    expect(shade("#808080", -1)).toBe("#000000");
    expect(mix("#000000", "#FFFFFF", 0.5)).toBe("#808080");
  });

  test("isHexColor accepts only #RRGGBB", () => {
    expect(isHexColor("#A1b2C3")).toBe(true);
    expect(isHexColor("#abc")).toBe(false);
    expect(isHexColor("rgb(0,0,0)")).toBe(false);
  });

  test("warnings flag unreadable choices", () => {
    expect(themeWarnings(normalizeTheme({ primary: "#FFFF00", accent: "#7C7C7C" }))).toEqual(expect.arrayContaining(["primaryOnLight", "accentButtonText"]));
    expect(themeWarnings(normalizeTheme({ primary: "#1E3A8A", accent: "#2563EB" }))).toEqual([]);
  });
});

describe("generated CSS", () => {
  test("variables are RGB channels for both modes and a full tonal palette", () => {
    const { common, dark, light } = themeVariables(normalizeTheme({ primary: "#FF0000", accent: "#00FF00" }));
    expect(common["--brand-primary"]).toBe("255 0 0");
    expect(common["--brand-accent"]).toBe("0 255 0");
    for (const tone of THEME_TONES) expect(common[`--brand-tone-${tone}`]).toMatch(/^\d+ \d+ \d+$/);
    expect(dark["--ui-ink"]).not.toBe(light["--ui-ink"]);
    expect(light["--brand-bg-surface"]).toBe("255 255 255");
  });

  test("stylesheet declares uploaded fonts once and both modes", () => {
    const css = themeStylesheet(
      normalizeTheme({
        fonts: {
          body: { kind: "upload", family: "Brand", files: [{ weight: 400, url: "/api/files/brand/b_1.woff2" }] },
          heading: { kind: "upload", family: "Brand", files: [{ weight: 400, url: "/api/files/brand/b_1.woff2" }] },
        },
      }),
    );
    expect(css.match(/@font-face/g)).toHaveLength(1);
    expect(css).toContain(":root{");
    expect(css).toContain("html.dark{");
    expect(css).toContain("html.light{");
    expect(css).toContain('--brand-font-body:"Brand"');
  });

  test("Google Fonts URL requests only weights each family has", () => {
    expect(googleFontsHref(normalizeTheme({ fonts: { body: { kind: "system" }, heading: { kind: "system" } } }))).toBeNull();
    const href = googleFontsHref(normalizeTheme({ fonts: { body: { kind: "google", family: "Almarai" }, heading: { kind: "google", family: "Almarai" } } }))!;
    expect(href).toBe("https://fonts.googleapis.com/css2?family=Almarai:wght@300;400;700&display=swap");
  });
});
