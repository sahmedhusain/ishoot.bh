-- Preset SQL Override: agency (agency)
BEGIN;
UPDATE system.company
SET
  data = COALESCE(data, '{}'::jsonb) || jsonb_build_object(
    'businessActivity', 'agency',
    'theme', COALESCE(data->'theme', '{}'::jsonb) || jsonb_build_object('stylePreset', 'modern'),
    'website', COALESCE(data->'website', '{}'::jsonb) || jsonb_build_object(
      'heroStyle', 'split',
      'collection', '{"slug":"case-studies","layout":"case","fields":["client","year","subtitle","video","attributes","gallery"]}'::jsonb
    )
  ),
  updated_by = 'preset:agency',
  updated_at = now()
WHERE singleton = true;

UPDATE system.module_setting
SET enabled = true, updated_by = 'preset:agency', updated_at = now()
WHERE module_key IN ('crm_deals', 'invoicing', 'calendar', 'cms', 'reviews', 'hr_payroll', 'itsm', 'audit_trail', 'notifications', 'tasks', 'marketing', 'pr');

UPDATE system.module_setting
SET enabled = false, updated_by = 'preset:agency', updated_at = now()
WHERE module_key IN ('equipment', 'products', 'procurement', 'store', 'delivery', 'legal');

UPDATE commerce.store_settings
SET delivery_enabled = false,
    pickup_enabled = false,
    updated_at = now()
WHERE id = 'default';
COMMIT;
