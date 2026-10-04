import type { Config } from "tailwindcss";
import sharedConfig from "@ishoot/config";

// Theme-aware colours resolve through CSS variables (app/globals.css), so one class is correct in
// both light and dark mode. Brand colours (primary, accent) come from the shared preset.
const themed = (variable: string) => `rgb(var(${variable}) / <alpha-value>)`;

const config: Config = {
  presets: [sharedConfig as any],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: { hover: "#013833" },
        accent: { pressed: "#077A68" },
        mint: "#7DE0D1",
        surface: {
          DEFAULT: themed("--ui-surface"),
          raised: themed("--ui-surface-raised"),
          sunken: themed("--ui-surface-sunken"),
        },
        ink: {
          DEFAULT: themed("--ui-ink"),
          muted: themed("--ui-ink-muted"),
        },
      },
    },
  },
};

export default config;
