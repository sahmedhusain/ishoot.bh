import { afterEach, expect, test, vi } from "vitest";
import { prefersReducedMotion } from "@platform/ui/count-up";

afterEach(() => vi.unstubAllGlobals());
test.each(["reduced", "none"])(
  "JavaScript motion honors the saved %s preference",
  (motion) => {
    vi.stubGlobal("window", { matchMedia: () => ({ matches: false }) });
    vi.stubGlobal("document", { documentElement: { dataset: { motion } } });
    expect(prefersReducedMotion()).toBe(true);
  },
);
test("system motion follows the OS and notices a setting changed during animation", () => {
  let osReduced = false;
  const dataset = { motion: "system" };
  vi.stubGlobal("window", { matchMedia: () => ({ matches: osReduced }) });
  vi.stubGlobal("document", { documentElement: { dataset } });
  expect(prefersReducedMotion()).toBe(false);
  osReduced = true;
  expect(prefersReducedMotion()).toBe(true);
  osReduced = false;
  dataset.motion = "none";
  expect(prefersReducedMotion()).toBe(true);
});
