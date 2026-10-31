-- CreateTable
CREATE TABLE "RetailRegister" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetailRegister_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashDrawer" (
    "id" TEXT NOT NULL,
    "registerId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BHD',
    "openingFloat" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "currentBalance" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashDrawer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashierSession" (
    "id" TEXT NOT NULL,
    "registerId" TEXT NOT NULL,
    "drawerId" TEXT NOT NULL,
    "cashierId" TEXT NOT NULL,
    "shiftId" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "openingFloat" DECIMAL(20,6) NOT NULL,
    "closingFloat" DECIMAL(20,6),
    "expectedCash" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "actualCash" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "cashDifference" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "totalSales" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "totalReturns" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'open',
    "note" TEXT,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashierSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetailShift" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "shiftNumber" TEXT NOT NULL,
    "openedById" TEXT NOT NULL,
    "closedById" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'open',
    "revision" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "RetailShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetailClosing" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "businessDate" DATE NOT NULL,
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedById" TEXT NOT NULL,
    "totalSales" DECIMAL(20,6) NOT NULL,
    "totalReturns" DECIMAL(20,6) NOT NULL,
    "totalCash" DECIMAL(20,6) NOT NULL,
    "totalCard" DECIMAL(20,6) NOT NULL,
    "totalOther" DECIMAL(20,6) NOT NULL,
    "cashVariance" DECIMAL(20,6) NOT NULL,
    "snapshot" JSONB NOT NULL,
    "signature" TEXT,
    "journalId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'closed',
    "revision" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "RetailClosing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethodConfig" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "allowChange" BOOLEAN NOT NULL DEFAULT false,
    "requiresReference" BOOLEAN NOT NULL DEFAULT false,
    "surchargeRate" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMethodConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentCollection" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "sessionId" TEXT,
    "orderId" TEXT,
    "invoiceId" TEXT,
    "amount" DECIMAL(20,6) NOT NULL,
    "currency" TEXT NOT NULL,
    "methodCode" TEXT NOT NULL,
    "referenceNumber" TEXT,
    "evidence" JSONB,
    "status" TEXT NOT NULL DEFAULT 'collected',
    "collectedById" TEXT NOT NULL,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionRule" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rate" DECIMAL(5,4) NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionSnapshot" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderLineId" TEXT,
    "attributedUserId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "ruleVersion" INTEGER NOT NULL,
    "ruleRate" DECIMAL(5,4) NOT NULL,
    "basisAmount" DECIMAL(20,6) NOT NULL,
    "commissionAmount" DECIMAL(20,6) NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'earned',
    "reversalOfId" TEXT,
    "calculationDetails" JSONB NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "CommissionSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreRegion" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "defaultLanguage" TEXT NOT NULL DEFAULT 'en',
    "branchId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "priceMultiplier" DECIMAL(10,4) NOT NULL DEFAULT 1.0000,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreRegion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RetailRegister_branchId_idx" ON "RetailRegister"("branchId");
CREATE UNIQUE INDEX "RetailRegister_branchId_code_key" ON "RetailRegister"("branchId", "code");

-- CreateIndex
CREATE INDEX "CashDrawer_registerId_idx" ON "CashDrawer"("registerId");
CREATE UNIQUE INDEX "CashDrawer_registerId_code_key" ON "CashDrawer"("registerId", "code");

