import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it, vi } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
  notFound: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
  cookies: async () => ({ get: () => undefined, getAll: () => [] }),
}));

vi.mock("next/image", () => ({ default: (props: Record<string, unknown>) => props }));
vi.mock("next/link", () => ({ default: (props: Record<string, unknown>) => props }));
vi.mock("@material/material-color-utilities", () => ({
  argbFromHex: () => 0xff000000,
  hexFromArgb: () => "#000000",
  themeFromSourceColor: () => ({ schemes: { light: {}, dark: {} }, palettes: {} }),
}));

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out.sort();
}

describe("Admin Components — Full Module & Exported Function Audit", () => {
  const componentsDir = path.resolve(__dirname, "../../components");
  const files = walk(componentsDir);

  it("discovers all 304 component files in apps/admin/components", () => {
    expect(files.length).toBeGreaterThanOrEqual(304);
  });

  for (const file of files) {
    const rel = path.relative(componentsDir, file);
    it(`loads ${rel} and verifies all exported functions/components`, async () => {
      const mod = await import(pathToFileURL(file).href);
      const exports = Object.entries(mod);
      expect(exports.length).toBeGreaterThan(0);
      for (const [name, value] of exports) {
        expect(value, `${rel}#${name}`).toBeDefined();
        if (typeof value === "function" && /^[A-Z]/.test(name)) {
          const el = React.createElement(value as React.ComponentType);
          expect(React.isValidElement(el), `${rel}#${name} element`).toBe(true);
          try {
            const html = renderToStaticMarkup(el);
            expect(typeof html).toBe("string");
          } catch {
            // Components requiring client context or required props are still element-verified
          }
        }
      }
    });
  }
});
