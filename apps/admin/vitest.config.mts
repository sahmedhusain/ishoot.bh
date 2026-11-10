import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@platform\/database\/(.*)$/, replacement: path.resolve(__dirname, "./lib/$1") },
      { find: "@platform/database", replacement: path.resolve(__dirname, "./lib/data-hub.ts") },
      { find: "@platform/contracts/catalog", replacement: path.resolve(__dirname, "./lib/contracts/catalog") },
      { find: "@platform/contracts", replacement: path.resolve(__dirname, "./lib/contracts/src") },
      { find: "@platform/locales", replacement: path.resolve(__dirname, "./locales") },
      { find: "@platform/config", replacement: path.resolve(__dirname, "./lib/config") },
      { find: "@platform/api-client", replacement: path.resolve(__dirname, "./lib/api") },
      { find: "@platform/email", replacement: path.resolve(__dirname, "./lib/email") },
      { find: "@platform/ui", replacement: path.resolve(__dirname, "./components/ui") },
      { find: "@material/material-color-utilities", replacement: path.resolve(__dirname, "./node_modules/@material/material-color-utilities/index.js") },
      { find: "@platform/database/decimal", replacement: path.resolve(__dirname, "./lib/decimal.ts") },
      { find: "@", replacement: path.resolve(__dirname, "./") },
    ],
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    testTimeout: 30_000,
    env: {
      API_URL: "http://127.0.0.1:8080",
      SERVICE_KEY: "test-key",
    },
  },
});
