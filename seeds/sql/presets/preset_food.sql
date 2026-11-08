-- Preset SQL Override: food
BEGIN;
UPDATE system.company SET data = jsonb_set(data, '{businessActivity}', '"food"') WHERE singleton = true;
UPDATE system.module_setting SET enabled = true WHERE module_key IN ('crm_deals', 'invoicing', 'calendar', 'equipment', 'cms', 'reviews', 'products', 'procurement', 'store', 'delivery', 'hr_payroll', 'itsm', 'audit_trail', 'notifications');
COMMIT;
