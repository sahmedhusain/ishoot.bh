CREATE TABLE "EmailJob" (
    id TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "momId" TEXT NOT NULL,
    "createdById" TEXT,
    recipient TEXT NOT NULL,
    subject TEXT NOT NULL,
    html TEXT NOT NULL,
    "attachmentName" TEXT NOT NULL,
    attachment BYTEA NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "providerId" TEXT,
    "lastError" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailJob_pkey" PRIMARY KEY (id)
);

CREATE UNIQUE INDEX "EmailJob_eventKey_key" ON "EmailJob" ("eventKey");

CREATE INDEX "EmailJob_status_nextAttemptAt_idx" ON "EmailJob" (status, "nextAttemptAt");

CREATE INDEX "EmailJob_momId_createdAt_idx" ON "EmailJob" ("momId", "createdAt");

ALTER TABLE "EmailJob"
ADD CONSTRAINT "EmailJob_momId_fkey" FOREIGN KEY ("momId") REFERENCES "MinuteOfMeeting" (id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EmailJob"
ADD CONSTRAINT "EmailJob_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" (id) ON DELETE SET NULL ON UPDATE CASCADE;