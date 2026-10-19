import { defineConfig } from "vitest/config";

// Unit tests for pure business logic, plus the scripts/check-*.cjs suites run as test cases (tests/checks).
export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/checks/**/*.test.ts"],
    environment: "node",
    testTimeout: 180_000,
    hookTimeout: 180_000,
    pool: "forks",
    reporters: process.env.CI ? ["default", "junit", "github-actions"] : ["default"],
    outputFile: { junit: "tests/.results/vitest-junit.xml" },
  },
});
