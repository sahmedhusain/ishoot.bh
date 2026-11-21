import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../../..");
const TEST_DIR = __dirname;

interface ManifestComponent {
  relativePath: string;
  exports: string[];
  calls: Array<{ kind: string; method: string; target: string }>;
}

describe("IT Console Component & API Completeness Gate", () => {
  it("covers 100% of manifest components, exports, and HTTP/Server Action calls with zero bypasses", () => {
    const manifestPath = path.join(ROOT, ".local", "qa-manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const components: ManifestComponent[] = manifest.apps.it.components;

    const testFiles = fs
      .readdirSync(TEST_DIR)
      .filter((f) => /\.test\.tsx?$/.test(f) && f !== "completeness-gate.test.ts")
      .map((f) => ({
        name: f,
        content: fs.readFileSync(path.join(TEST_DIR, f), "utf8"),
      }));

    const combined = testFiles.map((f) => f.content).join("\n");

    for (const file of testFiles) {
      expect(file.content, `${file.name} must not contain empty catch {}`).not.toMatch(/catch\s*(\([^)]*\))?\s*\{\s*\}/);
      expect(file.content, `${file.name} must not skip tests`).not.toMatch(/\b(it|test|describe)\.skip\b/);
    }

    const missingFiles: string[] = [];
    const missingExports: string[] = [];
    const missingCalls: string[] = [];

    for (const comp of components) {
      const stem = comp.relativePath.replace(/\.(tsx?|mjs)$/, "");
      const importStem = stem.endsWith("/index") ? stem.slice(0, -"/index".length) : stem;
      if (!combined.includes(`components/${importStem}`) && !combined.includes(`components/${stem}`)) {
        missingFiles.push(comp.relativePath);
      }
      for (const exp of comp.exports) {
        if (!new RegExp(`\\b${exp}\\b`).test(combined)) {
          missingExports.push(`${comp.relativePath}#${exp}`);
        }
      }
      for (const call of comp.calls) {
        const targetPrefix = call.target.split("${")[0];
        if (!combined.includes(targetPrefix) || !combined.includes(call.method)) {
          missingCalls.push(`${comp.relativePath}:${call.method}:${call.target}`);
        }
      }
    }

    expect(missingFiles, `Missing component files: ${missingFiles.join(", ")}`).toEqual([]);
    expect(missingExports, `Missing component exports: ${missingExports.join(", ")}`).toEqual([]);
    expect(missingCalls, `Missing API/action calls: ${missingCalls.join(", ")}`).toEqual([]);
  });
});
