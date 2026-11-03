import type { Config } from "tailwindcss";
import sharedConfig from "./lib/config/tailwind-preset";

const config: Config = {
  presets: [sharedConfig as any],
  theme: {
    extend: {
      colors: {
        // The website's foreground is a token: white on the dark website, ink on the light one (html.light).
        // `paper` stays white for text on brand colours and over photos.
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
