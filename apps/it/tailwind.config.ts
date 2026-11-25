import type { Config } from "tailwindcss";
import sharedConfig from "./lib/config/tailwind-preset";

const themed = (variable: string) => `rgb(var(${variable}) / <alpha-value>)`;

const config: Config = {
  presets: [sharedConfig as any],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
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
      fontFamily: {
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "var(--it-font-sans)",
          "monospace",
        ],
      },
      colors: {
        surface: {
          DEFAULT: themed("--ui-surface"),
          raised: themed("--ui-surface-raised"),
          sunken: themed("--ui-surface-sunken"),
          muted: themed("--ui-surface-muted"),
          variant: themed("--ui-surface-container"),
          "container-lowest": themed("--ui-surface"),
          "container-low": themed("--ui-surface"),
          container: themed("--ui-surface-container"),
          "container-high": themed("--ui-surface-container-high"),
          "container-highest": themed("--ui-surface-container-high"),
          dim: themed("--ui-surface-sunken"),
          bright: themed("--ui-surface"),
        },
        outline: {
          DEFAULT: themed("--ui-outline"),
          variant: themed("--ui-outline-variant"),
        },
        rule: themed("--ui-rule"),
        danger: themed("--ui-danger"),
        "accent-ink": themed("--brand-on-accent"),
        "primary-contrast": themed("--brand-on-primary"),
        "on-surface": themed("--ui-ink"),
        "on-surface-variant": themed("--ui-ink-muted"),
        "primary-container": themed("--ui-primary-container"),
        "on-primary-container": themed("--ui-on-primary-container"),
      },
    },
  },
};

export default config;
