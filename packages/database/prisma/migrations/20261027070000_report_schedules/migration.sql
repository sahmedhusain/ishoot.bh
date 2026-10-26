-- CreateTable
CREATE TABLE "ReportSchedule" (
    "id" TEXT NOT NULL,
    "reportKey" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'xlsx',
    "recipients" TEXT[],
    "locale" TEXT NOT NULL DEFAULT 'ar',
    "compare" BOOLEAN NOT NULL DEFAULT false,
    "ownerId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "nextRunAt" TIMESTAMP(3) NOT NULL,
    "lastSentAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReportSchedule_isActive_nextRunAt_idx" ON "ReportSchedule"("isActive", "nextRunAt");


-- Integrity
ALTER TABLE "ReportSchedule" ADD CONSTRAINT "ReportSchedule_values_check" CHECK ("frequency" IN ('daily', 'weekly', 'monthly') AND "format" IN ('csv', 'xlsx', 'pdf') AND "locale" IN ('en', 'ar') AND cardinality("recipients") BETWEEN 1 AND 20);
