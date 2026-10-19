import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

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
        tone: Object.fromEntries([5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 95].map((t) => [t, brand(`--brand-tone-${t}`)])),
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
      },
      borderRadius: {
        brand: "var(--brand-radius)",
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
      },
      keyframes: {
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
  plugins: [animate],
};

export default config;
