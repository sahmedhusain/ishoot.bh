-- name: ListIntegrations :many
SELECT * FROM system.integration_setting ORDER BY provider;

-- name: GetIntegration :one
SELECT * FROM system.integration_setting WHERE provider = @provider;

-- name: UpsertIntegration :exec
INSERT INTO system.integration_setting (
    provider, is_active, credentials, config, health_status, last_error, account_name, updated_by, updated_at
) VALUES (
    @provider, @is_active, @credentials, @config, @health_status, @last_error, @account_name, @updated_by, @updated_at
) ON CONFLICT (provider) DO UPDATE SET
    is_active = EXCLUDED.is_active,
    credentials = COALESCE(EXCLUDED.credentials, system.integration_setting.credentials),
    config = EXCLUDED.config,
    health_status = EXCLUDED.health_status,
    last_error = EXCLUDED.last_error,
    account_name = EXCLUDED.account_name,
    updated_by = EXCLUDED.updated_by,
    updated_at = EXCLUDED.updated_at;

-- name: UnlinkIntegration :exec
INSERT INTO system.integration_setting (
    provider, is_active, credentials, config, health_status, last_error, account_name, last_synced_at, sync_lease_token, sync_lease_until, updated_by, updated_at
) VALUES (
    @provider, false, NULL, '{}'::jsonb, 'unknown', NULL, NULL, NULL, NULL, NULL, @updated_by, @updated_at
) ON CONFLICT (provider) DO UPDATE SET
    is_active = false,
    credentials = NULL,
    config = '{}'::jsonb,
    health_status = 'unknown',
    last_error = NULL,
    account_name = NULL,
    last_synced_at = NULL,
    sync_lease_token = NULL,
    sync_lease_until = NULL,
    updated_by = EXCLUDED.updated_by,
    updated_at = EXCLUDED.updated_at;

-- name: UpdateIntegrationStatus :exec
UPDATE system.integration_setting
SET health_status = @health_status,
    last_error = @last_error,
    account_name = @account_name,
    last_checked_at = @last_checked_at,
    last_synced_at = @last_synced_at,
    config = COALESCE(@config, system.integration_setting.config),
    credentials = COALESCE(@credentials, system.integration_setting.credentials),
    sync_lease_token = @sync_lease_token,
    sync_lease_until = @sync_lease_until,
    updated_at = @updated_at
WHERE provider = @provider;

-- name: ClaimSyncLease :execrows
UPDATE system.integration_setting
SET sync_lease_token = @sync_lease_token,
    sync_lease_until = @sync_lease_until
WHERE provider = @provider
  AND is_active = true
  AND (sync_lease_until IS NULL OR sync_lease_until <= @now);
