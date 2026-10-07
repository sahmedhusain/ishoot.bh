-- Named payroll additions and deductions (manual per month or recurring per employee), kept apart.
CREATE TABLE "PayrollItemLine" (
  "id" TEXT NOT NULL,
  "payrollItemId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "amount" DECIMAL(12,3) NOT NULL,
  "note" TEXT,
  "source" TEXT NOT NULL DEFAULT 'manual',
  "recurringId" TEXT,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PayrollItemLine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PayrollItemLine_payrollItemId_fkey" FOREIGN KEY ("payrollItemId") REFERENCES "PayrollItem"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PayrollItemLine_kind_check" CHECK ("kind" IN ('addition', 'deduction')),
  CONSTRAINT "PayrollItemLine_source_check" CHECK ("source" IN ('manual', 'recurring')),
  CONSTRAINT "PayrollItemLine_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "PayrollItemLine_label_check" CHECK (BTRIM("label") <> '')
);
CREATE INDEX "PayrollItemLine_payrollItemId_idx" ON "PayrollItemLine"("payrollItemId");

CREATE TABLE "EmployeeRecurringPay" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "amount" DECIMAL(12,3) NOT NULL,
  "startMonth" TEXT NOT NULL,
  "endMonth" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmployeeRecurringPay_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EmployeeRecurringPay_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "EmployeeRecurringPay_kind_check" CHECK ("kind" IN ('addition', 'deduction')),
  CONSTRAINT "EmployeeRecurringPay_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "EmployeeRecurringPay_months_check" CHECK ("startMonth" ~ '^\d{4}-(0[1-9]|1[0-2])$' AND ("endMonth" IS NULL OR ("endMonth" ~ '^\d{4}-(0[1-9]|1[0-2])$' AND "endMonth" >= "startMonth")))
);
CREATE INDEX "EmployeeRecurringPay_employeeId_idx" ON "EmployeeRecurringPay"("employeeId");

-- Existing single bonus / deduction amounts become named lines, using the adjustment note as their label.
INSERT INTO "PayrollItemLine" ("id", "payrollItemId", "kind", "category", "label", "amount", "source")
SELECT gen_random_uuid()::text, id, 'addition', 'bonus', COALESCE(NULLIF(BTRIM("adjustmentNote"), ''), 'Bonus'), "bonus", 'manual'
FROM "PayrollItem" WHERE "bonus" > 0;
INSERT INTO "PayrollItemLine" ("id", "payrollItemId", "kind", "category", "label", "amount", "source", "displayOrder")
SELECT gen_random_uuid()::text, id, 'deduction', 'other', COALESCE(NULLIF(BTRIM("adjustmentNote"), ''), 'Other deduction'), "otherDeductions", 'manual', 1
FROM "PayrollItem" WHERE "otherDeductions" > 0;
