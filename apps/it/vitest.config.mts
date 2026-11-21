import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const alias = {
  "@platform/contracts/catalog": path.resolve(__dirname, "./lib/contracts/catalog"),
  "@platform/contracts": path.resolve(__dirname, "./lib/contracts/src"),
  "@platform/locales": path.resolve(__dirname, "./locales"),
  "@platform/config": path.resolve(__dirname, "./lib/config"),
  "@platform/api-client": path.resolve(__dirname, "./lib/api"),
  "@platform/ui": path.resolve(__dirname, "./components/ui"),
  "@material/material-color-utilities": path.resolve(__dirname, "./node_modules/@material/material-color-utilities/index.js"),
  "@": path.resolve(__dirname, "./"),
};

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts"],
          testTimeout: 30_000,
          server: { deps: { inline: [/@material\/material-color-utilities/] } },
        },
      },
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          name: "components",
          environment: "jsdom",
          include: ["tests/components/**/*.test.{ts,tsx}"],
          setupFiles: ["./tests/components/setup.ts"],
          testTimeout: 30_000,
          server: { deps: { inline: [/@material\/material-color-utilities/] } },
        },
      },
    ],
  },
});
