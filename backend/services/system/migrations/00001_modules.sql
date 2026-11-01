-- Baseline for the system service: which optional modules are on. Names and defaults come from the catalogue
-- (contracts/catalog/modules.json); only choices people made are stored. On existing installations the Prisma
-- migration 20261102090000_move_modules_to_system_service moves "FeatureToggle" here, so every statement is
-- idempotent and names match what that migration produces.

-- +goose Up
-- pkg/migrate creates the schema (the service's own login owns it but may not create schemas).

CREATE TABLE IF NOT EXISTS system.module_setting (
    module_key text        NOT NULL,
    enabled    boolean     NOT NULL,
    updated_by text,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT module_setting_pkey PRIMARY KEY (module_key),
    CONSTRAINT module_setting_key_check CHECK (length(module_key) BETWEEN 1 AND 64)
);

-- +goose Down
DROP TABLE IF EXISTS system.module_setting;
