import { describe, expect, test } from "vitest";
import { runCheck } from "./run-check";

// Business rules against a real Postgres. Every script rolls back its own records, and they only run against
// disposable databases whose names end in _test:
//   CHECKS_BARE_DATABASE_URL    migrated only (these checks count rows or expect no company settings yet)
//   CHECKS_SEEDED_DATABASE_URL  migrated and filled with `pnpm db:seed` (checks that need employees, deals…)
const BARE_CHECKS = ["check-audit-db", "check-followup-db"];
const SEEDED_CHECKS = [
  "check-account-changes-db",
  "check-approval-flows-db",
  "check-approvals-db",
  "check-assets-db",
  "check-calendar-db",
  "check-claims-db",
  "check-client-signatures-db",
  "check-clients-db",
  "check-communications-db",
  "check-communications-pdf",
  "check-customer-identities",
  "check-dashboard-db",
  "check-document-archive-db",
  "check-employee-handovers-db",
  "check-employee-residency-db",
  "check-finance-db",
  "check-gosi-settlement-db",
  "check-hrms-db",
  "check-hrms-pdf",
  "check-open-items-db",
  "check-pay-lines-db",
  "check-payroll-db",
  "check-profile-security-db",
  "check-recurring-expenses-db",
  "check-sales-db",
  "check-signature-db",
  "check-signing-db",
  "check-social-db",
  "check-stats-db",
  "check-support-db",
  "check-taxes-db",
  "check-website",
];

function suite(title: string, url: string | undefined, checks: string[]) {
  const database = url ? new URL(url).pathname.slice(1) : "";
  describe.skipIf(!database.endsWith("_test"))(
    `${title} (${database || "not configured"})`,
    () => {
      test.each(checks)("%s", (name) => {
        const { ok, output } = runCheck(name, {
          DATABASE_URL: url,
          DIRECT_URL: url,
        });
        expect(ok, output).toBe(true);
      });
    },
  );
}

suite(
  "database checks on a bare database",
  process.env.CHECKS_BARE_DATABASE_URL,
  BARE_CHECKS,
);
suite(
  "database checks on seeded demo data",
  process.env.CHECKS_SEEDED_DATABASE_URL,
  SEEDED_CHECKS,
);
