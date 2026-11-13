import type { Config } from "tailwindcss";
import sharedConfig from "./lib/config/tailwind-preset";

const themed = (variable: string) => `rgb(var(${variable}) / <alpha-value>)`;

const config: Config = {
  presets: [sharedConfig as any],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontSize: {
        xs: ["0.75rem", "1rem"],
        sm: ["0.875rem", "1.25rem"],
        base: ["1rem", "1.5rem"],
        lg: ["1.375rem", "1.75rem"],
        xl: ["1.5rem", "2rem"],
        "2xl": ["1.75rem", "2.25rem"],
        "3xl": ["2rem", "2.5rem"],
        "4xl": ["2.25rem", "2.75rem"],
        "5xl": ["2.8125rem", "3.25rem"],
        "6xl": ["3.5625rem", "4rem"],
      },
      borderRadius: { "3xl": "var(--md-sys-shape-corner-extra-large)" },
      fontFamily: {
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "var(--brand-font-body)",
          "monospace",
        ],
      },
      colors: {
        white: "rgb(var(--site-fg, 255 255 255) / <alpha-value>)",
        paper: "#ffffff",
        surface: {
          DEFAULT: themed("--ui-surface"),
          raised: themed("--ui-surface-raised"),
          sunken: themed("--ui-surface-sunken"),
          "container-lowest": themed("--m3-color-surface-container-lowest"),
          "container-low": themed("--m3-color-surface-container-low"),
          container: themed("--m3-color-surface-container"),
          "container-high": themed("--m3-color-surface-container-high"),
          "container-highest": themed("--m3-color-surface-container-highest"),
          dim: themed("--m3-color-surface-dim"),
          bright: themed("--m3-color-surface-bright"),
        },
        outline: {
          DEFAULT: themed("--m3-color-outline"),
          variant: themed("--m3-color-outline-variant"),
        },
        "on-surface": themed("--m3-color-on-surface"),
        "on-surface-variant": themed("--m3-color-on-surface-variant"),
        "primary-container": themed("--m3-color-primary-container"),
        "on-primary-container": themed("--m3-color-on-primary-container"),
        "secondary-container": themed("--m3-color-secondary-container"),
        "on-secondary-container": themed("--m3-color-on-secondary-container"),
        "tertiary-container": themed("--m3-color-tertiary-container"),
        "on-tertiary-container": themed("--m3-color-on-tertiary-container"),
        slate: { 400: themed("--ui-slate-400") },
        neutral: { 400: themed("--ui-neutral-400") },
        gray: { 400: themed("--ui-gray-400") },
        emerald: {
          400: themed("--ui-emerald-400"),
          500: themed("--ui-emerald-500"),
        },
        amber: {
          400: themed("--ui-amber-400"),
          500: themed("--ui-amber-500"),
          600: themed("--ui-amber-600"),
        },
        rose: { 400: themed("--ui-rose-400") },
        blue: { 400: themed("--ui-blue-400") },
      },
    },
  },
};

export default config;
