import { describe, expect, test } from "vitest";
import { getTranslations } from "../../packages/locales/src";
import {
  BILL_STATUSES,
  PURCHASE_ORDER_STATUSES,
  REQUISITION_STATUSES,
  RFQ_STATUSES,
  billAfterPayment,
  daysBetween,
  documentTotals,
  matchBillLine,
  orderReceiptStatus,
} from "../../packages/database/src/constants/procurement";
import {
  APPROVAL_CONDITION_FIELDS,
  APPROVAL_TARGET_ROUTES,
  APPROVAL_TARGET_TYPES,
} from "../../packages/database/src/constants/approvals";

describe("procurement", () => {
  test("document totals round each line, then add VAT", () => {
    expect(
      documentTotals(
        [
          { quantity: 3, unitPrice: 1.1115 },
          { quantity: 1, unitPrice: 2 },
        ],
        10,
      ),
    ).toEqual({ subtotal: 5.335, vatAmount: 0.534, total: 5.869 });
    expect(documentTotals([], 10)).toEqual({
      subtotal: 0,
      vatAmount: 0,
      total: 0,
    });
  });

  test("an order is received when every line is, partly received when anything is", () => {
    expect(
      orderReceiptStatus(
        [
          { quantity: 5, receivedQuantity: 5 },
          { quantity: 2, receivedQuantity: 2 },
        ],
        "sent",
      ),
    ).toBe("received");
    expect(
      orderReceiptStatus(
        [
          { quantity: 5, receivedQuantity: 3 },
          { quantity: 2, receivedQuantity: 0 },
        ],
        "sent",
      ),
    ).toBe("partially_received");
    expect(
      orderReceiptStatus([{ quantity: 5, receivedQuantity: 0 }], "approved"),
    ).toBe("approved");
  });

  test("the three-way match flags lines not ordered, billed beyond the order or the receipts, or at another price", () => {
    const order = {
      quantity: 10,
      unitPrice: 4,
      receivedQuantity: 6,
      billedQuantity: 0,
    };
    expect(matchBillLine({ quantity: 6, unitPrice: 4 }, order)).toEqual([]);
    expect(matchBillLine({ quantity: 6, unitPrice: 4.03 }, order)).toEqual([]);
    expect(matchBillLine({ quantity: 6, unitPrice: 4.5 }, order)).toEqual([
      "price",
    ]);
    expect(matchBillLine({ quantity: 7, unitPrice: 4 }, order)).toEqual([
      "over_received",
    ]);
    expect(
      matchBillLine(
        { quantity: 5, unitPrice: 4 },
        { ...order, billedQuantity: 6, receivedQuantity: 10 },
      ),
    ).toEqual(["over_ordered", "over_received"]);
    expect(matchBillLine({ quantity: 1, unitPrice: 1 }, null)).toEqual([
      "not_ordered",
    ]);
  });

  test("payments move a bill from approved to partly paid to paid", () => {
    expect(billAfterPayment(100, 0).status).toBe("approved");
    expect(billAfterPayment(100, 40)).toEqual({
      amountPaid: 40,
      status: "partially_paid",
    });
    expect(billAfterPayment(100, 100.0001).status).toBe("paid");
    expect(daysBetween("2026-10-01", "2026-10-11T22:00:00Z")).toBe(10);
  });

  test("every status has a name in both languages, and the new approval types are wired", () => {
    for (const locale of ["en", "ar"] as const) {
      const statuses = getTranslations(locale).admin.procurement
        .statuses as Record<string, string>;
      for (const status of [
        ...REQUISITION_STATUSES,
        ...RFQ_STATUSES,
        ...PURCHASE_ORDER_STATUSES,
        ...BILL_STATUSES,
      ])
        expect(statuses[status], `${locale} ${status}`).toBeTruthy();
      const types = getTranslations(locale).admin.approvals.types as Record<
        string,
        string
      >;
      for (const type of APPROVAL_TARGET_TYPES)
        expect(types[type], `${locale} ${type}`).toBeTruthy();
    }
    for (const type of ["purchase_requisition", "purchase_order"] as const) {
      expect(APPROVAL_TARGET_TYPES).toContain(type);
      expect(APPROVAL_CONDITION_FIELDS[type]).toEqual(["minAmount"]);
      expect(APPROVAL_TARGET_ROUTES[type]("x")).toContain("/x");
    }
  });
});
