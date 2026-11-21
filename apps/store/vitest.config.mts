import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const alias = [
  { find: /^@platform\/database\/(.*)$/, replacement: path.resolve(__dirname, "./lib/$1") },
  { find: "@platform/database", replacement: path.resolve(__dirname, "./lib/data-hub.ts") },
  { find: "@platform/contracts/catalog", replacement: path.resolve(__dirname, "./lib/contracts/catalog") },
  { find: "@platform/contracts", replacement: path.resolve(__dirname, "./lib/contracts/src") },
  { find: "@platform/locales", replacement: path.resolve(__dirname, "./locales") },
  { find: "@platform/config", replacement: path.resolve(__dirname, "./lib/config") },
  { find: "@platform/api-client", replacement: path.resolve(__dirname, "./lib/api") },
  { find: "@platform/email", replacement: path.resolve(__dirname, "./lib/email") },
  { find: "@platform/ui", replacement: path.resolve(__dirname, "./components/ui") },
  { find: "@platform/database/decimal", replacement: path.resolve(__dirname, "./lib/decimal.ts") },
  { find: "@", replacement: path.resolve(__dirname, "./") },
];

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
        },
      },
    ],
  },
});
