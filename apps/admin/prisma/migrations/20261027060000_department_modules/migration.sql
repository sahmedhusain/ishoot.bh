-- AlterTable
ALTER TABLE "Inquiry" ADD COLUMN "utmCampaign" TEXT;

-- AlterTable
ALTER TABLE "SalesOrder"
ADD COLUMN "utmCampaign" TEXT,
ADD COLUMN "utmMedium" TEXT,
ADD COLUMN "utmSource" TEXT;

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'social',
    "status" TEXT NOT NULL DEFAULT 'planned',
    "startDate" DATE,
    "endDate" DATE,
    "budget" DECIMAL(12, 3) NOT NULL DEFAULT 0,
    "spend" DECIMAL(12, 3) NOT NULL DEFAULT 0,
    "utmCampaign" TEXT NOT NULL,
    "couponCode" TEXT,
    "notes" TEXT,
    "ownerId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerSegment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rules" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CustomerSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Broadcast" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "segmentId" TEXT,
    "campaignId" TEXT,
    "subjectEn" TEXT NOT NULL,
    "subjectAr" TEXT NOT NULL,
    "bodyEn" TEXT NOT NULL,
    "bodyAr" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdById" TEXT,
    "queuedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Broadcast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BroadcastRecipient" (
    "id" TEXT NOT NULL,
    "broadcastId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "sentAt" TIMESTAMP(3),
    CONSTRAINT "BroadcastRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaContact" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "outlet" TEXT NOT NULL,
    "role" TEXT,
    "beat" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MediaContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaCoverage" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "outlet" TEXT NOT NULL,
    "url" TEXT,
    "publishedOn" DATE NOT NULL,
    "reach" INTEGER,
    "sentiment" TEXT NOT NULL DEFAULT 'neutral',
    "articleId" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MediaCoverage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalMatter" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'dispute',
    "status" TEXT NOT NULL DEFAULT 'open',
    "counterparty" TEXT,
    "reference" TEXT,
    "nextDate" DATE,
    "assigneeId" TEXT,
    "amountAtStake" DECIMAL(14, 3),
    "description" TEXT,
    "outcome" TEXT,
    "createdById" TEXT,
    "closedAt" TIMESTAMP(3),
    "remindedFor" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LegalMatter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalMatterEvent" (
    "id" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "byId" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LegalMatterEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_code_key" ON "Campaign" ("code");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_utmCampaign_key" ON "Campaign" ("utmCampaign");

-- CreateIndex
CREATE INDEX "Campaign_status_idx" ON "Campaign" ("status");

-- CreateIndex
CREATE INDEX "BroadcastRecipient_broadcastId_status_idx" ON "BroadcastRecipient" ("broadcastId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BroadcastRecipient_broadcastId_customerId_key" ON "BroadcastRecipient" ("broadcastId", "customerId");

-- CreateIndex
CREATE INDEX "MediaCoverage_publishedOn_idx" ON "MediaCoverage" ("publishedOn");

-- CreateIndex
CREATE UNIQUE INDEX "LegalMatter_number_key" ON "LegalMatter" ("number");

-- CreateIndex
CREATE INDEX "LegalMatter_status_nextDate_idx" ON "LegalMatter" ("status", "nextDate");

-- CreateIndex
CREATE INDEX "LegalMatterEvent_matterId_at_idx" ON "LegalMatterEvent" ("matterId", "at");

-- AddForeignKey
ALTER TABLE "Broadcast"
ADD CONSTRAINT "Broadcast_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "CustomerSegment" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Broadcast"
ADD CONSTRAINT "Broadcast_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BroadcastRecipient"
ADD CONSTRAINT "BroadcastRecipient_broadcastId_fkey" FOREIGN KEY ("broadcastId") REFERENCES "Broadcast" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalMatterEvent"
ADD CONSTRAINT "LegalMatterEvent_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "LegalMatter" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Integrity
ALTER TABLE "Campaign"
ADD CONSTRAINT "Campaign_values_check" CHECK (
    "channel" IN (
        'email',
        'social',
        'ads',
        'whatsapp',
        'event',
        'print',
        'other'
    )
    AND "status" IN (
        'planned',
        'running',
        'done',
        'cancelled'
    )
    AND "budget" >= 0
    AND "spend" >= 0
    AND (
        "startDate" IS NULL
        OR "endDate" IS NULL
        OR "startDate" <= "endDate"
    )
    AND "utmCampaign" ~ '^[a-z0-9][a-z0-9_-]{1,59}$'
);

ALTER TABLE "Broadcast"
ADD CONSTRAINT "Broadcast_status_check" CHECK (
    "status" IN ('draft', 'sending', 'sent')
);

ALTER TABLE "BroadcastRecipient"
ADD CONSTRAINT "BroadcastRecipient_status_check" CHECK (
    "status" IN ('pending', 'sent', 'failed')
);

ALTER TABLE "MediaCoverage"
ADD CONSTRAINT "MediaCoverage_values_check" CHECK (
    "sentiment" IN (
        'positive',
        'neutral',
        'negative'
    )
    AND (
        "reach" IS NULL
        OR "reach" >= 0
    )
);

ALTER TABLE "LegalMatter"
ADD CONSTRAINT "LegalMatter_values_check" CHECK (
    "kind" IN (
        'dispute',
        'claim',
        'regulatory',
        'employment',
        'intellectual_property',
        'other'
    )
    AND "status" IN (
        'open',
        'in_progress',
        'on_hold',
        'closed'
    )
    AND (
        "amountAtStake" IS NULL
        OR "amountAtStake" >= 0
    )
);

ALTER TABLE "LegalMatterEvent"
ADD CONSTRAINT "LegalMatterEvent_kind_check" CHECK (
    "kind" IN ('note', 'status', 'date')
);