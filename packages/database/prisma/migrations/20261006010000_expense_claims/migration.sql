-- Staff expense claims (reimbursements).
-- CreateTable
CREATE TABLE "ExpenseClaim" (
    "id" TEXT NOT NULL,
    "claimNumber" TEXT NOT NULL,
    "claimantId" TEXT NOT NULL,
    "amount" DECIMAL(12,3) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BHD',
    "expenseDate" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "categoryId" TEXT,
    "dealId" TEXT,
    "invoiceId" TEXT,
    "calendarEventId" TEXT,
    "receiptUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "reviewNotes" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "scheduledForDate" DATE,
    "scheduledById" TEXT,
    "paidAt" TIMESTAMP(3),
    "paidById" TEXT,
    "paymentMethod" TEXT,
    "paymentReference" TEXT,
    "expenseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseClaim_claimNumber_key" ON "ExpenseClaim"("claimNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseClaim_expenseId_key" ON "ExpenseClaim"("expenseId");

-- CreateIndex
CREATE INDEX "ExpenseClaim_claimantId_idx" ON "ExpenseClaim"("claimantId");

-- CreateIndex
CREATE INDEX "ExpenseClaim_status_idx" ON "ExpenseClaim"("status");

-- AddForeignKey
ALTER TABLE "ExpenseClaim" ADD CONSTRAINT "ExpenseClaim_claimantId_fkey" FOREIGN KEY ("claimantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseClaim" ADD CONSTRAINT "ExpenseClaim_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseClaim" ADD CONSTRAINT "ExpenseClaim_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "CrmDeal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseClaim" ADD CONSTRAINT "ExpenseClaim_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseClaim" ADD CONSTRAINT "ExpenseClaim_calendarEventId_fkey" FOREIGN KEY ("calendarEventId") REFERENCES "CalendarEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseClaim" ADD CONSTRAINT "ExpenseClaim_scheduledById_fkey" FOREIGN KEY ("scheduledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseClaim" ADD CONSTRAINT "ExpenseClaim_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseClaim" ADD CONSTRAINT "ExpenseClaim_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE SET NULL ON UPDATE CASCADE;


ALTER TABLE "ExpenseClaim" ADD CONSTRAINT "ExpenseClaim_status_check" CHECK ("status" IN ('submitted', 'approved', 'rejected', 'scheduled', 'paid', 'cancelled'));
ALTER TABLE "ExpenseClaim" ADD CONSTRAINT "ExpenseClaim_amount_check" CHECK ("amount" > 0);
ALTER TABLE "ExpenseClaim" ADD CONSTRAINT "ExpenseClaim_paid_check" CHECK ("status" <> 'paid' OR ("paidAt" IS NOT NULL AND "expenseId" IS NOT NULL));

-- Default routing: the claimant's manager, then whoever approves expenses (editable in Settings → Approvals).
INSERT INTO "ApprovalPolicy" ("id", "targetType", "enabled", "allowSelfApproval", "autoApproveRoles", "updatedAt")
VALUES (gen_random_uuid()::text, 'expense_claim', true, false, ARRAY[]::TEXT[], CURRENT_TIMESTAMP)
ON CONFLICT ("targetType") DO NOTHING;

INSERT INTO "ApprovalPolicyStep" ("id", "policyId", "order", "approverMode", "roleKey", "permission")
SELECT gen_random_uuid()::text, p."id", s."order", s."mode", NULL, s."permission"
FROM "ApprovalPolicy" p
JOIN (VALUES ('expense_claim', 1, 'manager', NULL), ('expense_claim', 2, 'permission', 'expenses:approve'))
  AS s("targetType", "order", "mode", "permission") ON s."targetType" = p."targetType"
ON CONFLICT ("policyId", "order") DO NOTHING;
