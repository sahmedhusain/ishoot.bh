import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";
import plugin from "tailwindcss/plugin";

const brand = (variable: string) => `rgb(var(${variable}) / <alpha-value>)`;
const config: Omit<Config, "content"> = {
  darkMode: "class",
  theme: {
    extend: {
      // Every brand colour is a CSS variable (RGB channels) written by each app from the company theme,
      // so one build serves any company and opacity modifiers (bg-primary/20) keep working.
      colors: {
        primary: {
          DEFAULT: brand("--brand-primary"),
          light: brand("--brand-primary-light"),
          dark: brand("--brand-primary-dark"),
          hover: brand("--brand-primary-hover"),
          foreground: brand("--brand-on-primary"),
        },
        accent: {
          DEFAULT: brand("--brand-accent"),
          hover: brand("--brand-accent-hover"),
          pressed: brand("--brand-accent-pressed"),
          foreground: brand("--brand-on-accent"),
          glow: "rgb(var(--brand-accent) / 0.35)",
        },
        mint: brand("--brand-mint"),
        // Tonal palette of the accent (Material-style): tone-5 near black … tone-95 near white.
        tone: Object.fromEntries(
          [5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 95].map((t) => [
            t,
            brand(`--brand-tone-${t}`),
          ]),
        ),
        brand: {
          base: brand("--brand-bg-base"),
          surface: brand("--brand-bg-surface"),
          elevated: brand("--brand-bg-elevated"),
          text: brand("--brand-text-accent"),
        },
        bg: {
          base: "#ffffff",
          surface: "#F8FAFC",
          elevated: "#F1F5F9",
        },
        border: {
          subtle: "#E2E8F0",
          emerald: "rgb(var(--brand-accent) / 0.20)",
          active: brand("--brand-accent"),
        },
        text: {
          primary: "#0F172A",
          secondary: "#475569",
          accent: brand("--brand-accent"),
        },
        ink: {
          DEFAULT: brand("--ui-ink"),
          muted: brand("--ui-ink-muted"),
        },
        // Material Design 3 (M3) Semantic System Roles
        m3: {
          primary: brand("--m3-color-primary"),
          "on-primary": brand("--m3-color-on-primary"),
          "primary-container": brand("--m3-color-primary-container"),
          "on-primary-container": brand("--m3-color-on-primary-container"),
          secondary: brand("--m3-color-secondary"),
          "on-secondary": brand("--m3-color-on-secondary"),
          "secondary-container": brand("--m3-color-secondary-container"),
          "on-secondary-container": brand("--m3-color-on-secondary-container"),
          tertiary: brand("--m3-color-tertiary"),
          "on-tertiary": brand("--m3-color-on-tertiary"),
          "tertiary-container": brand("--m3-color-tertiary-container"),
          "on-tertiary-container": brand("--m3-color-on-tertiary-container"),
          error: brand("--m3-color-error"),
          "on-error": brand("--m3-color-on-error"),
          "error-container": brand("--m3-color-error-container"),
          "on-error-container": brand("--m3-color-on-error-container"),
          surface: brand("--m3-color-surface"),
          "surface-dim": brand("--m3-color-surface-dim"),
          "surface-bright": brand("--m3-color-surface-bright"),
          "surface-container-lowest": brand(
            "--m3-color-surface-container-lowest",
          ),
          "surface-container-low": brand("--m3-color-surface-container-low"),
          "surface-container": brand("--m3-color-surface-container"),
          "surface-container-high": brand("--m3-color-surface-container-high"),
          "surface-container-highest": brand(
            "--m3-color-surface-container-highest",
          ),
          "on-surface": brand("--m3-color-on-surface"),
          "on-surface-variant": brand("--m3-color-on-surface-variant"),
          outline: brand("--m3-color-outline"),
          "outline-variant": brand("--m3-color-outline-variant"),
          "inverse-surface": brand("--m3-color-inverse-surface"),
          "inverse-on-surface": brand("--m3-color-inverse-on-surface"),
          "inverse-primary": brand("--m3-color-inverse-primary"),
        },
      },
      borderRadius: {
        brand: "var(--brand-radius)",
        "m3-none": "var(--md-sys-shape-corner-none, 0px)",
        "m3-xs": "var(--md-sys-shape-corner-extra-small, 4px)",
        "m3-sm": "var(--md-sys-shape-corner-small, 8px)",
        "m3-md": "var(--md-sys-shape-corner-medium, 12px)",
        "m3-lg": "var(--md-sys-shape-corner-large, 16px)",
        "m3-xl": "var(--md-sys-shape-corner-extra-large, 28px)",
        "m3-full": "var(--md-sys-shape-corner-full, 9999px)",
      },
      boxShadow: {
        "m3-0": "var(--md-sys-elevation-level0, none)",
        "m3-1":
          "var(--md-sys-elevation-level1, 0 1px 2px 0 rgba(0, 0, 0, 0.05), 0 1px 3px 1px rgba(0, 0, 0, 0.08))",
        "m3-2":
          "var(--md-sys-elevation-level2, 0 2px 4px 0 rgba(0, 0, 0, 0.08), 0 4px 6px 2px rgba(0, 0, 0, 0.10))",
        "m3-3":
          "var(--md-sys-elevation-level3, 0 4px 8px 3px rgba(0, 0, 0, 0.10), 0 8px 12px 4px rgba(0, 0, 0, 0.12))",
        "m3-4":
          "var(--md-sys-elevation-level4, 0 6px 10px 4px rgba(0, 0, 0, 0.12), 0 10px 16px 5px rgba(0, 0, 0, 0.14))",
        "m3-5":
          "var(--md-sys-elevation-level5, 0 8px 12px 6px rgba(0, 0, 0, 0.14), 0 12px 20px 7px rgba(0, 0, 0, 0.16))",
      },
      fontFamily: {
        display: ["var(--brand-font-heading)"],
        arabic: ["var(--brand-font-body)"],
        sans: ["var(--brand-font-body)"],
        serif: ["var(--brand-font-heading)"],
      },
      animation: {
        shutter: "shutter 3s ease-in-out infinite",
        marquee: "marquee 25s linear infinite",
        "fade-in": "fadeIn 0.5s ease-out forwards",
        // Motion tokens: one entrance for pages, one for items in a list or grid, one for popovers.
        "page-in": "fadeUp var(--motion-slow) var(--ease-emphasized) both",
        "fade-up": "fadeUp var(--motion-slow) var(--ease-emphasized) both",
        "scale-in": "scaleIn var(--motion-base) var(--ease-emphasized) both",
        shimmer: "shimmer 1.6s linear infinite",
      },
      transitionDuration: {
        fast: "var(--motion-fast)",
        base: "var(--motion-base)",
        slow: "var(--motion-slow)",
      },
      transitionTimingFunction: {
        standard: "var(--ease-standard)",
        emphasized: "var(--ease-emphasized)",
        exit: "var(--ease-exit)",
      },
      keyframes: {
        fadeUp: {
          from: {
            opacity: "0",
            transform: "translateY(var(--motion-distance))",
          },
          to: { opacity: "1", transform: "none" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "none" },
        },
        shimmer: {
          from: { backgroundPosition: "200% 0" },
          to: { backgroundPosition: "-200% 0" },
        },
        shutter: {
          "0%, 100%": { opacity: "0.4", transform: "scale(0.98)" },
          "50%": { opacity: "1", transform: "scale(1)" },
        },
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
        fadeIn: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      backdropBlur: {
        xs: "2px",
        glass: "24px",
      },
    },
  },
  plugins: [
    animate,
    // Motion tokens shared by both apps, and the one place reduced motion is honoured for all of them.
    plugin(({ addBase, addUtilities }) => {
      addBase({
        ":root": {
          "--motion-fast": "120ms",
          "--motion-base": "200ms",
          "--motion-slow": "320ms",
          "--motion-stagger": "40ms",
          "--motion-distance": "10px",
          "--ease-standard": "cubic-bezier(0.2, 0, 0, 1)",
          "--ease-emphasized": "cubic-bezier(0.16, 1, 0.3, 1)",
          "--ease-exit": "cubic-bezier(0.3, 0, 1, 1)",
        },
        "@media (prefers-reduced-motion: reduce)": {
          ":root": {
            "--motion-fast": "0.01ms",
            "--motion-base": "0.01ms",
            "--motion-slow": "0.01ms",
            "--motion-stagger": "0ms",
            "--motion-distance": "0px",
          },
          "*, *::before, *::after": {
            animationDuration: "0.01ms !important",
            animationIterationCount: "1 !important",
            animationDelay: "0ms !important",
            transitionDuration: "0.01ms !important",
            scrollBehavior: "auto !important",
          },
        },
      });
      addUtilities({
        // Children enter one after another (the first twelve; later ones with the twelfth).
        ".stagger-children > *": {
          animation: "fadeUp var(--motion-slow) var(--ease-emphasized) both",
        },
        ...Object.fromEntries(
          Array.from({ length: 12 }, (_, i) => [
            `.stagger-children > *:nth-child(${i + 1})`,
            { animationDelay: `calc(var(--motion-stagger) * ${i})` },
          ]),
        ),
        ".stagger-children > *:nth-child(n + 13)": {
          animationDelay: "calc(var(--motion-stagger) * 12)",
        },
        // Placeholder blocks while content loads.
        ".skeleton": {
          backgroundImage:
            "linear-gradient(90deg, rgb(var(--ui-ink, 15 23 42) / 0.06) 25%, rgb(var(--ui-ink, 15 23 42) / 0.12) 37%, rgb(var(--ui-ink, 15 23 42) / 0.06) 63%)",
          backgroundSize: "400% 100%",
          animation: "shimmer 1.6s linear infinite",
        },
        // Pressed state for clickable cards and tiles.
        ".press": {
          transition: "transform var(--motion-fast) var(--ease-standard)",
        },
        ".press:active": { transform: "scale(0.98)" },
      });
    }),
  ],
};

export default config;
