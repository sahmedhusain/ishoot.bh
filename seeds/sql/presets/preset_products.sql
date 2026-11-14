-- Preset SQL Override: products (products)
BEGIN;
UPDATE system.company
SET
  data = COALESCE(data, '{}'::jsonb) || jsonb_build_object(
    'businessActivity', 'products',
    'theme', COALESCE(data->'theme', '{}'::jsonb) || jsonb_build_object('stylePreset', 'fresh'),
    'website', COALESCE(data->'website', '{}'::jsonb) || jsonb_build_object(
      'heroStyle', 'split',
      'collection', '{"slug":"products","layout":"product","fields":["subtitle","price","attributes","externalUrl","gallery"]}'::jsonb
    )
  ),
  updated_by = 'preset:products',
  updated_at = now()
WHERE singleton = true;

UPDATE system.module_setting
SET enabled = true, updated_by = 'preset:products', updated_at = now()
WHERE module_key IN ('crm_deals', 'invoicing', 'cms', 'reviews', 'products', 'procurement', 'store', 'delivery', 'hr_payroll', 'itsm', 'audit_trail', 'notifications', 'tasks');

UPDATE system.module_setting
SET enabled = false, updated_by = 'preset:products', updated_at = now()
WHERE module_key IN ('calendar', 'equipment', 'legal', 'marketing', 'pr');

UPDATE commerce.store_settings
SET delivery_enabled = true,
    pickup_enabled = true,
    updated_at = now()
WHERE id = 'default';
COMMIT;
