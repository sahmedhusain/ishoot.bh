-- Preset SQL Override: food (food)
BEGIN;
UPDATE system.company
SET
  data = COALESCE(data, '{}'::jsonb) || jsonb_build_object(
    'businessActivity', 'food',
    'theme', COALESCE(data->'theme', '{}'::jsonb) || jsonb_build_object('stylePreset', 'friendly'),
    'website', COALESCE(data->'website', '{}'::jsonb) || jsonb_build_object(
      'heroStyle', 'cinematic',
      'collection', '{"slug":"menu","layout":"product","fields":["subtitle","price","attributes","gallery"]}'::jsonb
    )
  ),
  updated_by = 'preset:food',
  updated_at = now()
WHERE singleton = true;

UPDATE system.module_setting
SET enabled = true, updated_by = 'preset:food', updated_at = now()
WHERE module_key IN ('invoicing', 'calendar', 'cms', 'reviews', 'products', 'procurement', 'store', 'delivery', 'hr_payroll', 'itsm', 'audit_trail', 'notifications');

UPDATE system.module_setting
SET enabled = false, updated_by = 'preset:food', updated_at = now()
WHERE module_key IN ('crm_deals', 'equipment', 'legal', 'marketing', 'pr', 'tasks');

UPDATE commerce.store_settings
SET delivery_enabled = true,
    pickup_enabled = true,
    updated_at = now()
WHERE id = 'default';
COMMIT;
