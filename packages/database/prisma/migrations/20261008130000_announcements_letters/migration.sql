-- Official announcements with read receipts, a notifications inbox people can tidy, official letters from editable
-- templates, and the permissions that control them.

ALTER TABLE "Notification" ADD COLUMN "hiddenAt" TIMESTAMP(3);

CREATE INDEX "Notification_userId_hiddenAt_createdAt_idx" ON "Notification" (
    "userId",
    "hiddenAt",
    "createdAt"
);

-- Who may announce, beyond the permission: reporting managers to their own team.
CREATE TABLE "CommunicationSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "managersAnnounceToTeam" BOOLEAN NOT NULL DEFAULT true,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommunicationSettings_pkey" PRIMARY KEY ("id")
);

INSERT INTO
    "CommunicationSettings" ("id")
VALUES ('default') ON CONFLICT DO NOTHING;

CREATE TABLE "Announcement" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "titleEn" TEXT NOT NULL,
  "titleAr" TEXT NOT NULL,
  "bodyEn" TEXT NOT NULL,
  "bodyAr" TEXT NOT NULL,
  -- general | policy | hr | holiday | event | operations | urgent
  "category" TEXT NOT NULL DEFAULT 'general',
  -- normal | important | urgent
  "priority" TEXT NOT NULL DEFAULT 'normal',
  -- company | team | departments | roles | people
  "audience" TEXT NOT NULL DEFAULT 'company',
  "audienceDepartmentIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "audienceRoles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "audienceUserIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  -- An official announcement is also issued as a signed and stamped document on the letterhead.
  "official" BOOLEAN NOT NULL DEFAULT false,
  "requiresAcknowledgement" BOOLEAN NOT NULL DEFAULT false,
  "pinned" BOOLEAN NOT NULL DEFAULT false,
  -- draft | pending_approval | published | rejected | archived
  "status" TEXT NOT NULL DEFAULT 'draft',
  "publishAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "createdById" TEXT NOT NULL,
  "signedById" TEXT,
  "signatureUrl" TEXT,
  "signedAt" TIMESTAMP(3),
  "decisionNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Announcement_status_check" CHECK ("status" IN ('draft', 'pending_approval', 'published', 'rejected', 'archived')),
  CONSTRAINT "Announcement_audience_check" CHECK ("audience" IN ('company', 'team', 'departments', 'roles', 'people')),
  CONSTRAINT "Announcement_priority_check" CHECK ("priority" IN ('normal', 'important', 'urgent'))
);

CREATE UNIQUE INDEX "Announcement_reference_key" ON "Announcement" ("reference");

CREATE INDEX "Announcement_status_publishedAt_idx" ON "Announcement" ("status", "publishedAt");

CREATE TABLE "AnnouncementReceipt" (
    "announcementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "hiddenAt" TIMESTAMP(3),
    CONSTRAINT "AnnouncementReceipt_pkey" PRIMARY KEY ("announcementId", "userId"),
    CONSTRAINT "AnnouncementReceipt_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AnnouncementReceipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "AnnouncementReceipt_userId_idx" ON "AnnouncementReceipt" ("userId");

CREATE TABLE "LetterTemplate" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "subjectEn" TEXT NOT NULL DEFAULT '',
    "subjectAr" TEXT NOT NULL DEFAULT '',
    "bodyEn" TEXT NOT NULL DEFAULT '',
    "bodyAr" TEXT NOT NULL DEFAULT '',
    -- Letters about an employee fill their name, job, dates and pay from the HR record.
    "aboutEmployee" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LetterTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LetterTemplate_key_key" ON "LetterTemplate" ("key");

CREATE TABLE "OfficialLetter" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "templateId" TEXT,
  "employeeId" TEXT,
  -- Which languages the letter is issued in: ar, en or both (one PDF each).
  "languages" TEXT[] NOT NULL DEFAULT ARRAY['ar', 'en']::TEXT[],
  "recipientName" TEXT,
  "recipientTitle" TEXT,
  "recipientOrganization" TEXT,
  "recipientAddress" TEXT,
  "subjectEn" TEXT NOT NULL DEFAULT '',
  "subjectAr" TEXT NOT NULL DEFAULT '',
  "bodyEn" TEXT NOT NULL DEFAULT '',
  "bodyAr" TEXT NOT NULL DEFAULT '',
  "letterDate" DATE NOT NULL,
  -- confidential | internal | external
  "classification" TEXT NOT NULL DEFAULT 'external',
  "showSignature" BOOLEAN NOT NULL DEFAULT true,
  "showStamp" BOOLEAN NOT NULL DEFAULT true,
  -- draft | pending_approval | approved | rejected | cancelled
  "status" TEXT NOT NULL DEFAULT 'draft',
  "createdById" TEXT NOT NULL,
  "signerId" TEXT,
  "signatureUrl" TEXT,
  "signedAt" TIMESTAMP(3),
  "verificationCode" TEXT NOT NULL,
  "decisionNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OfficialLetter_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OfficialLetter_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "LetterTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "OfficialLetter_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "OfficialLetter_status_check" CHECK ("status" IN ('draft', 'pending_approval', 'approved', 'rejected', 'cancelled')),
  CONSTRAINT "OfficialLetter_classification_check" CHECK ("classification" IN ('confidential', 'internal', 'external'))
);

CREATE UNIQUE INDEX "OfficialLetter_reference_key" ON "OfficialLetter" ("reference");

CREATE UNIQUE INDEX "OfficialLetter_verificationCode_key" ON "OfficialLetter" ("verificationCode");

CREATE INDEX "OfficialLetter_status_idx" ON "OfficialLetter" ("status");

