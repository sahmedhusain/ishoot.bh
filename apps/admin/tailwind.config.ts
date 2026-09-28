import type { Config } from "tailwindcss";
import sharedConfig from "@ishoot/config";

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
        m3: {
          surface: {
            DEFAULT: "var(--ishoot-bg-base)",
            container: "var(--ishoot-bg-surface)",
            high: "var(--ishoot-bg-elevated)",
          },
          primary: {
            DEFAULT: "#014842",
            container: "#E6F5F2",
          },
          secondary: {
            DEFAULT: "#09937F",
          },
        },
      },
      borderRadius: {
        m3: "1rem",
        "m3-lg": "1.5rem",
        "m3-full": "9999px",
      },
      boxShadow: {
        "m3-1":
          "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
        "m3-2":
          "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        "m3-3":
          "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
      },
    },
  },
};

export default config;
