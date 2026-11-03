-- Hands "FeatureToggle" over to the system service (docs/adr/0002, 0010). The table moves, with its data, to the
-- system schema under the names the service uses (backend/services/system/migrations/00001_modules.sql). Module
-- names and descriptions are dropped: the catalogue (contracts/catalog/modules.json) owns them. If the system
-- service already created its table, legacy choices are copied for modules it has no choice for yet.
CREATE SCHEMA IF NOT EXISTS system;

DO $$
BEGIN
  IF to_regclass('public."FeatureToggle"') IS NULL THEN
    RETURN;
  END IF;

  IF to_regclass('system.module_setting') IS NOT NULL THEN
    INSERT INTO system.module_setting (module_key, enabled)
    SELECT "moduleKey", "isEnabled" FROM public."FeatureToggle"
    ON CONFLICT (module_key) DO NOTHING;
    DROP TABLE public."FeatureToggle";
    RETURN;
  END IF;

  ALTER TABLE public."FeatureToggle" SET SCHEMA system;
  ALTER TABLE system."FeatureToggle" RENAME TO module_setting;
  ALTER TABLE system.module_setting DROP CONSTRAINT "FeatureToggle_pkey";
  DROP INDEX system."FeatureToggle_moduleKey_key";
  ALTER TABLE system.module_setting DROP COLUMN id, DROP COLUMN "nameEn", DROP COLUMN "nameAr", DROP COLUMN description;
  ALTER TABLE system.module_setting RENAME COLUMN "moduleKey" TO module_key;
  ALTER TABLE system.module_setting RENAME COLUMN "isEnabled" TO enabled;
  ALTER TABLE system.module_setting
    ALTER COLUMN enabled DROP DEFAULT,
    ADD COLUMN updated_by text,
    ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now(),
    ADD CONSTRAINT module_setting_pkey PRIMARY KEY (module_key),
    ADD CONSTRAINT module_setting_key_check CHECK (length(module_key) BETWEEN 1 AND 64);
END $$;
