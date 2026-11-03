-- Hands "IntegrationSetting" over to the system service (docs/adr/0002, 0010). The table moves, with its data, to the
-- system schema under the names the service uses (backend/services/system/migrations/00002_integrations.sql).
-- If the system service already created its table, legacy settings are copied for providers it has no setting for yet.
CREATE SCHEMA IF NOT EXISTS system;

DO $$
BEGIN
  IF to_regclass('public."IntegrationSetting"') IS NULL THEN
    RETURN;
  END IF;

  IF to_regclass('system.integration_setting') IS NOT NULL THEN
    INSERT INTO system.integration_setting (
      provider, is_active, credentials, config, sync_lease_token, sync_lease_until,
      health_status, last_checked_at, last_error, account_name, last_synced_at,
      updated_at, updated_by
    )
    SELECT
      provider, "isActive", credentials, COALESCE(config, '{}'::jsonb), "syncLeaseToken", "syncLeaseUntil",
      "healthStatus", "lastCheckedAt", "lastError", "accountName", "lastSyncedAt",
      "updatedAt", "updatedById"
    FROM public."IntegrationSetting"
    ON CONFLICT (provider) DO NOTHING;
    DROP TABLE public."IntegrationSetting";
    RETURN;
  END IF;

  ALTER TABLE public."IntegrationSetting" SET SCHEMA system;
  ALTER TABLE system."IntegrationSetting" RENAME TO integration_setting;
  ALTER TABLE system.integration_setting RENAME COLUMN "isActive" TO is_active;
  ALTER TABLE system.integration_setting RENAME COLUMN "syncLeaseToken" TO sync_lease_token;
  ALTER TABLE system.integration_setting RENAME COLUMN "syncLeaseUntil" TO sync_lease_until;
  ALTER TABLE system.integration_setting RENAME COLUMN "healthStatus" TO health_status;
  ALTER TABLE system.integration_setting RENAME COLUMN "lastCheckedAt" TO last_checked_at;
  ALTER TABLE system.integration_setting RENAME COLUMN "lastError" TO last_error;
  ALTER TABLE system.integration_setting RENAME COLUMN "accountName" TO account_name;
  ALTER TABLE system.integration_setting RENAME COLUMN "lastSyncedAt" TO last_synced_at;
  ALTER TABLE system.integration_setting RENAME COLUMN "updatedAt" TO updated_at;
  ALTER TABLE system.integration_setting RENAME COLUMN "updatedById" TO updated_by;
  UPDATE system.integration_setting SET config = '{}'::jsonb WHERE config IS NULL;
  ALTER TABLE system.integration_setting
    ALTER COLUMN config SET DEFAULT '{}'::jsonb,
    ALTER COLUMN config SET NOT NULL,
    ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at SET DEFAULT now(),
    ALTER COLUMN last_checked_at TYPE timestamptz USING last_checked_at AT TIME ZONE 'UTC',
    ALTER COLUMN last_synced_at TYPE timestamptz USING last_synced_at AT TIME ZONE 'UTC',
    ALTER COLUMN sync_lease_until TYPE timestamptz USING sync_lease_until AT TIME ZONE 'UTC',
    ADD CONSTRAINT integration_setting_provider_check CHECK (length(provider) BETWEEN 1 AND 64);
  ALTER TABLE system.integration_setting RENAME CONSTRAINT "IntegrationSetting_pkey" TO integration_setting_pkey;
END $$;
