-- Payroll lines can be adjusted per employee before submission: bonuses/incentives, deductions and a note.
ALTER TABLE "PayrollItem"
ADD COLUMN "bonus" DECIMAL(12, 3) NOT NULL DEFAULT 0.000;

ALTER TABLE "PayrollItem" ADD COLUMN "adjustmentNote" TEXT;

ALTER TABLE "PayrollItem" ADD COLUMN "editedById" TEXT;

ALTER TABLE "PayrollItem" ADD COLUMN "editedAt" TIMESTAMP(3);

ALTER TABLE "PayrollItem"
ADD CONSTRAINT "PayrollItem_amounts_check" CHECK (
    "basicSalary" >= 0
    AND "housingAllowance" >= 0
    AND "transportAllowance" >= 0
    AND "otherAllowances" >= 0
    AND "bonus" >= 0
    AND "otherDeductions" >= 0
    AND "netSalary" >= 0
);