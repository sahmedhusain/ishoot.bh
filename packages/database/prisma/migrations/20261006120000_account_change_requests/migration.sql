-- CreateTable
CREATE TABLE "AccountChangeRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "changes" JSONB NOT NULL,
    "before" JSONB NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "decidedById" TEXT,
    "reviewNotes" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccountChangeRequest_userId_createdAt_idx" ON "AccountChangeRequest"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AccountChangeRequest_status_idx" ON "AccountChangeRequest"("status");

-- AddForeignKey
ALTER TABLE "AccountChangeRequest" ADD CONSTRAINT "AccountChangeRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountChangeRequest" ADD CONSTRAINT "AccountChangeRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "AccountChangeRequest" ADD CONSTRAINT "AccountChangeRequest_status_check" CHECK ("status" IN ('pending', 'approved', 'rejected', 'cancelled'));

-- Account changes filed by HR are approved by an executive admin (Super Admin may always step in).
INSERT INTO "ApprovalPolicy" ("id", "targetType", "enabled", "allowSelfApproval", "autoApproveRoles", "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'account_change', true, false, ARRAY['super_admin'], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("targetType") DO NOTHING;
INSERT INTO "ApprovalPolicyStep" ("id", "policyId", "order", "approverMode", "roleKey")
SELECT gen_random_uuid()::text, p."id", 1, 'role', 'admin' FROM "ApprovalPolicy" p WHERE p."targetType" = 'account_change'
ON CONFLICT ("policyId", "order") DO NOTHING;
