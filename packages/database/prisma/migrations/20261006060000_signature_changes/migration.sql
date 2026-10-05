-- Drawn signatures replace a user's signature only after approval; rows are the change log.
-- CreateTable
CREATE TABLE "SignatureChange" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "signatureUrl" TEXT NOT NULL,
    "previousUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedById" TEXT,
    "reviewNotes" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SignatureChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SignatureChange_userId_createdAt_idx" ON "SignatureChange"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SignatureChange_status_idx" ON "SignatureChange"("status");

-- AddForeignKey
ALTER TABLE "SignatureChange" ADD CONSTRAINT "SignatureChange_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignatureChange" ADD CONSTRAINT "SignatureChange_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


ALTER TABLE "SignatureChange" ADD CONSTRAINT "SignatureChange_status_check" CHECK ("status" IN ('pending', 'approved', 'rejected', 'cancelled'));
CREATE UNIQUE INDEX "SignatureChange_one_pending_per_user" ON "SignatureChange"("userId") WHERE "status" = 'pending';

-- Default routing: the user's manager, then whoever can manage user accounts (editable in Settings → Approvals).
INSERT INTO "ApprovalPolicy" ("id", "targetType", "enabled", "allowSelfApproval", "autoApproveRoles", "updatedAt")
VALUES (gen_random_uuid()::text, 'signature_change', true, false, ARRAY[]::TEXT[], CURRENT_TIMESTAMP)
ON CONFLICT ("targetType") DO NOTHING;
INSERT INTO "ApprovalPolicyStep" ("id", "policyId", "order", "approverMode", "roleKey", "permission")
SELECT gen_random_uuid()::text, p."id", s."order", s."mode", NULL, s."permission"
FROM "ApprovalPolicy" p
JOIN (VALUES ('signature_change', 1, 'manager', NULL), ('signature_change', 2, 'permission', 'users:write'))
  AS s("targetType", "order", "mode", "permission") ON s."targetType" = p."targetType"
ON CONFLICT ("policyId", "order") DO NOTHING;
