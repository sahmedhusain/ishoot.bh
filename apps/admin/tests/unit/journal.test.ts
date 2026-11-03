import { expect, test } from "vitest";
import {
  journalMinorUnits,
  validateJournalLines,
  expectedDrawerCash,
} from "../../lib/database/finance/journal";
test("journals balance exactly without binary floating point", () => {
  expect(
    validateJournalLines(
      [
        { accountId: "cash", debit: "0.30", credit: "0" },
        { accountId: "sales", debit: "0", credit: "0.10" },
        { accountId: "sales", debit: "0", credit: "0.20" },
      ],
      "USD",
    ).debitMinor,
  ).toBe(30n);
  expect(() =>
    validateJournalLines(
      [
        { accountId: "cash", debit: "10", credit: "0" },
        { accountId: "sales", debit: "0", credit: "9.99" },
      ],
      "USD",
    ),
  ).toThrow(/balance/);
  expect(() =>
    validateJournalLines(
      [
        { accountId: "cash", debit: "10", credit: "1" },
        { accountId: "sales", debit: "0", credit: "9" },
      ],
      "USD",
    ),
  ).toThrow(/one positive/);
});
test("money preserves currency precision and rejects negative or exponential inputs", () => {
  expect(journalMinorUnits("1.0001", "CLF")).toBe(10001n);
  expect(journalMinorUnits("1.000", "JPY")).toBe(1n);
  for (const value of ["-1", "1e3", "NaN", "1.001"])
    expect(() => journalMinorUnits(value, "USD")).toThrow();
});
test("cash reconciliation excludes noncash and subtracts change only once", () => {
  expect(
    expectedDrawerCash(
      {
        opening: "100",
        receipts: "50",
        change: "5",
        refunds: "10",
        cashIn: "20",
        cashOut: "3",
        drops: "70",
      },
      "BHD",
    ),
  ).toBe(82000n);
});
