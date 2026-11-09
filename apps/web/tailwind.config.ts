import type { Config } from "tailwindcss";
import sharedConfig from "./lib/config/tailwind-preset";

const config: Config = {
  presets: [sharedConfig as any],
  theme: {
    extend: {
      colors: {
        white: "rgb(var(--site-fg, 255 255 255) / <alpha-value>)",
        paper: "#ffffff",
      },
    },
  },
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
};

export default config;
