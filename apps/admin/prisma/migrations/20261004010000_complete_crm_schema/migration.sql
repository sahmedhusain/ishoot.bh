-- AlterTable
ALTER TABLE "Inquiry" ADD COLUMN     "approvalNotes" TEXT,
ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "confirmedById" TEXT,
ADD COLUMN     "customAssignments" JSONB DEFAULT '[]',
ADD COLUMN     "resolutionNotes" TEXT,
ADD COLUMN     "returnReason" TEXT,
ADD COLUMN     "team" TEXT,
ADD COLUMN     "workflowStatus" TEXT NOT NULL DEFAULT 'received';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "managerId" TEXT,
ADD COLUMN     "signatureUrl" TEXT;

-- CreateTable
CREATE TABLE "MinuteOfMeeting" (
    "id" TEXT NOT NULL,
    "momNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleAr" TEXT,
    "meetingDate" DATE NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "location" TEXT,
    "dealId" TEXT,
    "clientId" TEXT,
    "attendees" JSONB NOT NULL DEFAULT '[]',
    "agenda" TEXT NOT NULL,
    "discussionPoints" JSONB NOT NULL DEFAULT '[]',
    "actionItems" JSONB NOT NULL DEFAULT '[]',
    "decisions" JSONB DEFAULT '[]',
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdById" TEXT,
    "approvedById" TEXT,
    "signatureUrl" TEXT,
    "pdfStoragePath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MinuteOfMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MinuteOfMeeting_momNumber_key" ON "MinuteOfMeeting"("momNumber");

-- CreateIndex
CREATE INDEX "MinuteOfMeeting_clientId_idx" ON "MinuteOfMeeting"("clientId");

-- CreateIndex
CREATE INDEX "MinuteOfMeeting_dealId_idx" ON "MinuteOfMeeting"("dealId");

-- CreateIndex
CREATE INDEX "MinuteOfMeeting_meetingDate_idx" ON "MinuteOfMeeting"("meetingDate");

-- CreateIndex
CREATE INDEX "MinuteOfMeeting_status_idx" ON "MinuteOfMeeting"("status");

-- CreateIndex
CREATE INDEX "Inquiry_team_workflowStatus_idx" ON "Inquiry"("team", "workflowStatus");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX "Invoice_issueDate_idx" ON "Invoice"("issueDate");

-- CreateIndex
CREATE INDEX "Invoice_createdAt_idx" ON "Invoice"("createdAt");

-- CreateIndex
CREATE INDEX "Payment_paymentDate_idx" ON "Payment"("paymentDate");

-- CreateIndex
CREATE INDEX "Payment_paymentMethod_idx" ON "Payment"("paymentMethod");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MinuteOfMeeting" ADD CONSTRAINT "MinuteOfMeeting_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "CrmDeal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MinuteOfMeeting" ADD CONSTRAINT "MinuteOfMeeting_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "CrmContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MinuteOfMeeting" ADD CONSTRAINT "MinuteOfMeeting_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MinuteOfMeeting" ADD CONSTRAINT "MinuteOfMeeting_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
