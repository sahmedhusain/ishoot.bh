-- Social media permission: admins and marketing manage it; every other role is denied explicitly.
INSERT INTO "Permission" ("id", "role", "resource", "action", "allowed")
SELECT gen_random_uuid()::text, r."id", 'social', a."action",
  r."id" IN ('super_admin', 'admin', 'marketing') AND a."action" IN ('read', 'write', 'create', 'edit', 'delete', 'export')
    OR r."id" = 'super_admin'
FROM "Role" r
CROSS JOIN (VALUES ('read'), ('write'), ('delete'), ('export'), ('approve'), ('create'), ('edit'), ('assign'), ('issue_send'), ('manage_permissions'), ('reset_credentials')) AS a("action")
ON CONFLICT ("role", "resource", "action") DO NOTHING;
