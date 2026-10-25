-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "trackBatches" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockLocation" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockItem" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantKey" TEXT NOT NULL DEFAULT '',
    "averageCost" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "reorderPoint" DECIMAL(14,3),
    "reorderQuantity" DECIMAL(14,3),
    "lowAlertedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockBatch" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantKey" TEXT NOT NULL DEFAULT '',
    "batchNumber" TEXT NOT NULL,
    "expiryDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockLevel" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantKey" TEXT NOT NULL DEFAULT '',
    "locationId" TEXT NOT NULL,
    "batchKey" TEXT NOT NULL DEFAULT '',
    "onHand" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "reserved" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantKey" TEXT NOT NULL DEFAULT '',
    "locationId" TEXT NOT NULL,
    "batchKey" TEXT NOT NULL DEFAULT '',
    "quantity" DECIMAL(14,3) NOT NULL,
    "unitCost" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "sourceType" TEXT NOT NULL DEFAULT 'manual',
    "sourceId" TEXT,
    "transferId" TEXT,
    "reason" TEXT,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockCount" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'full',
    "status" TEXT NOT NULL DEFAULT 'counting',
    "note" TEXT,
    "createdById" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockCount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockCountLine" (
    "id" TEXT NOT NULL,
    "countId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantKey" TEXT NOT NULL DEFAULT '',
    "locationId" TEXT NOT NULL,
    "batchKey" TEXT NOT NULL DEFAULT '',
    "expected" DECIMAL(14,3) NOT NULL,
    "counted" DECIMAL(14,3),
    "note" TEXT,

    CONSTRAINT "StockCountLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_code_key" ON "Warehouse"("code");

-- CreateIndex
CREATE UNIQUE INDEX "StockLocation_warehouseId_code_key" ON "StockLocation"("warehouseId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "StockItem_productId_variantKey_key" ON "StockItem"("productId", "variantKey");

-- CreateIndex
CREATE INDEX "StockBatch_expiryDate_idx" ON "StockBatch"("expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "StockBatch_productId_variantKey_batchNumber_key" ON "StockBatch"("productId", "variantKey", "batchNumber");

-- CreateIndex
CREATE INDEX "StockLevel_locationId_idx" ON "StockLevel"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "StockLevel_productId_variantKey_locationId_batchKey_key" ON "StockLevel"("productId", "variantKey", "locationId", "batchKey");

-- CreateIndex
CREATE INDEX "StockMovement_productId_variantKey_createdAt_idx" ON "StockMovement"("productId", "variantKey", "createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_locationId_createdAt_idx" ON "StockMovement"("locationId", "createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_sourceType_sourceId_idx" ON "StockMovement"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "StockMovement_createdAt_idx" ON "StockMovement"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StockCount_number_key" ON "StockCount"("number");

-- CreateIndex
CREATE INDEX "StockCount_status_idx" ON "StockCount"("status");

-- CreateIndex
CREATE UNIQUE INDEX "StockCountLine_countId_productId_variantKey_locationId_batc_key" ON "StockCountLine"("countId", "productId", "variantKey", "locationId", "batchKey");

-- AddForeignKey
ALTER TABLE "StockLocation" ADD CONSTRAINT "StockLocation_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLevel" ADD CONSTRAINT "StockLevel_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "StockLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "StockLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockCount" ADD CONSTRAINT "StockCount_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockCountLine" ADD CONSTRAINT "StockCountLine_countId_fkey" FOREIGN KEY ("countId") REFERENCES "StockCount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Guards the code also keeps: nothing reserved below zero, counts are not negative, movements move something.
ALTER TABLE "StockLevel" ADD CONSTRAINT "StockLevel_reserved_check" CHECK ("reserved" >= 0);
ALTER TABLE "StockCountLine" ADD CONSTRAINT "StockCountLine_counted_check" CHECK ("counted" IS NULL OR "counted" >= 0);
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_quantity_check" CHECK ("quantity" <> 0);
