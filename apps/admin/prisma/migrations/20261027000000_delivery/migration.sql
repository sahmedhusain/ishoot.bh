-- CreateTable
CREATE TABLE "DeliverySettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "mode" TEXT NOT NULL DEFAULT 'own',
    "slaHours" INTEGER NOT NULL DEFAULT 48,
    "timeZone" TEXT,
    "slotDays" INTEGER NOT NULL DEFAULT 7,
    "leadMinutes" INTEGER NOT NULL DEFAULT 120,
    "requireSlot" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DeliverySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable


CREATE TABLE "DeliveryZone" (
    "id" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "areas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "fee" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "minOrder" DECIMAL(12,3),
    "freeOver" DECIMAL(12,3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliverySlot" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT,
    "weekday" INTEGER NOT NULL,
    "start" TEXT NOT NULL,
    "end" TEXT NOT NULL,
    "capacity" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DeliverySlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "method" TEXT NOT NULL DEFAULT 'own',
    "zoneId" TEXT,
    "slotId" TEXT,
    "slotDate" DATE,
    "slotStart" TEXT,
    "slotEnd" TEXT,
    "promisedBy" TIMESTAMP(3) NOT NULL,
    "recipientName" TEXT NOT NULL,
    "recipientPhone" TEXT NOT NULL,
    "address" JSONB NOT NULL,
    "codAmount" DECIMAL(12, 3) NOT NULL DEFAULT 0,
    "codCollected" DECIMAL(12, 3) NOT NULL DEFAULT 0,
    "trackingToken" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "failureReason" TEXT,
    "outAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipmentEvent" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reason" TEXT,
    "note" TEXT,
    "byId" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShipmentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeliverySlot_weekday_idx" ON "DeliverySlot" ("weekday");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_number_key" ON "Shipment" ("number");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_trackingToken_key" ON "Shipment" ("trackingToken");

-- CreateIndex
CREATE INDEX "Shipment_orderId_idx" ON "Shipment" ("orderId");

-- CreateIndex
CREATE INDEX "Shipment_status_promisedBy_idx" ON "Shipment" ("status", "promisedBy");

-- CreateIndex
CREATE INDEX "Shipment_slotDate_idx" ON "Shipment" ("slotDate");

-- CreateIndex
CREATE INDEX "ShipmentEvent_shipmentId_at_idx" ON "ShipmentEvent" ("shipmentId", "at");

-- AddForeignKey
ALTER TABLE "DeliverySlot"
ADD CONSTRAINT "DeliverySlot_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "DeliveryZone" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment"
ADD CONSTRAINT "Shipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "SalesOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment"
ADD CONSTRAINT "Shipment_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "DeliveryZone" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentEvent"
ADD CONSTRAINT "ShipmentEvent_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Integrity
ALTER TABLE "DeliverySettings"
ADD CONSTRAINT "DeliverySettings_mode_check" CHECK (
    "mode" IN ('own', 'agency', 'both')
);

ALTER TABLE "DeliverySettings"
ADD CONSTRAINT "DeliverySettings_numbers_check" CHECK (
    "slaHours" BETWEEN 1 AND 720
    AND "slotDays" BETWEEN 1 AND 60
    AND "leadMinutes" BETWEEN 0 AND 10080
);

ALTER TABLE "DeliveryZone"
ADD CONSTRAINT "DeliveryZone_amounts_check" CHECK (
    "fee" >= 0
    AND (
        "minOrder" IS NULL
        OR "minOrder" >= 0
    )
    AND (
        "freeOver" IS NULL
        OR "freeOver" >= 0
    )
);

ALTER TABLE "DeliverySlot"
ADD CONSTRAINT "DeliverySlot_time_check" CHECK (
    "weekday" BETWEEN 0 AND 6
    AND "start" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    AND "end" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    AND "start" < "end"
    AND (
        "capacity" IS NULL
        OR "capacity" > 0
    )
);

ALTER TABLE "Shipment"
ADD CONSTRAINT "Shipment_status_check" CHECK (
    "status" IN (
        'pending',
        'assigned',
        'out_for_delivery',
        'delivered',
        'failed',
        'returned',
        'cancelled'
    )
);

ALTER TABLE "Shipment"
ADD CONSTRAINT "Shipment_method_check" CHECK ("method" IN ('own', 'agency'));

ALTER TABLE "Shipment"
ADD CONSTRAINT "Shipment_cod_check" CHECK (
    "codAmount" >= 0
    AND "codCollected" >= 0
    AND "attempts" >= 0
);