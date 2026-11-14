-- Preset SQL Override: commerce (online_store)
BEGIN;
UPDATE system.company
SET
  data = COALESCE(data, '{}'::jsonb) || jsonb_build_object(
    'businessActivity', 'online_store',
    'theme', COALESCE(data->'theme', '{}'::jsonb) || jsonb_build_object('stylePreset', 'market'),
    'website', COALESCE(data->'website', '{}'::jsonb) || jsonb_build_object(
      'heroStyle', 'split',
      'collection', '{"slug":"shop","layout":"product","fields":["subtitle","price","attributes","gallery"]}'::jsonb
    )
  ),
  updated_by = 'preset:commerce',
  updated_at = now()
WHERE singleton = true;

UPDATE system.module_setting
SET enabled = true, updated_by = 'preset:commerce', updated_at = now()
WHERE module_key IN ('invoicing', 'cms', 'reviews', 'products', 'procurement', 'store', 'delivery', 'hr_payroll', 'itsm', 'audit_trail', 'notifications', 'marketing');

UPDATE system.module_setting
SET enabled = false, updated_by = 'preset:commerce', updated_at = now()
WHERE module_key IN ('crm_deals', 'calendar', 'equipment', 'legal', 'pr', 'tasks');

UPDATE commerce.store_settings
SET delivery_enabled = true,
    pickup_enabled = true,
    updated_at = now()
WHERE id = 'default';
COMMIT;