INSERT INTO "LetterTemplate" ("id", "key", "nameEn", "nameAr", "subjectEn", "subjectAr", "bodyEn", "bodyAr", "aboutEmployee", "displayOrder") VALUES
(gen_random_uuid()::text, 'general', 'General letter', 'خطاب عام', '', '', '', '', false, 0),
(gen_random_uuid()::text, 'to_whom', 'To whom it may concern', 'إلى من يهمه الأمر', 'To whom it may concern', 'إلى من يهمه الأمر',
 E'This is to certify that {{employee.name}}, holder of CPR {{employee.cpr}}, has been working with {{company.name}} as {{employee.jobTitle}} since {{employee.hireDate}}.\n\nThis letter is issued at the employee''s request without any liability on the company.',
 E'تشهد {{company.name}} بأن السيد/السيدة {{employee.name}}، حامل الرقم الشخصي {{employee.cpr}}، يعمل لدينا بوظيفة {{employee.jobTitle}} منذ {{employee.hireDate}}.\n\nأُعطي هذا الخطاب بناءً على طلب الموظف دون أدنى مسؤولية على الشركة.', true, 1),
(gen_random_uuid()::text, 'experience', 'Experience certificate', 'شهادة خبرة', 'Experience certificate', 'شهادة خبرة',
 E'This is to certify that {{employee.name}} worked with {{company.name}} as {{employee.jobTitle}} from {{employee.hireDate}}.\n\nDuring this period they showed commitment and good conduct. We wish them every success.',
 E'تشهد {{company.name}} بأن {{employee.name}} عمل لديها بوظيفة {{employee.jobTitle}} اعتبارًا من {{employee.hireDate}}.\n\nوقد أبدى خلال هذه الفترة التزامًا وحسن سلوك، ونتمنى له التوفيق.', true, 2),
(gen_random_uuid()::text, 'noc', 'No objection certificate', 'شهادة عدم ممانعة', 'No objection certificate', 'شهادة عدم ممانعة',
 E'{{company.name}} has no objection to {{employee.name}}, our {{employee.jobTitle}}, {{purpose}}.\n\nThis certificate is issued at the employee''s request.',
 E'لا تمانع {{company.name}} في قيام موظفها {{employee.name}}، {{employee.jobTitle}}، بـ{{purpose}}.\n\nأُعطيت هذه الشهادة بناءً على طلب الموظف.', true, 3),
(gen_random_uuid()::text, 'bank', 'Letter to a bank', 'خطاب إلى بنك', 'Salary confirmation', 'تأكيد راتب',
 E'We confirm that {{employee.name}}, CPR {{employee.cpr}}, is employed with {{company.name}} as {{employee.jobTitle}} since {{employee.hireDate}}, with a total monthly salary of {{employee.grossSalary}}.\n\nThis letter is issued at the employee''s request without any liability on the company.',
 E'نؤكد أن {{employee.name}}، الرقم الشخصي {{employee.cpr}}، يعمل لدى {{company.name}} بوظيفة {{employee.jobTitle}} منذ {{employee.hireDate}}، براتب شهري إجمالي قدره {{employee.grossSalary}}.\n\nأُعطي هذا الخطاب بناءً على طلب الموظف دون أدنى مسؤولية على الشركة.', true, 4)
ON CONFLICT ("key") DO NOTHING;

-- Permissions: everyone reads announcements; managers and admins post them; admins approve; letters are admin work.
INSERT INTO "Permission" ("id", "role", "resource", "action", "allowed")
SELECT gen_random_uuid()::text, r."id", 'announcements', a."action",
  r."id" = 'super_admin'
  OR a."action" = 'read'
  OR (r."id" = 'admin' AND a."action" IN ('write', 'create', 'edit', 'delete', 'approve', 'export'))
  OR (r."id" IN ('finance_manager', 'production_manager') AND a."action" IN ('write', 'create', 'edit'))
FROM "Role" r
CROSS JOIN (VALUES ('read'), ('write'), ('delete'), ('export'), ('approve'), ('create'), ('edit'), ('assign'), ('issue_send'), ('manage_permissions'), ('reset_credentials')) AS a("action")
ON CONFLICT ("role", "resource", "action") DO NOTHING;

INSERT INTO "Permission" ("id", "role", "resource", "action", "allowed")
SELECT gen_random_uuid()::text, r."id", 'letters', a."action",
  r."id" = 'super_admin'
  OR (r."id" = 'admin' AND a."action" IN ('read', 'write', 'create', 'edit', 'delete', 'approve', 'export', 'issue_send'))
  OR (r."id" = 'finance_manager' AND a."action" IN ('read'))
FROM "Role" r
CROSS JOIN (VALUES ('read'), ('write'), ('delete'), ('export'), ('approve'), ('create'), ('edit'), ('assign'), ('issue_send'), ('manage_permissions'), ('reset_credentials')) AS a("action")
ON CONFLICT ("role", "resource", "action") DO NOTHING;

-- Announcements and letters are approved by whoever holds the approve permission (admins by default).
INSERT INTO "ApprovalPolicy" ("id", "targetType", "enabled", "allowSelfApproval", "autoApproveRoles", "createdAt", "updatedAt") VALUES
  (gen_random_uuid()::text, 'announcement', true, false, ARRAY['super_admin', 'admin'], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'official_letter', true, false, ARRAY['super_admin'], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("targetType") DO NOTHING;

INSERT INTO "ApprovalPolicyStep" ("id", "policyId", "order", "approverMode", "permission")
SELECT gen_random_uuid()::text, p."id", 1, 'permission', CASE p."targetType" WHEN 'announcement' THEN 'announcements:approve' ELSE 'letters:approve' END
FROM "ApprovalPolicy" p WHERE p."targetType" IN ('announcement', 'official_letter')
ON CONFLICT ("policyId", "order") DO NOTHING;