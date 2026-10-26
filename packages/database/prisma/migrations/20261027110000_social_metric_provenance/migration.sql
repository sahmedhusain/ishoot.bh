-- Preserve old rows without claiming that their origin or default zeroes were verified.
ALTER TABLE "SocialPost"
  ADD COLUMN "sourceProvider" TEXT,
  ADD COLUMN "sourceAccountId" TEXT;
ALTER TABLE "SocialMetric"
  ADD COLUMN "sourceProvider" TEXT,
  ADD COLUMN "sourceAccountId" TEXT,
  ALTER COLUMN "value" TYPE DOUBLE PRECISION;
ALTER TABLE "SocialPost" ALTER COLUMN "likes" DROP DEFAULT, ALTER COLUMN "likes" DROP NOT NULL, ALTER COLUMN "likes" TYPE DOUBLE PRECISION;
ALTER TABLE "SocialPost" ALTER COLUMN "comments" DROP DEFAULT, ALTER COLUMN "comments" DROP NOT NULL, ALTER COLUMN "comments" TYPE DOUBLE PRECISION;
ALTER TABLE "SocialPost" ALTER COLUMN "shares" DROP DEFAULT, ALTER COLUMN "shares" DROP NOT NULL, ALTER COLUMN "shares" TYPE DOUBLE PRECISION;
ALTER TABLE "SocialPost" ALTER COLUMN "views" DROP DEFAULT, ALTER COLUMN "views" DROP NOT NULL, ALTER COLUMN "views" TYPE DOUBLE PRECISION;
ALTER TABLE "SocialPost" ALTER COLUMN "reach" DROP DEFAULT, ALTER COLUMN "reach" DROP NOT NULL, ALTER COLUMN "reach" TYPE DOUBLE PRECISION;
ALTER TABLE "SocialPost" ALTER COLUMN "saves" DROP DEFAULT, ALTER COLUMN "saves" DROP NOT NULL, ALTER COLUMN "saves" TYPE DOUBLE PRECISION;

CREATE TABLE "SocialPostSnapshot" (
  "id" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "sourceAccountId" TEXT NOT NULL,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "counters" JSONB NOT NULL,
  CONSTRAINT "SocialPostSnapshot_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SocialPostSnapshot_postId_fkey" FOREIGN KEY ("postId") REFERENCES "SocialPost"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SocialPostSnapshot_postId_recordedAt_key" ON "SocialPostSnapshot"("postId", "recordedAt");
CREATE INDEX "SocialPostSnapshot_recordedAt_idx" ON "SocialPostSnapshot"("recordedAt");
CREATE INDEX "SocialMetric_sourceProvider_sourceAccountId_recordedAt_idx" ON "SocialMetric"("sourceProvider", "sourceAccountId", "recordedAt");
