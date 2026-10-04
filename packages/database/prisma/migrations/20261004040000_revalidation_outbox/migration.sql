-- CreateTable
CREATE TABLE "RevalidationJob" (
    "id" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RevalidationJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RevalidationJob_eventKey_key" ON "RevalidationJob"("eventKey");

-- CreateIndex
CREATE INDEX "RevalidationJob_status_nextAttemptAt_idx" ON "RevalidationJob"("status", "nextAttemptAt");

