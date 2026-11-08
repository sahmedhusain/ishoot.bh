-- ============================================================================
-- PURE SQL BOOTSTRAP: Minimal Clean Installation
-- Super Admin, IT Admin, System Roles & Core Module Settings
-- ============================================================================
BEGIN;

TRUNCATE TABLE
    system.company_asset,
    system.company
CASCADE;

-- Base company row for setup wizard
INSERT INTO system.company (id, singleton, data, currency_locked, revision, updated_by, updated_at)
VALUES ('c0000000-0000-0000-0000-000000000001', true, '{"websitePublished": false}'::jsonb, false, 1, 'bootstrap:sql', now())
ON CONFLICT (singleton) DO UPDATE SET data = EXCLUDED.data, updated_at = now();

-- Default sequences
INSERT INTO system.document_sequence (kind, prefix, next_number)
VALUES ('invoice', 'INV', 101), ('receipt', 'RCT', 101)
ON CONFLICT (kind) DO UPDATE SET prefix = EXCLUDED.prefix, next_number = EXCLUDED.next_number;

-- Staff roles
INSERT INTO identity.staff_role (id, name_en, name_ar, is_system, created_at, revision) VALUES
  ('super_admin', 'Super Administrator', 'المسؤول العام', true, now(), 1),
  ('admin', 'Administrator', 'مدير النظام', true, now(), 1),
  ('finance_manager', 'Finance Manager', 'المدير المالي', true, now(), 1),
  ('operations_manager', 'Operations Manager', 'مدير العمليات', true, now(), 1),
  ('project_lead', 'Project Lead', 'مدير المشروع', true, now(), 1),
  ('editor', 'Editor', 'محرر محتوى', true, now(), 1),
  ('accountant', 'Accountant', 'محاسب', true, now(), 1),
  ('sales', 'Sales Specialist', 'أخصائي مبيعات', true, now(), 1),
  ('marketing', 'Marketing Specialist', 'أخصائي تسويق', true, now(), 1),
  ('viewer', 'Viewer', 'مراقب عام', true, now(), 1)
ON CONFLICT (id) DO NOTHING;

-- First Accounts (Email: admin@example.com, Password: Admin12345678!)
INSERT INTO identity.account (realm, subject_id, email, username, password_hash, roles, active, mfa_enabled, created_at, updated_at)
VALUES
  ('it', '430c4105-6360-4415-bf1b-087d582c7fc6', 'admin@example.com', 'IT0001', '$argon2id$v=19$m=19456,t=2,p=1$TAbJr6lgxdcxC+ljsAmHwA$rUz/JqqAj5GjSgxeRLIbcPcm4jy9Gg29sgKoUxhKjqU', '{"it_admin"}', true, false, now(), now()),
  ('staff', 'super-admin', 'admin@example.com', 'BA0001', '$argon2id$v=19$m=19456,t=2,p=1$TAbJr6lgxdcxC+ljsAmHwA$rUz/JqqAj5GjSgxeRLIbcPcm4jy9Gg29sgKoUxhKjqU', '{"super_admin"}', true, false, now(), now())
ON CONFLICT (realm, subject_id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, active = true, updated_at = now();

INSERT INTO identity.staff_access (realm, subject_id, permission_overrides, updated_at) VALUES ('staff', 'super-admin', '{}'::jsonb, now()) ON CONFLICT (realm, subject_id) DO NOTHING;

-- Default modules (14 feature modules)
INSERT INTO system.module_setting (module_key, enabled, updated_by, updated_at) VALUES
  ('crm_deals', true, 'bootstrap', now()),
  ('invoicing', true, 'bootstrap', now()),
  ('calendar', true, 'bootstrap', now()),
  ('equipment', true, 'bootstrap', now()),
  ('cms', true, 'bootstrap', now()),
  ('reviews', true, 'bootstrap', now()),
  ('products', true, 'bootstrap', now()),
  ('procurement', true, 'bootstrap', now()),
  ('store', true, 'bootstrap', now()),
  ('delivery', true, 'bootstrap', now()),
  ('hr_payroll', true, 'bootstrap', now()),
  ('itsm', true, 'bootstrap', now()),
  ('audit_trail', true, 'bootstrap', now()),
  ('notifications', true, 'bootstrap', now())
ON CONFLICT (module_key) DO NOTHING;

-- Default SLA Policies
INSERT INTO itsm.sla_policy (priority, response_minutes, resolve_minutes, updated_by, updated_at) VALUES
  ('critical', 30, 240, 'bootstrap', now()),
  ('high', 120, 1440, 'bootstrap', now()),
  ('normal', 480, 4320, 'bootstrap', now()),
  ('low', 1440, 10080, 'bootstrap', now())
ON CONFLICT (priority) DO UPDATE SET response_minutes = EXCLUDED.response_minutes, resolve_minutes = EXCLUDED.resolve_minutes, updated_at = now();

COMMIT;
