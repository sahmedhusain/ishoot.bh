-- Expense approval: existing expenses stay approved; new ones follow the expense approval policy.
ALTER TABLE "Expense"
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'approved';

ALTER TABLE "Expense" ADD COLUMN "reviewNotes" TEXT;

CREATE INDEX "Expense_status_idx" ON "Expense" ("status");