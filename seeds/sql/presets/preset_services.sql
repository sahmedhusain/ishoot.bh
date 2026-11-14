-- Preset SQL Override: services (services)
BEGIN;
UPDATE system.company
SET
  data = COALESCE(data, '{}'::jsonb) || jsonb_build_object(
    'businessActivity', 'services',
    'theme', COALESCE(data->'theme', '{}'::jsonb) || jsonb_build_object('stylePreset', 'corporate'),
    'website', COALESCE(data->'website', '{}'::jsonb) || jsonb_build_object(
      'heroStyle', 'split',
      'collection', '{"slug":"projects","layout":"case","fields":["client","year","subtitle","attributes","gallery"]}'::jsonb
    )
  ),
  updated_by = 'preset:services',
  updated_at = now()
WHERE singleton = true;

UPDATE system.module_setting
SET enabled = true, updated_by = 'preset:services', updated_at = now()
WHERE module_key IN ('crm_deals', 'invoicing', 'calendar', 'cms', 'reviews', 'hr_payroll', 'itsm', 'audit_trail', 'notifications', 'tasks', 'legal');

UPDATE system.module_setting
SET enabled = false, updated_by = 'preset:services', updated_at = now()
WHERE module_key IN ('equipment', 'products', 'procurement', 'store', 'delivery', 'marketing', 'pr');

UPDATE commerce.store_settings
SET delivery_enabled = false,
    pickup_enabled = false,
    updated_at = now()
WHERE id = 'default';
COMMIT;
