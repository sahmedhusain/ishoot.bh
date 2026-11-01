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
  FONT_LIBRARY,
  FONT_UPLOAD_URL,
  STYLE_PRESETS,
  fontMimeFromName,
  weightFromFileName,
} from "../../packages/database/src/constants/theme";
import { detectFileType } from "../../contracts/src";

describe("normalizeTheme", () => {
  test("missing or broken input falls back to the default theme", () => {
    expect(normalizeTheme(null)).toEqual(DEFAULT_THEME);
    expect(normalizeTheme("nonsense")).toEqual(DEFAULT_THEME);
    expect(
      normalizeTheme({
        primary: "red",
        accent: "#12",
        radius: "huge",
        defaultMode: "dim",
      }),
    ).toEqual(DEFAULT_THEME);
  });

  test("valid values are kept and colours upper-cased", () => {
    const theme = normalizeTheme({
      primary: "#abcdef",
      accent: "#123456",
      radius: "sm",
      defaultMode: "dark",
    });
    expect(theme).toMatchObject({
      primary: "#ABCDEF",
      accent: "#123456",
      radius: "sm",
      defaultMode: "dark",
    });
  });

  test("heading font falls back to the body font", () => {
    const theme = normalizeTheme({
      fonts: { body: { kind: "google", family: "Cairo" } },
    });
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
    expect(theme.fonts.body).toEqual({
      kind: "upload",
      family: "Brand Sans",
      files: [{ weight: 400, url: "/api/files/brand/sans_1.woff2" }],
    });
  });

  test("a font family cannot inject CSS", () => {
    const theme = normalizeTheme({
      fonts: {
        body: { kind: "google", family: 'X"; } body { display:none } /*' },
      },
    });
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
    expect(
      themeWarnings(normalizeTheme({ primary: "#FFFF00", accent: "#7C7C7C" })),
    ).toEqual(expect.arrayContaining(["primaryOnLight", "accentButtonText"]));
    expect(
      themeWarnings(normalizeTheme({ primary: "#1E3A8A", accent: "#2563EB" })),
    ).toEqual([]);
  });
});

