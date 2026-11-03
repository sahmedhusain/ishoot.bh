-- Buyer VAT registration for tax invoices.
ALTER TABLE "CrmContact" ADD COLUMN "vatNumber" TEXT;

-- Expenses created before net/VAT tracking stored netAmount = 0, which made reports count them as zero.
UPDATE "Expense"
SET
    "netAmount" = "amount" - "inputVatAmount"
WHERE
    "netAmount" = 0
    AND "amount" > 0;

-- Line totals are rounded to the currency's minor unit (3 decimals for BHD) like the document totals.
UPDATE "InvoiceLineItem"
SET
    "lineTotal" = ROUND("quantity" * "unitPrice", 3)
WHERE
    "lineTotal" <> ROUND("quantity" * "unitPrice", 3);