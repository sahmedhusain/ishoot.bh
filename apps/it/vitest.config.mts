import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@platform/contracts/catalog": path.resolve(__dirname, "./lib/contracts/catalog"),
      "@platform/contracts": path.resolve(__dirname, "./lib/contracts/src"),
      "@platform/locales": path.resolve(__dirname, "./locales"),
      "@platform/config": path.resolve(__dirname, "./lib/config"),
      "@platform/api-client": path.resolve(__dirname, "./lib/api"),
      "@platform/ui": path.resolve(__dirname, "./components/ui"),
      "@": path.resolve(__dirname, "./"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    testTimeout: 30_000,
  },
});
