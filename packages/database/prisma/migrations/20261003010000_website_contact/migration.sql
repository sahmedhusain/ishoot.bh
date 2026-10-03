-- AlterTable
ALTER TABLE "Inquiry" ADD COLUMN     "assignedToId" TEXT,
ADD COLUMN     "confirmationProviderId" TEXT,
ADD COLUMN     "confirmationStatus" TEXT NOT NULL DEFAULT 'unknown',
ADD COLUMN     "intent" TEXT NOT NULL DEFAULT 'inquiry',
ADD COLUMN     "location" TEXT,
ADD COLUMN     "notificationProviderId" TEXT,
ADD COLUMN     "notificationStatus" TEXT NOT NULL DEFAULT 'unknown',
ADD COLUMN     "priority" TEXT NOT NULL DEFAULT 'normal',
ADD COLUMN     "projectReference" TEXT,
ADD COLUMN     "reference" TEXT,
ADD COLUMN     "requestHash" TEXT,
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "serviceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "submissionKey" TEXT;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "originalLocale" TEXT,
ADD COLUMN     "requestHash" TEXT,
ADD COLUMN     "submissionKey" TEXT;

-- CreateTable
CREATE TABLE "InquiryNote" (
    "id" TEXT NOT NULL,
    "inquiryId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InquiryNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteContent" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "draft" JSONB NOT NULL,
    "published" JSONB,
    "previous" JSONB,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "publishedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteContent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InquiryNote_inquiryId_createdAt_idx" ON "InquiryNote"("inquiryId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Inquiry_reference_key" ON "Inquiry"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Inquiry_submissionKey_key" ON "Inquiry"("submissionKey");

-- CreateIndex
CREATE INDEX "Inquiry_intent_status_createdAt_idx" ON "Inquiry"("intent", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Inquiry_assignedToId_status_createdAt_idx" ON "Inquiry"("assignedToId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Review_submissionKey_key" ON "Review"("submissionKey");

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InquiryNote" ADD CONSTRAINT "InquiryNote_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InquiryNote" ADD CONSTRAINT "InquiryNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Preserve legacy requests and give each a stable reference before enforcing NOT NULL.
UPDATE "Inquiry" SET "reference" = 'LEGACY-' || id WHERE "reference" IS NULL;
ALTER TABLE "Inquiry" ALTER COLUMN "reference" SET NOT NULL;
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_intent_check" CHECK (intent IN ('inquiry', 'quote_request', 'complaint', 'suggestion'));
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_priority_check" CHECK (priority IN ('normal', 'high', 'urgent'));
ALTER TABLE "Review" ADD CONSTRAINT "Review_rating_check" CHECK (rating BETWEEN 1 AND 5) NOT VALID;
