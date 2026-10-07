-- Exit and leave handovers: cases reassigned, assets returned, checklist, approved by HR and an admin.
ALTER TABLE "LeaveType" ADD COLUMN "requiresHandover" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "EmployeeHandover" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "leaveRequestId" TEXT,
  "effectiveDate" DATE NOT NULL,
  "returnDate" DATE,
  "reason" TEXT,
  "status" TEXT NOT NULL DEFAULT 'open',
  "casesMode" TEXT NOT NULL DEFAULT 'manual',
  "delegateUserId" TEXT,
  "teamUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "checklist" JSONB NOT NULL DEFAULT '[]',
  "notes" TEXT,
  "createdById" TEXT NOT NULL,
  "decidedAt" TIMESTAMP(3),
  "decisionNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmployeeHandover_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EmployeeHandover_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "EmployeeHandover_kind_check" CHECK ("kind" IN ('exit', 'leave')),
  CONSTRAINT "EmployeeHandover_status_check" CHECK ("status" IN ('open', 'pending_approval', 'completed', 'rejected', 'cancelled')),
  CONSTRAINT "EmployeeHandover_mode_check" CHECK ("casesMode" IN ('delegate', 'spread', 'manual')),
  CONSTRAINT "EmployeeHandover_dates_check" CHECK ("returnDate" IS NULL OR "returnDate" >= "effectiveDate")
);
CREATE UNIQUE INDEX "EmployeeHandover_reference_key" ON "EmployeeHandover"("reference");
CREATE UNIQUE INDEX "EmployeeHandover_leaveRequestId_key" ON "EmployeeHandover"("leaveRequestId");
CREATE INDEX "EmployeeHandover_employeeId_idx" ON "EmployeeHandover"("employeeId");
CREATE INDEX "EmployeeHandover_status_idx" ON "EmployeeHandover"("status");
-- One open exit handover per employee.
CREATE UNIQUE INDEX "EmployeeHandover_one_open_exit" ON "EmployeeHandover"("employeeId") WHERE "kind" = 'exit' AND "status" IN ('open', 'pending_approval');

CREATE TABLE "EmployeeHandoverCase" (
  "id" TEXT NOT NULL,
  "handoverId" TEXT NOT NULL,
  "caseType" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "toUserId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "reassignedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmployeeHandoverCase_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EmployeeHandoverCase_handoverId_fkey" FOREIGN KEY ("handoverId") REFERENCES "EmployeeHandover"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "EmployeeHandoverCase_type_check" CHECK ("caseType" IN ('request', 'deal', 'approval')),
  CONSTRAINT "EmployeeHandoverCase_status_check" CHECK ("status" IN ('pending', 'reassigned', 'closed'))
);
CREATE UNIQUE INDEX "EmployeeHandoverCase_handoverId_caseType_caseId_key" ON "EmployeeHandoverCase"("handoverId", "caseType", "caseId");

-- Approved by HR, then an executive admin (editable in Settings → Approvals).
INSERT INTO "ApprovalPolicy" ("id", "targetType", "enabled", "allowSelfApproval", "autoApproveRoles", "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'employee_handover', true, false, ARRAY['super_admin'], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("targetType") DO NOTHING;
INSERT INTO "ApprovalPolicyStep" ("id", "policyId", "order", "approverMode", "permission", "roleKey")
SELECT gen_random_uuid()::text, p."id", s."order", s."mode", s."permission", s."role"
FROM "ApprovalPolicy" p
CROSS JOIN (VALUES (1, 'permission', 'employees:approve', NULL), (2, 'role', NULL, 'admin')) AS s("order", "mode", "permission", "role")
WHERE p."targetType" = 'employee_handover'
ON CONFLICT ("policyId", "order") DO NOTHING;
