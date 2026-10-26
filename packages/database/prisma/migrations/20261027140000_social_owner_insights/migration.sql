ALTER TABLE "IntegrationSetting" ADD COLUMN "syncLeaseToken" TEXT, ADD COLUMN "syncLeaseUntil" TIMESTAMP(3);

CREATE TABLE "SocialInsightSnapshot" (
  "id" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "sourceProvider" TEXT NOT NULL,
  "sourceAccountId" TEXT NOT NULL,
  "periodDays" INTEGER NOT NULL,
  "periodStart" DATE NOT NULL,
  "periodEnd" DATE NOT NULL,
  "timeZone" TEXT NOT NULL,
  "metrics" JSONB NOT NULL,
  "nativeMetrics" JSONB NOT NULL,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SocialInsightSnapshot_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SocialInsightSnapshot_period_check" CHECK ("periodDays" IN (1, 7, 30, 90, 365) AND "periodEnd" >= "periodStart" AND "periodEnd" - "periodStart" = "periodDays" - 1)
);
CREATE UNIQUE INDEX "SocialInsightSnapshot_account_period_key" ON "SocialInsightSnapshot"("platform", "sourceProvider", "sourceAccountId", "periodDays", "periodStart", "periodEnd");
CREATE INDEX "SocialInsightSnapshot_account_period_fetched_idx" ON "SocialInsightSnapshot"("platform", "sourceProvider", "sourceAccountId", "periodDays", "recordedAt");
