-- Approval policies: per-step thresholds, escalation and reminders.
ALTER TABLE "ApprovalPolicy" ADD COLUMN "reminderAfterHours" INTEGER;
ALTER TABLE "ApprovalPolicyStep" ADD COLUMN "minAmount" DECIMAL(14,3);
ALTER TABLE "ApprovalPolicyStep" ADD COLUMN "minDays" DECIMAL(6,2);
ALTER TABLE "ApprovalPolicyStep" ADD COLUMN "minDiscountPercent" DECIMAL(5,2);
ALTER TABLE "ApprovalPolicyStep" ADD COLUMN "escalateAfterHours" INTEGER;
ALTER TABLE "ApprovalPolicyStep" ADD COLUMN "escalateMode" TEXT;
ALTER TABLE "ApprovalPolicyStep" ADD COLUMN "escalateRoleKey" TEXT;
ALTER TABLE "ApprovalPolicyStep" ADD COLUMN "escalateUserId" TEXT;
ALTER TABLE "ApprovalPolicyStep" ADD CONSTRAINT "ApprovalPolicyStep_escalateMode_check" CHECK ("escalateMode" IS NULL OR "escalateMode" IN ('role', 'user'));
ALTER TABLE "ApprovalPolicyStep" ADD CONSTRAINT "ApprovalPolicyStep_escalate_check" CHECK (("escalateAfterHours" IS NULL) = ("escalateMode" IS NULL));
ALTER TABLE "ApprovalPolicy" ADD CONSTRAINT "ApprovalPolicy_reminder_check" CHECK ("reminderAfterHours" IS NULL OR "reminderAfterHours" > 0);
ALTER TABLE "ApprovalRequest" ADD COLUMN "metrics" JSONB;
ALTER TABLE "ApprovalRequest" ADD COLUMN "stepStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ApprovalRequest" ADD COLUMN "remindedAt" TIMESTAMP(3);
ALTER TABLE "ApprovalRequest" ADD COLUMN "escalatedAt" TIMESTAMP(3);
UPDATE "ApprovalRequest" SET "stepStartedAt" = "updatedAt";
