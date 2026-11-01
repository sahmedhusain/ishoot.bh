import type { Config } from "tailwindcss";
import adminConfig from "../admin/tailwind.config";

// The IT dashboard shares the admin's design system (tokens, Material roles, type scale); only the files Tailwind
// scans differ.
const config: Config = {
  ...adminConfig,
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
};

export default config;
