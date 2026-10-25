-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN     "agencyFee" DECIMAL(12,3),
ADD COLUMN     "agencyId" TEXT,
ADD COLUMN     "agencyInvoiceId" TEXT,
ADD COLUMN     "labelUrl" TEXT,
ADD COLUMN     "trackedAt" TIMESTAMP(3),
ADD COLUMN     "trackingNumber" TEXT;

-- CreateTable
CREATE TABLE "CourierAgency" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'manual',
    "trackingUrl" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "feePerShipment" DECIMAL(12,3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourierAgency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgencyInvoice" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "invoiceDate" DATE NOT NULL,
    "amount" DECIMAL(12,3) NOT NULL,
    "expenseId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgencyInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgencyInvoice_expenseId_key" ON "AgencyInvoice"("expenseId");

-- CreateIndex
CREATE UNIQUE INDEX "AgencyInvoice_agencyId_reference_key" ON "AgencyInvoice"("agencyId", "reference");

-- CreateIndex
CREATE INDEX "Shipment_agencyId_status_idx" ON "Shipment"("agencyId", "status");

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "CourierAgency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_agencyInvoiceId_fkey" FOREIGN KEY ("agencyInvoiceId") REFERENCES "AgencyInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyInvoice" ADD CONSTRAINT "AgencyInvoice_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "CourierAgency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Integrity
ALTER TABLE "CourierAgency" ADD CONSTRAINT "CourierAgency_kind_check" CHECK ("kind" IN ('manual', 'aramex', 'dhl_express', 'smsa'));
ALTER TABLE "CourierAgency" ADD CONSTRAINT "CourierAgency_fee_check" CHECK ("feePerShipment" IS NULL OR "feePerShipment" >= 0);
ALTER TABLE "AgencyInvoice" ADD CONSTRAINT "AgencyInvoice_amount_check" CHECK ("amount" >= 0);
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_agencyFee_check" CHECK ("agencyFee" IS NULL OR "agencyFee" >= 0);
