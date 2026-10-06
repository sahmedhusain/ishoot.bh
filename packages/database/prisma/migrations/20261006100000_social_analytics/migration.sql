-- Integrations: account name, last error and sync time; social posts and the content plan.
ALTER TABLE "IntegrationSetting" ADD COLUMN "lastError" TEXT;
ALTER TABLE "IntegrationSetting" ADD COLUMN "accountName" TEXT;
ALTER TABLE "IntegrationSetting" ADD COLUMN "lastSyncedAt" TIMESTAMP(3);

CREATE TABLE "SocialPost" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "caption" TEXT,
    "mediaType" TEXT,
    "permalink" TEXT,
    "thumbnailUrl" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "saves" INTEGER NOT NULL DEFAULT 0,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SocialPost_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SocialPost_counts_check" CHECK ("likes" >= 0 AND "comments" >= 0 AND "shares" >= 0 AND "views" >= 0 AND "reach" >= 0 AND "saves" >= 0)
);
CREATE UNIQUE INDEX "SocialPost_platform_externalId_key" ON "SocialPost"("platform", "externalId");
CREATE INDEX "SocialPost_platform_publishedAt_idx" ON "SocialPost"("platform", "publishedAt");

CREATE TABLE "SocialContentPlan" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "caption" TEXT,
    "platforms" TEXT[],
    "mediaUrl" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'idea',
    "publishedUrl" TEXT,
    "assigneeId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SocialContentPlan_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SocialContentPlan_status_check" CHECK ("status" IN ('idea', 'draft', 'scheduled', 'published', 'cancelled')),
    CONSTRAINT "SocialContentPlan_scheduled_check" CHECK ("status" <> 'scheduled' OR "scheduledFor" IS NOT NULL)
);
CREATE INDEX "SocialContentPlan_status_scheduledFor_idx" ON "SocialContentPlan"("status", "scheduledFor");
ALTER TABLE "SocialContentPlan" ADD CONSTRAINT "SocialContentPlan_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SocialContentPlan" ADD CONSTRAINT "SocialContentPlan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
