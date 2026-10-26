-- Sales attribution (who is credited with a quotation/invoice), its history, and commission payouts.
-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "salesOwnerId" TEXT;

-- AlterTable
ALTER TABLE "Quotation" ADD COLUMN "salesOwnerId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "commissionRatePercent" DECIMAL(5, 2);

-- CreateTable
CREATE TABLE "SalesAttributionChange" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "fromUserId" TEXT,
    "toUserId" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SalesAttributionChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionPayout" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "periodMonth" TEXT NOT NULL,
    "basisAmount" DECIMAL(12, 3) NOT NULL,
    "ratePercent" DECIMAL(5, 2) NOT NULL,
    "amount" DECIMAL(12, 3) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BHD',
    "expenseId" TEXT,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommissionPayout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalesAttributionChange_entityType_entityId_idx" ON "SalesAttributionChange" ("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionPayout_expenseId_key" ON "CommissionPayout" ("expenseId");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionPayout_userId_periodMonth_key" ON "CommissionPayout" ("userId", "periodMonth");

-- AddForeignKey
ALTER TABLE "Invoice"
ADD CONSTRAINT "Invoice_salesOwnerId_fkey" FOREIGN KEY ("salesOwnerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation"
ADD CONSTRAINT "Quotation_salesOwnerId_fkey" FOREIGN KEY ("salesOwnerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesAttributionChange"
ADD CONSTRAINT "SalesAttributionChange_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesAttributionChange"
ADD CONSTRAINT "SalesAttributionChange_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesAttributionChange"
ADD CONSTRAINT "SalesAttributionChange_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionPayout"
ADD CONSTRAINT "CommissionPayout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionPayout"
ADD CONSTRAINT "CommissionPayout_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionPayout"
ADD CONSTRAINT "CommissionPayout_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Quotation_salesOwnerId_idx" ON "Quotation" ("salesOwnerId");

CREATE INDEX "Invoice_salesOwnerId_idx" ON "Invoice" ("salesOwnerId");

ALTER TABLE "User"
ADD CONSTRAINT "User_commissionRatePercent_check" CHECK (
    "commissionRatePercent" IS NULL
    OR (
        "commissionRatePercent" >= 0
        AND "commissionRatePercent" <= 100
    )
);

ALTER TABLE "SalesAttributionChange"
ADD CONSTRAINT "SalesAttributionChange_entityType_check" CHECK (
    "entityType" IN ('quotation', 'invoice')
);

ALTER TABLE "CommissionPayout"
ADD CONSTRAINT "CommissionPayout_period_check" CHECK (
    "periodMonth" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
);

ALTER TABLE "CommissionPayout"
ADD CONSTRAINT "CommissionPayout_amount_check" CHECK (
    "amount" >= 0
    AND "basisAmount" >= 0
);

-- Existing documents are credited to whoever issued them; invoices follow their quotation.
UPDATE "Quotation"
SET
    "salesOwnerId" = "createdById"
WHERE
    "salesOwnerId" IS NULL;

UPDATE "Invoice" i SET "salesOwnerId" = q."salesOwnerId" FROM "Quotation" q WHERE q."invoiceId" = i.id AND i."salesOwnerId" IS NULL;

UPDATE "Invoice"
SET
    "salesOwnerId" = "createdById"
WHERE
    "salesOwnerId" IS NULL;