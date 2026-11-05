import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@platform/contracts/catalog": path.resolve(__dirname, "./lib/contracts/catalog"),
      "@platform/contracts": path.resolve(__dirname, "./lib/contracts/src"),
      "@platform/database": path.resolve(__dirname, "./lib/database"),
      "@platform/locales": path.resolve(__dirname, "./locales"),
      "@platform/config": path.resolve(__dirname, "./lib/config"),
      "@platform/api-client": path.resolve(__dirname, "./lib/api"),
      "@platform/email": path.resolve(__dirname, "./lib/email"),
      "@platform/ui": path.resolve(__dirname, "./components/ui"),
      "@prisma/client": path.resolve(__dirname, "./lib/database/prisma-stub.ts"),
      "@": path.resolve(__dirname, "./"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    testTimeout: 30_000,
  },
});
