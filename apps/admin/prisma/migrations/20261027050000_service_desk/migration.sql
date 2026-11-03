-- AlterTable
ALTER TABLE "Inquiry" ADD COLUMN "orderId" TEXT;

-- AlterTable
ALTER TABLE "RequestComment" ADD COLUMN "channel" TEXT;

-- CreateTable
CREATE TABLE "ServiceSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "slaUrgentHours" INTEGER NOT NULL DEFAULT 4,
    "slaHighHours" INTEGER NOT NULL DEFAULT 24,
    "slaNormalHours" INTEGER NOT NULL DEFAULT 72,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ServiceSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CannedReply" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bodyEn" TEXT NOT NULL,
    "bodyAr" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CannedReply_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Inquiry_orderId_idx" ON "Inquiry" ("orderId");

-- AddForeignKey
ALTER TABLE "Inquiry"
ADD CONSTRAINT "Inquiry_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "SalesOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Integrity
ALTER TABLE "ServiceSettings"
ADD CONSTRAINT "ServiceSettings_hours_check" CHECK (
    "slaUrgentHours" BETWEEN 1 AND 720
    AND "slaHighHours" BETWEEN 1 AND 720
    AND "slaNormalHours" BETWEEN 1 AND 2160
);

ALTER TABLE "RequestComment"
ADD CONSTRAINT "RequestComment_channel_check" CHECK (
    "channel" IS NULL
    OR "channel" IN ('email', 'whatsapp')
);