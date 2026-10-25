-- Role templates for any activity. The two media roles keep everything they had under neutral ids:
-- production_manager → operations_manager and producer → project_lead. Their names, grants and members move,
-- every stored reference (approval policies, announcement and calendar audiences) follows, and the old
-- ids are removed. Nothing else changes; the other new templates are created by bootstrap or on first use.
INSERT INTO "Role" ("id", "nameEn", "nameAr", "isSystem", "createdAt")
SELECT 'operations_manager', "nameEn", "nameAr", true, "createdAt" FROM "Role" WHERE "id" = 'production_manager'
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Role" ("id", "nameEn", "nameAr", "isSystem", "createdAt")
SELECT 'project_lead', "nameEn", "nameAr", true, "createdAt" FROM "Role" WHERE "id" = 'producer'
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Permission" ("id", "role", "resource", "action", "allowed", "createdAt")
SELECT gen_random_uuid()::text, 'operations_manager', "resource", "action", "allowed", "createdAt" FROM "Permission" WHERE "role" = 'production_manager'
ON CONFLICT ("role", "resource", "action") DO NOTHING;
INSERT INTO "Permission" ("id", "role", "resource", "action", "allowed", "createdAt")
SELECT gen_random_uuid()::text, 'project_lead', "resource", "action", "allowed", "createdAt" FROM "Permission" WHERE "role" = 'producer'
ON CONFLICT ("role", "resource", "action") DO NOTHING;

UPDATE "User" SET "role" = 'operations_manager' WHERE "role" = 'production_manager';
UPDATE "User" SET "role" = 'project_lead' WHERE "role" = 'producer';

UPDATE "ApprovalPolicy" SET "autoApproveRoles" = array_replace(array_replace("autoApproveRoles", 'production_manager', 'operations_manager'), 'producer', 'project_lead');
UPDATE "ApprovalPolicyStep" SET "roleKey" = 'operations_manager' WHERE "roleKey" = 'production_manager';
UPDATE "ApprovalPolicyStep" SET "roleKey" = 'project_lead' WHERE "roleKey" = 'producer';
UPDATE "ApprovalPolicyStep" SET "escalateRoleKey" = 'operations_manager' WHERE "escalateRoleKey" = 'production_manager';
UPDATE "ApprovalPolicyStep" SET "escalateRoleKey" = 'project_lead' WHERE "escalateRoleKey" = 'producer';
UPDATE "Announcement" SET "audienceRoles" = array_replace(array_replace("audienceRoles", 'production_manager', 'operations_manager'), 'producer', 'project_lead');
UPDATE "CalendarEvent" SET "audienceRoles" = array_replace(array_replace("audienceRoles", 'production_manager', 'operations_manager'), 'producer', 'project_lead');

DELETE FROM "Role" WHERE "id" IN ('production_manager', 'producer') AND NOT EXISTS (SELECT 1 FROM "User" u WHERE u."role" = "Role"."id");
