import type { Config } from "tailwindcss";

const config: Omit<Config, "content"> = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#014842", 
          light: "#02665D",
          dark: "#002D29",
        },
        accent: {
          DEFAULT: "#09937F", 
          hover: "#0BB49B",
          glow: "rgba(9, 147, 127, 0.35)",
        },
        bg: {
          base: "#ffffff", 
          surface: "#F8FAFC", 
          elevated: "#F1F5F9", 
        },
        border: {
          subtle: "#E2E8F0",
          emerald: "rgba(9, 147, 127, 0.20)",
          active: "#09937F",
        },
        text: {
          primary: "#0F172A", 
          secondary: "#475569", 
          accent: "#09937F",
        },
      },
      fontFamily: {
        display: ['"Thmanyah Serif Display"', "serif"],
        arabic: ['"Thmanyah Sans"', "sans-serif"],
        sans: ['"Thmanyah Sans"', "sans-serif"],
        serif: ['"Thmanyah Serif Text"', "serif"],
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
  plugins: [require("tailwindcss-animate")],
};

export default config;
