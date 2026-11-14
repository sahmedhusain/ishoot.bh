-- Preset SQL Override: all (media)
BEGIN;
UPDATE system.company
SET
  data = COALESCE(data, '{}'::jsonb) || jsonb_build_object(
    'businessActivity', 'media',
    'theme', COALESCE(data->'theme', '{}'::jsonb) || jsonb_build_object('stylePreset', 'cinematic'),
    'website', COALESCE(data->'website', '{}'::jsonb) || jsonb_build_object(
      'heroStyle', 'cinematic',
      'collection', '{"slug":"works","layout":"media","fields":["client","year","video","credits","gallery"]}'::jsonb
    )
  ),
  updated_by = 'preset:all',
  updated_at = now()
WHERE singleton = true;

UPDATE system.module_setting
SET enabled = true, updated_by = 'preset:all', updated_at = now()
WHERE module_key IN ('crm_deals', 'invoicing', 'calendar', 'equipment', 'cms', 'reviews', 'products', 'procurement', 'store', 'delivery', 'hr_payroll', 'itsm', 'audit_trail', 'notifications', 'legal', 'marketing', 'pr', 'tasks');

UPDATE commerce.store_settings
SET delivery_enabled = true,
    pickup_enabled = true,
    updated_at = now()
WHERE id = 'default';
COMMIT;
