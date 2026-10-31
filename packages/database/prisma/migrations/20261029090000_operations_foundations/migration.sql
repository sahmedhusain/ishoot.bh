-- AlterTable
ALTER TABLE "Warehouse" ADD COLUMN     "branchId" TEXT;

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timeZone" TEXT NOT NULL,
    "businessDayStart" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BranchGrant" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "canManage" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BranchGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductPackagingUnit" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseUnits" DECIMAL(17,6) NOT NULL,
    "indivisible" BOOLEAN NOT NULL DEFAULT true,
    "barcode" TEXT,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductPackagingUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockSerial" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantKey" TEXT NOT NULL DEFAULT '',
    "batchKey" TEXT NOT NULL DEFAULT '',
    "locationId" TEXT,
    "manufacturerSerial" TEXT,
    "manufacturerScope" TEXT,
    "status" TEXT NOT NULL DEFAULT 'reserved',
    "packageId" TEXT,
    "generationId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockSerial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SerialGeneration" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantKey" TEXT NOT NULL DEFAULT '',
    "batchKey" TEXT NOT NULL DEFAULT '',
    "locationId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SerialGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockPackage" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'carton',
    "locationId" TEXT NOT NULL,
    "parentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "sealNumber" TEXT,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackageContent" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantKey" TEXT NOT NULL DEFAULT '',
    "batchKey" TEXT NOT NULL DEFAULT '',
    "quantity" DECIMAL(17,6) NOT NULL,

    CONSTRAINT "PackageContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockTraceEvent" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockTraceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabelPrintJob" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "template" JSONB NOT NULL,
    "labels" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'generated',
    "originalJobId" TEXT,
    "createdById" TEXT NOT NULL,
    "confirmedById" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LabelPrintJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingAccount" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AccountingAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingPeriod" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startsOn" DATE NOT NULL,
    "endsOn" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "closedById" TEXT,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "AccountingPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "postingDate" DATE NOT NULL,
    "currency" TEXT NOT NULL,
    "memo" TEXT NOT NULL,
    "branchId" TEXT,
    "reversalOfId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalLine" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "debit" DECIMAL(20,6) NOT NULL,
    "credit" DECIMAL(20,6) NOT NULL,
    "memo" TEXT,

    CONSTRAINT "JournalLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockAllocation" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "sourceLocationId" TEXT NOT NULL,
    "transitLocationId" TEXT NOT NULL,
    "destinationLocationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "carrierId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockAllocationLine" (
    "id" TEXT NOT NULL,
    "allocationId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantKey" TEXT NOT NULL DEFAULT '',
    "batchKey" TEXT NOT NULL DEFAULT '',
    "requested" DECIMAL(17,6) NOT NULL,
    "dispatched" DECIMAL(17,6) NOT NULL DEFAULT 0,
    "received" DECIMAL(17,6) NOT NULL DEFAULT 0,
    "rejected" DECIMAL(17,6) NOT NULL DEFAULT 0,
    "unitSnapshot" JSONB NOT NULL,
    "serialIds" TEXT[],

    CONSTRAINT "StockAllocationLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockAcknowledgment" (
    "id" TEXT NOT NULL,
    "allocationId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "stage" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "signerName" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "manifest" JSONB NOT NULL,
    "manifestHash" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockAcknowledgment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Branch_code_key" ON "Branch"("code");

-- CreateIndex
CREATE INDEX "BranchGrant_userId_idx" ON "BranchGrant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BranchGrant_branchId_userId_key" ON "BranchGrant"("branchId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductPackagingUnit_barcode_key" ON "ProductPackagingUnit"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "ProductPackagingUnit_productId_code_revision_key" ON "ProductPackagingUnit"("productId", "code", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "StockSerial_code_key" ON "StockSerial"("code");

-- CreateIndex
CREATE INDEX "StockSerial_productId_variantKey_locationId_batchKey_status_idx" ON "StockSerial"("productId", "variantKey", "locationId", "batchKey", "status");

-- CreateIndex
CREATE UNIQUE INDEX "StockSerial_manufacturerScope_manufacturerSerial_key" ON "StockSerial"("manufacturerScope", "manufacturerSerial");

-- CreateIndex
CREATE UNIQUE INDEX "SerialGeneration_idempotencyKey_key" ON "SerialGeneration"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "StockPackage_code_key" ON "StockPackage"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PackageContent_packageId_productId_variantKey_batchKey_key" ON "PackageContent"("packageId", "productId", "variantKey", "batchKey");

-- CreateIndex
CREATE INDEX "StockTraceEvent_entityType_entityId_createdAt_idx" ON "StockTraceEvent"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LabelPrintJob_idempotencyKey_key" ON "LabelPrintJob"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingAccount_code_key" ON "AccountingAccount"("code");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingPeriod_name_key" ON "AccountingPeriod"("name");

-- CreateIndex
CREATE UNIQUE INDEX "JournalEntry_sourceKey_key" ON "JournalEntry"("sourceKey");

-- CreateIndex
CREATE UNIQUE INDEX "JournalEntry_reversalOfId_key" ON "JournalEntry"("reversalOfId");

-- CreateIndex
CREATE INDEX "JournalEntry_periodId_postingDate_idx" ON "JournalEntry"("periodId", "postingDate");

-- CreateIndex
CREATE INDEX "JournalEntry_branchId_postingDate_idx" ON "JournalEntry"("branchId", "postingDate");

-- CreateIndex
CREATE INDEX "JournalLine_accountId_entryId_idx" ON "JournalLine"("accountId", "entryId");

-- CreateIndex
CREATE UNIQUE INDEX "StockAllocation_number_key" ON "StockAllocation"("number");

-- CreateIndex
CREATE UNIQUE INDEX "StockAllocationLine_allocationId_productId_variantKey_batch_key" ON "StockAllocationLine"("allocationId", "productId", "variantKey", "batchKey");

-- CreateIndex
CREATE UNIQUE INDEX "StockAcknowledgment_allocationId_revision_stage_actorId_key" ON "StockAcknowledgment"("allocationId", "revision", "stage", "actorId");

-- AddForeignKey
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchGrant" ADD CONSTRAINT "BranchGrant_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPackagingUnit" ADD CONSTRAINT "ProductPackagingUnit_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockSerial" ADD CONSTRAINT "StockSerial_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockSerial" ADD CONSTRAINT "StockSerial_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "StockLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockSerial" ADD CONSTRAINT "StockSerial_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "StockPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockSerial" ADD CONSTRAINT "StockSerial_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "SerialGeneration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SerialGeneration" ADD CONSTRAINT "SerialGeneration_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SerialGeneration" ADD CONSTRAINT "SerialGeneration_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "StockLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockPackage" ADD CONSTRAINT "StockPackage_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "StockLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockPackage" ADD CONSTRAINT "StockPackage_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "StockPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageContent" ADD CONSTRAINT "PackageContent_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "StockPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "AccountingPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_reversalOfId_fkey" FOREIGN KEY ("reversalOfId") REFERENCES "JournalEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "JournalEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "AccountingAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAllocationLine" ADD CONSTRAINT "StockAllocationLine_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "StockAllocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAcknowledgment" ADD CONSTRAINT "StockAcknowledgment_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "StockAllocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Preserve existing stock without inventing historic sessions or serials.
INSERT INTO "Branch" (id,code,name,"timeZone","updatedAt")
VALUES ('legacy-main','MAIN','Main branch','UTC',CURRENT_TIMESTAMP);
UPDATE "Warehouse" SET "branchId"='legacy-main' WHERE "branchId" IS NULL;
INSERT INTO "BranchGrant" (id,"branchId","userId","canManage")
SELECT 'legacy-' || id, 'legacy-main', id, false FROM "User";
ALTER TABLE "BranchGrant" ADD CONSTRAINT "BranchGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE RESTRICT;
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_businessDayStart_check" CHECK ("businessDayStart" BETWEEN 0 AND 1439);
ALTER TABLE "ProductPackagingUnit" ADD CONSTRAINT "Packaging_baseUnits_positive" CHECK ("baseUnits">0);
ALTER TABLE "PackageContent" ADD CONSTRAINT "PackageContent_positive" CHECK (quantity>0);
ALTER TABLE "StockPackage" ADD CONSTRAINT "Package_not_own_parent" CHECK (id<>"parentId");
ALTER TABLE "StockSerial" ADD CONSTRAINT "Serial_status_check" CHECK (status IN ('reserved','available','allocated','in_transit','issued','sold','quarantined','void'));
ALTER TABLE "SerialGeneration" ADD CONSTRAINT "SerialGeneration_quantity_check" CHECK (quantity BETWEEN 1 AND 1000);
ALTER TABLE "AccountingPeriod" ADD CONSTRAINT "AccountingPeriod_dates_check" CHECK ("startsOn"<="endsOn");
ALTER TABLE "AccountingPeriod" ADD CONSTRAINT "AccountingPeriod_status_check" CHECK (status IN ('open','closed'));
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_one_positive_side" CHECK ((debit>0 AND credit=0) OR (credit>0 AND debit=0));

CREATE FUNCTION platform_reject_journal_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Posted journals are immutable; post a reversal'; END $$;
CREATE TRIGGER journal_immutable BEFORE UPDATE OR DELETE ON "JournalEntry"
FOR EACH ROW EXECUTE FUNCTION platform_reject_journal_mutation();
CREATE TRIGGER journal_line_immutable BEFORE UPDATE OR DELETE ON "JournalLine"
FOR EACH ROW EXECUTE FUNCTION platform_reject_journal_mutation();

CREATE FUNCTION platform_validate_journal() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE entry_id text; line_count bigint; balance numeric;
BEGIN
  IF TG_TABLE_NAME='JournalEntry' THEN entry_id:=NEW.id; ELSE entry_id:=NEW."entryId"; END IF;
  SELECT COUNT(*),COALESCE(SUM(debit-credit),0) INTO line_count,balance FROM "JournalLine" WHERE "entryId"=entry_id;
  IF line_count<2 OR line_count>500 OR balance<>0 THEN RAISE EXCEPTION 'Journal must contain balanced debit and credit lines'; END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER journal_balance AFTER INSERT ON "JournalEntry" DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION platform_validate_journal();
CREATE CONSTRAINT TRIGGER journal_line_balance AFTER INSERT ON "JournalLine" DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION platform_validate_journal();

CREATE FUNCTION platform_validate_journal_insert() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE period_row "AccountingPeriod"; created_in xid;
BEGIN
  IF TG_TABLE_NAME='JournalLine' THEN
    SELECT xmin INTO created_in FROM "JournalEntry" WHERE id=NEW."entryId";
    IF created_in IS DISTINCT FROM pg_current_xact_id()::text::xid THEN RAISE EXCEPTION 'Cannot append lines to a posted journal'; END IF;
  ELSE
    SELECT * INTO period_row FROM "AccountingPeriod" WHERE id=NEW."periodId" FOR SHARE;
    IF period_row.id IS NULL OR period_row.status<>'open' OR NEW."postingDate" NOT BETWEEN period_row."startsOn" AND period_row."endsOn" THEN
      RAISE EXCEPTION 'Journal requires an open accounting period';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER journal_open_period BEFORE INSERT ON "JournalEntry" FOR EACH ROW EXECUTE FUNCTION platform_validate_journal_insert();
CREATE TRIGGER journal_no_late_lines BEFORE INSERT ON "JournalLine" FOR EACH ROW EXECUTE FUNCTION platform_validate_journal_insert();