-- CreateIndex
CREATE INDEX "CashierSession_registerId_status_idx" ON "CashierSession"("registerId", "status");
CREATE INDEX "CashierSession_cashierId_status_idx" ON "CashierSession"("cashierId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "RetailShift_shiftNumber_key" ON "RetailShift"("shiftNumber");
CREATE INDEX "RetailShift_branchId_status_idx" ON "RetailShift"("branchId", "status");

-- CreateIndex
CREATE INDEX "RetailClosing_branchId_level_businessDate_idx" ON "RetailClosing"("branchId", "level", "businessDate");
CREATE INDEX "RetailClosing_targetId_level_idx" ON "RetailClosing"("targetId", "level");

-- CreateIndex
CREATE INDEX "PaymentMethodConfig_branchId_idx" ON "PaymentMethodConfig"("branchId");
CREATE UNIQUE INDEX "PaymentMethodConfig_branchId_code_key" ON "PaymentMethodConfig"("branchId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentCollection_number_key" ON "PaymentCollection"("number");
CREATE INDEX "PaymentCollection_branchId_methodCode_status_idx" ON "PaymentCollection"("branchId", "methodCode", "status");
CREATE INDEX "PaymentCollection_sessionId_idx" ON "PaymentCollection"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionRule_code_key" ON "CommissionRule"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionSnapshot_reversalOfId_key" ON "CommissionSnapshot"("reversalOfId");
CREATE INDEX "CommissionSnapshot_attributedUserId_status_earnedAt_idx" ON "CommissionSnapshot"("attributedUserId", "status", "earnedAt");
CREATE INDEX "CommissionSnapshot_orderId_idx" ON "CommissionSnapshot"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "StoreRegion_code_key" ON "StoreRegion"("code");
CREATE INDEX "StoreRegion_branchId_idx" ON "StoreRegion"("branchId");

-- AddForeignKey
ALTER TABLE "RetailRegister" ADD CONSTRAINT "RetailRegister_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashDrawer" ADD CONSTRAINT "CashDrawer_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES "RetailRegister"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashierSession" ADD CONSTRAINT "CashierSession_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES "RetailRegister"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CashierSession" ADD CONSTRAINT "CashierSession_drawerId_fkey" FOREIGN KEY ("drawerId") REFERENCES "CashDrawer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CashierSession" ADD CONSTRAINT "CashierSession_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CashierSession" ADD CONSTRAINT "CashierSession_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "RetailShift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailShift" ADD CONSTRAINT "RetailShift_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RetailShift" ADD CONSTRAINT "RetailShift_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RetailShift" ADD CONSTRAINT "RetailShift_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailClosing" ADD CONSTRAINT "RetailClosing_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RetailClosing" ADD CONSTRAINT "RetailClosing_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethodConfig" ADD CONSTRAINT "PaymentMethodConfig_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentCollection" ADD CONSTRAINT "PaymentCollection_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentCollection" ADD CONSTRAINT "PaymentCollection_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CashierSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentCollection" ADD CONSTRAINT "PaymentCollection_collectedById_fkey" FOREIGN KEY ("collectedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionSnapshot" ADD CONSTRAINT "CommissionSnapshot_attributedUserId_fkey" FOREIGN KEY ("attributedUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommissionSnapshot" ADD CONSTRAINT "CommissionSnapshot_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "CommissionRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommissionSnapshot" ADD CONSTRAINT "CommissionSnapshot_reversalOfId_fkey" FOREIGN KEY ("reversalOfId") REFERENCES "CommissionSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreRegion" ADD CONSTRAINT "StoreRegion_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RLS and API privilege revocation for operations tables
DO $$
DECLARE table_name text; api_role text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['RetailRegister','CashDrawer','CashierSession','RetailShift','RetailClosing','PaymentMethodConfig','PaymentCollection','CommissionRule','CommissionSnapshot','StoreRegion'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    FOREACH api_role IN ARRAY ARRAY['anon','authenticated'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=api_role) THEN
        EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM %I', table_name, api_role);
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- Immutability triggers for closings and commission snapshots
CREATE FUNCTION platform_reject_retail_closing_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Retail closing snapshot is immutable'; END $$;
CREATE TRIGGER retail_closing_immutable BEFORE UPDATE OR DELETE ON "RetailClosing"
FOR EACH ROW EXECUTE FUNCTION platform_reject_retail_closing_mutation();

CREATE FUNCTION platform_reject_commission_snapshot_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Commission snapshot is immutable'; END $$;
CREATE TRIGGER commission_snapshot_immutable BEFORE UPDATE OR DELETE ON "CommissionSnapshot"
FOR EACH ROW EXECUTE FUNCTION platform_reject_commission_snapshot_mutation();
