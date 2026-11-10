import { describe, expect, it } from "vitest";
import {
  amountDue,
  isFullyPaid,
  lineTotal,
  moneyFactor,
  paymentStatusFor,
  roundMoney,
  sumMoney,
  toMinorUnits,
  validMoneyAmount,
} from "../../lib/finance/money";
import { documentTaxRows, mapDocumentTaxLines } from "../../lib/finance/vat";

describe("Web VAT & Money Financial Suite", () => {
  it("calculates correct minor units and rounding for BHD (3 decimals) and USD (2 decimals)", () => {
    expect(moneyFactor("BHD")).toBe(1000);
    expect(moneyFactor("USD")).toBe(100);

    expect(toMinorUnits(12.345, "BHD")).toBe(12345);
    expect(toMinorUnits(12.34, "USD")).toBe(1234);

    expect(roundMoney(12.3456, "BHD")).toBe(12.346);
    expect(roundMoney(12.3456, "USD")).toBe(12.35);
  });

  it("calculates line totals and sums accurately", () => {
    expect(lineTotal(3, 10.5, "USD")).toBe(31.5);
    expect(sumMoney([10.25, 20.75, "5.00"], "USD")).toBe(36);
  });

  it("evaluates payment status and amount due", () => {
    expect(amountDue(100, 40, "USD")).toBe(60);
    expect(amountDue(100, 100, "USD")).toBe(0);

    expect(isFullyPaid(100, 100, "USD")).toBe(true);
    expect(isFullyPaid(100, 99.99, "USD")).toBe(false);

    expect(paymentStatusFor(100, 0, "USD")).toBeNull();
    expect(paymentStatusFor(100, 50, "USD")).toBe("partially_paid");
    expect(paymentStatusFor(100, 100, "USD")).toBe("paid");
  });

  it("validates valid money amounts", () => {
    expect(validMoneyAmount(10.5, "USD")).toBe(true);
    expect(validMoneyAmount(0, "USD", false)).toBe(false);
    expect(validMoneyAmount(0, "USD", true)).toBe(true);
    expect(validMoneyAmount(-5, "USD")).toBe(false);
  });

  it("maps document tax lines and tax rows correctly", () => {
    const taxes = [
      {
        id: "tax-1",
        code: "VAT10",
        nameEn: "VAT 10%",
        nameAr: "ضريبة القيمة المضافة 10%",
        rate: 10,
        registrationNumber: "TRN123456",
      },
    ];
    const amounts = [{ code: "VAT10", amount: 5.5 }];

    const rows = documentTaxRows(taxes, amounts);
    expect(rows).toHaveLength(1);
    expect(rows[0].code).toBe("VAT10");
    expect(rows[0].amount).toBe(5.5);

    const mapped = mapDocumentTaxLines([
      { code: "VAT10", nameEn: "VAT", nameAr: "ضريبة", ratePercent: 10, registrationNumber: "TRN123", amount: 5.5 },
    ]);
    expect(mapped).toHaveLength(1);
    expect(mapped[0].rate).toBe(10);
    expect(mapped[0].amount).toBe(5.5);
  });
});
