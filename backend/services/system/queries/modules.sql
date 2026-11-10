SELECT * FROM system.module_setting ORDER BY module_key;
INSERT INTO system.module_setting (module_key, enabled, updated_by, updated_at)
VALUES (@module_key, @enabled, @updated_by, @updated_at)
ON CONFLICT (module_key) DO UPDATE SET enabled = EXCLUDED.enabled, updated_by = EXCLUDED.updated_by,
    updated_at = EXCLUDED.updated_at;
