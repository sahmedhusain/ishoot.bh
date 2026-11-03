-- AlterTable
ALTER TABLE "CrmContact"
ADD COLUMN "supplierLeadTimeDays" INTEGER,
ADD COLUMN "supplierPaymentTermsDays" INTEGER;

-- CreateTable
CREATE TABLE "PurchaseRequisition" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "departmentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "neededBy" DATE,
    "note" TEXT,
    "decisionNote" TEXT,
    "estimatedTotal" DECIMAL(12, 3) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PurchaseRequisition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseRequisitionLine" (
    "id" TEXT NOT NULL,
    "requisitionId" TEXT NOT NULL,
    "productId" TEXT,
    "variantKey" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(14, 3) NOT NULL,
    "estimatedUnitCost" DECIMAL(12, 3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "PurchaseRequisitionLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rfq" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "requisitionId" TEXT,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "dueDate" DATE,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Rfq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RfqLine" (
    "id" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "productId" TEXT,
    "variantKey" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(14, 3) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "RfqLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RfqQuote" (
    "id" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "unitPrice" DECIMAL(12, 4) NOT NULL,
    "leadTimeDays" INTEGER,
    "note" TEXT,
    "selected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RfqQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "orderDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedDate" DATE,
    "warehouseId" TEXT,
    "requisitionId" TEXT,
    "rfqId" TEXT,
    "note" TEXT,
    "terms" TEXT,
    "vatEnabled" BOOLEAN NOT NULL DEFAULT false,
    "vatPercentage" DECIMAL(5, 2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(12, 3) NOT NULL DEFAULT 0,
    "vatAmount" DECIMAL(12, 3) NOT NULL DEFAULT 0,
    "total" DECIMAL(12, 3) NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3),
    "sentVia" TEXT,
    "createdById" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderLine" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "productId" TEXT,
    "variantKey" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(14, 3) NOT NULL,
    "unitPrice" DECIMAL(12, 4) NOT NULL,
    "receivedQuantity" DECIMAL(14, 3) NOT NULL DEFAULT 0,
    "rejectedQuantity" DECIMAL(14, 3) NOT NULL DEFAULT 0,
    "billedQuantity" DECIMAL(14, 3) NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "PurchaseOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoodsReceipt" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "receivedById" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GoodsReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoodsReceiptLine" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "orderLineId" TEXT NOT NULL,
    "quantity" DECIMAL(14, 3) NOT NULL,
    "rejectedQuantity" DECIMAL(14, 3) NOT NULL DEFAULT 0,
    "rejectReason" TEXT,
    "batchNumber" TEXT,
    "expiryDate" DATE,
    CONSTRAINT "GoodsReceiptLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierBill" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "supplierRef" TEXT,
    "supplierId" TEXT NOT NULL,
    "purchaseOrderId" TEXT,
    "billDate" DATE NOT NULL,
    "dueDate" DATE,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "subtotal" DECIMAL(12, 3) NOT NULL DEFAULT 0,
    "vatAmount" DECIMAL(12, 3) NOT NULL DEFAULT 0,
    "total" DECIMAL(12, 3) NOT NULL DEFAULT 0,
    "amountPaid" DECIMAL(12, 3) NOT NULL DEFAULT 0,
    "expenseId" TEXT,
    "overrideReason" TEXT,
    "attachmentUrl" TEXT,
    "note" TEXT,
    "createdById" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SupplierBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierBillLine" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "orderLineId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(14, 3) NOT NULL,
    "unitPrice" DECIMAL(12, 4) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "SupplierBillLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierPayment" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "amount" DECIMAL(12, 3) NOT NULL,
    "paidOn" DATE NOT NULL,
    "method" TEXT NOT NULL,
    "reference" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupplierPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseRequisition_number_key" ON "PurchaseRequisition" ("number");

-- CreateIndex
CREATE INDEX "PurchaseRequisition_status_idx" ON "PurchaseRequisition" ("status");

-- CreateIndex
CREATE INDEX "PurchaseRequisition_requestedById_idx" ON "PurchaseRequisition" ("requestedById");

-- CreateIndex
CREATE UNIQUE INDEX "Rfq_number_key" ON "Rfq" ("number");

-- CreateIndex
CREATE UNIQUE INDEX "RfqQuote_rfqId_lineId_supplierId_key" ON "RfqQuote" (
    "rfqId",
    "lineId",
    "supplierId"
);

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_number_key" ON "PurchaseOrder" ("number");

-- CreateIndex
CREATE INDEX "PurchaseOrder_supplierId_idx" ON "PurchaseOrder" ("supplierId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_status_idx" ON "PurchaseOrder" ("status");

-- CreateIndex
CREATE INDEX "PurchaseOrder_orderDate_idx" ON "PurchaseOrder" ("orderDate");

-- CreateIndex
CREATE UNIQUE INDEX "GoodsReceipt_number_key" ON "GoodsReceipt" ("number");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierBill_number_key" ON "SupplierBill" ("number");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierBill_expenseId_key" ON "SupplierBill" ("expenseId");

-- CreateIndex
CREATE INDEX "SupplierBill_supplierId_idx" ON "SupplierBill" ("supplierId");

-- CreateIndex
CREATE INDEX "SupplierBill_status_idx" ON "SupplierBill" ("status");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierBill_supplierId_supplierRef_key" ON "SupplierBill" ("supplierId", "supplierRef");

-- AddForeignKey
ALTER TABLE "PurchaseRequisitionLine"
ADD CONSTRAINT "PurchaseRequisitionLine_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "PurchaseRequisition" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rfq"
ADD CONSTRAINT "Rfq_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "PurchaseRequisition" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfqLine"
ADD CONSTRAINT "RfqLine_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "Rfq" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfqQuote"
ADD CONSTRAINT "RfqQuote_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "Rfq" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfqQuote"
ADD CONSTRAINT "RfqQuote_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "RfqLine" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfqQuote"
ADD CONSTRAINT "RfqQuote_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "CrmContact" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder"
ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "CrmContact" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder"
ADD CONSTRAINT "PurchaseOrder_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder"
ADD CONSTRAINT "PurchaseOrder_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "PurchaseRequisition" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder"
ADD CONSTRAINT "PurchaseOrder_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "Rfq" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderLine"
ADD CONSTRAINT "PurchaseOrderLine_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceipt"
ADD CONSTRAINT "GoodsReceipt_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceiptLine"
ADD CONSTRAINT "GoodsReceiptLine_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "GoodsReceipt" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceiptLine"
ADD CONSTRAINT "GoodsReceiptLine_orderLineId_fkey" FOREIGN KEY ("orderLineId") REFERENCES "PurchaseOrderLine" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierBill"
ADD CONSTRAINT "SupplierBill_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "CrmContact" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierBill"
ADD CONSTRAINT "SupplierBill_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierBillLine"
ADD CONSTRAINT "SupplierBillLine_billId_fkey" FOREIGN KEY ("billId") REFERENCES "SupplierBill" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierBillLine"
ADD CONSTRAINT "SupplierBillLine_orderLineId_fkey" FOREIGN KEY ("orderLineId") REFERENCES "PurchaseOrderLine" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment"
ADD CONSTRAINT "SupplierPayment_billId_fkey" FOREIGN KEY ("billId") REFERENCES "SupplierBill" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Guards the code also keeps: quantities and prices are not negative.
ALTER TABLE "PurchaseOrderLine"
ADD CONSTRAINT "PurchaseOrderLine_amounts_check" CHECK (
    "quantity" > 0
    AND "unitPrice" >= 0
    AND "receivedQuantity" >= 0
    AND "rejectedQuantity" >= 0
    AND "billedQuantity" >= 0
);

ALTER TABLE "GoodsReceiptLine"
ADD CONSTRAINT "GoodsReceiptLine_amounts_check" CHECK (
    "quantity" >= 0
    AND "rejectedQuantity" >= 0
    AND "quantity" + "rejectedQuantity" > 0
);

ALTER TABLE "SupplierPayment"
ADD CONSTRAINT "SupplierPayment_amount_check" CHECK ("amount" > 0);