import { describe, expect, test } from "vitest";
import { runCheck } from "./run-check";

// Checks that need no database: copy and language rules, permissions, engines, security boundaries, branding.
const STATIC_CHECKS = [
  "check-brand-neutral",
  "check-copy",
  "check-i18n",
  "check-message-format",
  "check-platform",
  "check-approvals",
  "check-admin-navigation",
  "check-admin-dashboard",
  "check-admin-plan",
  "check-audit-security",
  "check-hrms",
  "check-payroll-engine",
  "check-upload-storage",
];

describe("static checks", () => {
  test.each(STATIC_CHECKS)("%s", async (name) => {
    const { ok, output } = await runCheck(name);
    expect(ok, output).toBe(true);
  });
});
