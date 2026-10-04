CREATE TABLE "AbuseWindow" (key TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 1, "expiresAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "AbuseWindow_pkey" PRIMARY KEY (key));
CREATE INDEX "AbuseWindow_expiresAt_idx" ON "AbuseWindow"("expiresAt");
