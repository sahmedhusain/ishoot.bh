import { expect, test } from "vitest";
import vm from "node:vm";
import {
  ADMIN_DESIGN_PRESETS,
  APPEARANCE_OPTIONS,
  DEFAULT_APPEARANCE,
  appearanceBootstrapScript,
  normalizeAdminAppearance,
} from "../../apps/admin/lib/admin-appearance";

test("appearance choices accept only supported keys and values", () => {
  for (const input of [
    null,
    false,
    42,
    "compact",
    [],
    { density: "unknown", motion: "<script>" },
  ])
    expect(normalizeAdminAppearance(input)).toEqual(DEFAULT_APPEARANCE);
  expect(
    normalizeAdminAppearance({
      density: "compact",
      backdrop: "dim",
      unknown: "value",
    }),
  ).toEqual({ ...DEFAULT_APPEARANCE, density: "compact", backdrop: "dim" });
  for (const preset of Object.values(ADMIN_DESIGN_PRESETS))
    expect(normalizeAdminAppearance(preset)).toEqual(preset);
});

test("the initial document and hydrated settings normalize every choice identically", () => {
  for (const [key, options] of Object.entries(APPEARANCE_OPTIONS))
    for (const value of options) {
      const stored = { [key]: value, unknown: "ignored" };
      const dataset = {};
      vm.runInNewContext(appearanceBootstrapScript(), {
        localStorage: { getItem: () => JSON.stringify(stored) },
        document: { documentElement: { dataset } },
      });
      expect(dataset).toEqual(normalizeAdminAppearance(stored));
    }
});

test("blocked storage and malformed preferences never break initial rendering", () => {
  for (const getItem of [
    () => "{",
    () => {
      throw new Error("Storage blocked");
    },
  ])
    expect(() =>
      vm.runInNewContext(appearanceBootstrapScript(), {
        localStorage: { getItem },
        document: { documentElement: { dataset: {} } },
      }),
    ).not.toThrow();
});
