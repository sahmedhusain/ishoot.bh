-- Baseline for integration settings in the system service. Encrypted credentials are sealed under the service's key ring.
-- The Prisma migration moves existing records from public."IntegrationSetting" here, so statements are idempotent and column
-- names match what that migration produces.

-- +goose Up
CREATE TABLE IF NOT EXISTS system.integration_setting (
    provider         text        NOT NULL,
    is_active        boolean     NOT NULL DEFAULT false,
    credentials      text,
    config           jsonb       NOT NULL DEFAULT '{}'::jsonb,
    sync_lease_token text,
    sync_lease_until timestamptz,
    health_status    text        NOT NULL DEFAULT 'unknown',
    last_checked_at  timestamptz,
    last_error       text,
    account_name     text,
    last_synced_at   timestamptz,
    updated_at       timestamptz NOT NULL DEFAULT now(),
    updated_by       text,
    CONSTRAINT integration_setting_pkey PRIMARY KEY (provider),
    CONSTRAINT integration_setting_provider_check CHECK (length(provider) BETWEEN 1 AND 64)
);

-- +goose Down
DROP TABLE IF EXISTS system.integration_setting;
