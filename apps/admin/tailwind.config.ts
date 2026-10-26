import type { Config } from "tailwindcss";
import sharedConfig from "@platform/config";

// Theme-aware colours resolve through CSS variables (app/globals.css), so one class is correct in
// both light and dark mode. Brand colours, ink and fonts come from the shared preset (company theme).
const themed = (variable: string) => `rgb(var(${variable}) / <alpha-value>)`;

const config: Config = {
  presets: [sharedConfig as any],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    // Class maps also live in constants (status/priority pills) and lib helpers.
    "./constants/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Latin monospace first; Arabic glyphs fall back to the company's body font instead of a system font.
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
        surface: {
          DEFAULT: themed("--ui-surface"),
          raised: themed("--ui-surface-raised"),
          sunken: themed("--ui-surface-sunken"),
        },
        // Secondary-text greys follow the theme so the same class reads well on white and on dark.
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
