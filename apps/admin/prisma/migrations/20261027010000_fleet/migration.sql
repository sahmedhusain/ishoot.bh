-- AlterTable
ALTER TABLE "Shipment"
ADD COLUMN "codSettlementId" TEXT,
ADD COLUMN "driverId" TEXT,
ADD COLUMN "proofPhotoUrl" TEXT,
ADD COLUMN "proofSignature" TEXT,
ADD COLUMN "routeSheetId" TEXT,
ADD COLUMN "routeStop" INTEGER,
ADD COLUMN "vehicleId" TEXT;

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'van',
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteSheet" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "driverId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RouteSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodSettlement" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "expected" DECIMAL(12, 3) NOT NULL,
    "received" DECIMAL(12, 3) NOT NULL,
    "note" TEXT,
    "settledById" TEXT,
    "settledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CodSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_plate_key" ON "Vehicle" ("plate");

-- CreateIndex
CREATE UNIQUE INDEX "RouteSheet_number_key" ON "RouteSheet" ("number");

-- CreateIndex
CREATE INDEX "RouteSheet_date_driverId_idx" ON "RouteSheet" ("date", "driverId");

-- CreateIndex
CREATE UNIQUE INDEX "CodSettlement_number_key" ON "CodSettlement" ("number");

-- CreateIndex
CREATE INDEX "CodSettlement_driverId_settledAt_idx" ON "CodSettlement" ("driverId", "settledAt");

-- CreateIndex
CREATE INDEX "Shipment_driverId_status_idx" ON "Shipment" ("driverId", "status");

-- CreateIndex
CREATE INDEX "Shipment_routeSheetId_idx" ON "Shipment" ("routeSheetId");

-- AddForeignKey
ALTER TABLE "Shipment"
ADD CONSTRAINT "Shipment_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment"
ADD CONSTRAINT "Shipment_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment"
ADD CONSTRAINT "Shipment_routeSheetId_fkey" FOREIGN KEY ("routeSheetId") REFERENCES "RouteSheet" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment"
ADD CONSTRAINT "Shipment_codSettlementId_fkey" FOREIGN KEY ("codSettlementId") REFERENCES "CodSettlement" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteSheet"
ADD CONSTRAINT "RouteSheet_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteSheet"
ADD CONSTRAINT "RouteSheet_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodSettlement"
ADD CONSTRAINT "CodSettlement_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Integrity
ALTER TABLE "Vehicle"
ADD CONSTRAINT "Vehicle_kind_check" CHECK (
    "kind" IN (
        'car',
        'van',
        'motorbike',
        'truck',
        'bicycle',
        'other'
    )
);

ALTER TABLE "RouteSheet"
ADD CONSTRAINT "RouteSheet_status_check" CHECK (
    "status" IN ('draft', 'out', 'closed')
);

ALTER TABLE "CodSettlement"
ADD CONSTRAINT "CodSettlement_amounts_check" CHECK (
    "expected" >= 0
    AND "received" >= 0
);

ALTER TABLE "Shipment"
ADD CONSTRAINT "Shipment_routeStop_check" CHECK (
    "routeStop" IS NULL
    OR "routeStop" > 0
);