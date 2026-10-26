-- AlterTable
ALTER TABLE "ApprovalDecision"
ADD COLUMN "step" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "ApprovalRequest" ADD COLUMN     "approverIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "currentStep" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "policyId" TEXT,
ADD COLUMN     "selfApproved" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable


CREATE TABLE "ApprovalPolicy" (
    "id" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "allowSelfApproval" BOOLEAN NOT NULL DEFAULT false,
    "autoApproveRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalPolicyStep" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "approverMode" TEXT NOT NULL,
    "roleKey" TEXT,
    "userId" TEXT,
    "permission" TEXT,
    CONSTRAINT "ApprovalPolicyStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalPolicy_targetType_key" ON "ApprovalPolicy" ("targetType");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalPolicyStep_policyId_order_key" ON "ApprovalPolicyStep" ("policyId", "order");

-- AddForeignKey
ALTER TABLE "ApprovalRequest"
ADD CONSTRAINT "ApprovalRequest_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "ApprovalPolicy" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalPolicyStep"
ADD CONSTRAINT "ApprovalPolicyStep_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "ApprovalPolicy" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Default approval policies (editable later in Settings → Approvals).
-- Quotations and payroll keep the existing product rule: Super Admin approves.
INSERT INTO "ApprovalPolicy" ("id", "targetType", "enabled", "allowSelfApproval", "autoApproveRoles", "updatedAt") VALUES
  (gen_random_uuid()::text, 'leave_request',   true,  false, ARRAY[]::TEXT[], CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'salary_document', true,  false, ARRAY[]::TEXT[], CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'profile_change',  true,  false, ARRAY[]::TEXT[], CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'service_request', true,  false, ARRAY[]::TEXT[], CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'quotation',       true,  false, ARRAY[]::TEXT[], CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'payroll_run',     true,  false, ARRAY[]::TEXT[], CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'expense',         true,  false, ARRAY[]::TEXT[], CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'invoice',         false, false, ARRAY[]::TEXT[], CURRENT_TIMESTAMP)
ON CONFLICT ("targetType") DO NOTHING;

INSERT INTO "ApprovalPolicyStep" ("id", "policyId", "order", "approverMode", "roleKey", "permission")
SELECT gen_random_uuid()::text, p."id", s."order", s."mode", s."roleKey", s."permission"
FROM "ApprovalPolicy" p
JOIN (VALUES
  ('leave_request',   1, 'manager',    NULL,          NULL),
  ('leave_request',   2, 'permission', NULL,          'employees:approve'),
  ('salary_document', 1, 'permission', NULL,          'payroll:issue_send'),
  ('profile_change',  1, 'manager',    NULL,          NULL),
  ('service_request', 1, 'permission', NULL,          'requests:approve'),
  ('quotation',       1, 'role',       'super_admin', NULL),
  ('payroll_run',     1, 'role',       'super_admin', NULL),
  ('expense',         1, 'permission', NULL,          'expenses:approve'),
  ('invoice',         1, 'role',       'super_admin', NULL)
) AS s("targetType", "order", "mode", "roleKey", "permission") ON s."targetType" = p."targetType"
ON CONFLICT ("policyId", "order") DO NOTHING;

-- Self-service HR access for every role, so any linked employee can file leave and payslip requests.
INSERT INTO "Permission" ("id", "role", "resource", "action", "allowed")
SELECT gen_random_uuid()::text, r."id", 'self_service', a."action", true
FROM "Role" r CROSS JOIN (VALUES ('read'), ('create')) AS a("action")
ON CONFLICT ("role", "resource", "action") DO UPDATE SET "allowed" = true;

-- New default grants that the approval policies above rely on.
INSERT INTO "Permission" ("id", "role", "resource", "action", "allowed")
SELECT gen_random_uuid()::text, g."role", g."resource", g."action", true
FROM (VALUES
  ('finance_manager',    'payroll',   'issue_send'),
  ('finance_manager',    'employees', 'read'),
  ('finance_manager',    'expenses',  'approve'),
  ('accountant',         'payroll',   'read'),
  ('accountant',         'payroll',   'issue_send'),
  ('admin',              'requests',  'approve'),
  ('production_manager', 'requests',  'approve')
) AS g("role", "resource", "action")
WHERE EXISTS (SELECT 1 FROM "Role" r WHERE r."id" = g."role")
ON CONFLICT ("role", "resource", "action") DO UPDATE SET "allowed" = true;