describe("generated CSS", () => {
  test("variables are RGB channels for both modes and a full tonal palette", () => {
    const { common, dark, light } = themeVariables(
      normalizeTheme({ primary: "#FF0000", accent: "#00FF00" }),
    );
    expect(common["--brand-primary"]).toBe("255 0 0");
    expect(common["--brand-accent"]).toBe("0 255 0");
    for (const tone of THEME_TONES)
      expect(common[`--brand-tone-${tone}`]).toMatch(/^\d+ \d+ \d+$/);
    expect(dark["--ui-ink"]).not.toBe(light["--ui-ink"]);
    expect(light["--brand-bg-surface"]).toBe("255 255 255");

    // Material Design 3 (M3) System Tokens
    expect(common["--md-sys-shape-corner-extra-large"]).toBe("28px");
    expect(common["--md-sys-shape-corner-full"]).toBe("9999px");
    expect(common["--md-sys-motion-easing-standard"]).toBe(
      "cubic-bezier(0.2, 0, 0, 1)",
    );
    expect(common["--md-sys-motion-easing-emphasized"]).toBe(
      "cubic-bezier(0.05, 0.7, 0.1, 1.0)",
    );
    expect(light["--md-sys-color-primary"]).toMatch(/^#[0-9a-f]{6}$/);
    expect(light["--m3-color-primary"]).toMatch(/^\d+ \d+ \d+$/);
    expect(light["--md-sys-color-surface-container"]).toMatch(/^#[0-9a-f]{6}$/);
    expect(dark["--md-sys-color-primary"]).toMatch(/^#[0-9a-f]{6}$/);
    expect(dark["--md-sys-color-surface-container"]).toMatch(/^#[0-9a-f]{6}$/);
    expect(dark["--md-sys-color-surface"]).not.toBe(
      light["--md-sys-color-surface"],
    );
  });

  test("Material foreground pairs meet AA for every preset and extreme seed colours", () => {
    const themes = [
      ...STYLE_PRESETS.map((preset) => normalizeTheme(preset.theme)),
      ...["#FFFF00", "#FFFFFF", "#000000", "#00FF00"].map((primary) =>
        normalizeTheme({ primary }),
      ),
    ];
    for (const theme of themes) {
      const variables = themeVariables(theme);
      for (const mode of ["light", "dark"] as const) {
        const roles = variables[mode];
        for (const role of [
          "primary",
          "secondary",
          "tertiary",
          "error",
          "primary-container",
          "secondary-container",
          "tertiary-container",
          "error-container",
          "surface",
          "surface-container-highest",
        ]) {
          const onRole = role.startsWith("surface")
            ? "on-surface"
            : `on-${role}`;
          expect(
            contrastRatio(
              roles[`--md-sys-color-${role}`],
              roles[`--md-sys-color-${onRole}`],
            ),
            `${theme.primary}/${mode}/${role}`,
          ).toBeGreaterThanOrEqual(4.5);
        }
        expect(
          contrastRatio(
            roles["--md-sys-color-on-surface-variant"],
            roles["--md-sys-color-surface-container-highest"],
          ),
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  test("Material neutral surfaces and accent roles follow saved appearance settings", () => {
    const neutral = themeVariables(
      normalizeTheme({ primary: "#7F1D1D", surface: "neutral" }),
    );
    for (const mode of ["light", "dark"] as const) {
      const values = neutral[mode]["--m3-color-surface"].split(" ").map(Number);
      expect(Math.max(...values) - Math.min(...values)).toBe(0);
    }
    const first = themeVariables(normalizeTheme({ accent: "#00FF00" }));
    const second = themeVariables(normalizeTheme({ accent: "#FF0000" }));
    expect(first.light["--md-sys-color-tertiary"]).not.toBe(
      second.light["--md-sys-color-tertiary"],
    );
    expect(first.light["--md-sys-color-primary"]).toBe(
      second.light["--md-sys-color-primary"],
    );
  });

  test("stylesheet declares uploaded fonts once and both modes", () => {
    const css = themeStylesheet(
      normalizeTheme({
        fonts: {
          body: {
            kind: "upload",
            family: "Brand",
            files: [{ weight: 400, url: "/api/files/brand/b_1.woff2" }],
          },
          heading: {
            kind: "upload",
            family: "Brand",
            files: [{ weight: 400, url: "/api/files/brand/b_1.woff2" }],
          },
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
    expect(
      googleFontsHref(
        normalizeTheme({
          fonts: { body: { kind: "system" }, heading: { kind: "system" } },
        }),
      ),
    ).toBeNull();
    const href = googleFontsHref(
      normalizeTheme({
        fonts: {
          body: { kind: "google", family: "Almarai" },
          heading: { kind: "google", family: "Almarai" },
        },
      }),
    )!;
    expect(href).toBe(
      "https://fonts.googleapis.com/css2?family=Almarai:wght@300;400;700;800&display=swap",
    );
    const single = googleFontsHref(
      normalizeTheme({
        fonts: {
          body: { kind: "google", family: "Lalezar" },
          heading: { kind: "google", family: "Lalezar" },
        },
      }),
    )!;
    expect(single).toBe(
      "https://fonts.googleapis.com/css2?family=Lalezar:wght@400&display=swap",
    );
  });

  test("uploaded fonts in other formats are declared with their own format", () => {
    const css = themeStylesheet(
      normalizeTheme({
        fonts: {
          body: {
            kind: "upload",
            family: "Thmanyah Sans",
            files: [
              { weight: 700, url: "/api/files/brand/t_1.otf" },
              { weight: 400, url: "/api/files/brand/t_2.ttf" },
            ],
          },
        },
      }),
    );
    expect(css).toContain(
      'url("/api/files/brand/t_1.otf") format("opentype");font-weight:700',
    );
    expect(css).toContain('url("/api/files/brand/t_2.ttf") format("truetype")');
  });

  test("shape and type options become variables; unknown values fall back", () => {
    const theme = normalizeTheme({
      buttonShape: "square",
      fontScale: "lg",
      headingWeight: 800,
      headingCase: "uppercase",
      surface: "neutral",
    });
    const { common } = themeVariables(theme);
    expect(common["--brand-button-radius"]).toBe("0px");
    expect(common["--brand-font-size"]).toBe("17px");
    expect(common["--brand-heading-weight"]).toBe("800");
    expect(common["--brand-heading-case"]).toBe("uppercase");
    expect(
      themeVariables(normalizeTheme({ buttonShape: "rounded", radius: "sm" }))
        .common["--brand-button-radius"],
    ).toBe("0.25rem");
    expect(
      normalizeTheme({
        buttonShape: "blob",
        fontScale: "huge",
        headingWeight: 750,
        headingCase: "x",
        surface: "x",
      }),
    ).toMatchObject({
      buttonShape: DEFAULT_THEME.buttonShape,
      fontScale: "md",
      headingWeight: 700,
      headingCase: "normal",
      surface: "tinted",
    });
  });

  test("neutral surfaces drop the primary hue", () => {
    const tinted = themeVariables(normalizeTheme({ primary: "#7F1D1D" }))
      .light["--brand-bg-base"].split(" ")
      .map(Number);
    const neutral = themeVariables(
      normalizeTheme({ primary: "#7F1D1D", surface: "neutral" }),
    )
      .light["--brand-bg-base"].split(" ")
      .map(Number);
    const spread = (c: number[]) => Math.max(...c) - Math.min(...c);
    expect(spread(neutral)).toBeLessThan(spread(tinted));
    expect(spread(neutral)).toBeLessThanOrEqual(2);
  });
});

describe("font library and files", () => {
  test("every library family is unique and has the regular weight", () => {
    expect(new Set(FONT_LIBRARY.map((f) => f.family)).size).toBe(
      FONT_LIBRARY.length,
    );
    for (const font of FONT_LIBRARY) expect(font.weights).toContain(400);
  });

  test("style presets are valid themes", () => {
    for (const preset of STYLE_PRESETS)
      expect(normalizeTheme(preset.theme)).toMatchObject(preset.theme);
  });

  test("weights are read from font file names", () => {
    expect(weightFromFileName("thmanyahsans-Light.woff2")).toBe(300);
    expect(weightFromFileName("ThmanyahSerifDisplay-Bold.otf")).toBe(700);
    expect(weightFromFileName("Brand-ExtraBold.ttf")).toBe(800);
    expect(weightFromFileName("Brand-SemiBold.ttf")).toBe(600);
    expect(weightFromFileName("Brand-Black.woff")).toBe(900);
    expect(weightFromFileName("Brand-Regular.woff2")).toBe(400);
    expect(weightFromFileName("Brand-500.woff2")).toBe(500);
    expect(weightFromFileName("logo.woff2")).toBeNull();
  });

  test("font types are recognised from names and upload URLs", () => {
    expect(fontMimeFromName("A.OTF")).toBe("font/otf");
    expect(fontMimeFromName("a.woff")).toBe("font/woff");
    expect(fontMimeFromName("a.png")).toBe("");
    expect(FONT_UPLOAD_URL.test("/api/files/brand/a_1.ttf")).toBe(true);
    expect(FONT_UPLOAD_URL.test("/api/files/vault/a_1.ttf")).toBe(false);
    expect(FONT_UPLOAD_URL.test("/api/files/brand/a_1.svg")).toBe(false);
  });
});

describe("font file sniffing", () => {
  const head = (...bytes: number[]) =>
    new Uint8Array([...bytes, 0, 0, 0, 0, 0, 0, 0, 0]);
  test("each accepted font format is recognised from its first bytes", () => {
    expect(detectFileType(head(0x77, 0x4f, 0x46, 0x32))).toBe("font/woff2");
    expect(detectFileType(head(0x77, 0x4f, 0x46, 0x46))).toBe("font/woff");
    expect(detectFileType(head(0x4f, 0x54, 0x54, 0x4f))).toBe("font/otf");
    expect(detectFileType(head(0x00, 0x01, 0x00, 0x00))).toBe("font/ttf");
    expect(detectFileType(head(0x3c, 0x73, 0x76, 0x67))).toBeNull();
  });
});
