package migrations_test

import (
	"context"
	"log/slog"
	"os"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"

	"platform.local/backend/pkg/migrate"
	"platform.local/backend/pkg/testkit"
	"platform.local/backend/services/system/migrations"
)

// The Prisma migration hands "FeatureToggle" to the system service whether or not the service has run yet.
func TestPrismaHandoff(t *testing.T) {
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, testkit.Postgres(t))
	require.NoError(t, err)
	defer pool.Close()
	sql, err := os.ReadFile("../../../../packages/database/prisma/migrations/20261102090000_move_modules_to_system_service/migration.sql")
	require.NoError(t, err)
	run := func() error {
		return migrate.Run(ctx, pool, migrate.Options{Logger: slog.Default(), Schema: "system", Migrations: migrations.FS})
	}
	for _, mode := range []string{"move", "copy"} {
		t.Run(mode, func(t *testing.T) {
			_, err := pool.Exec(ctx, `DROP SCHEMA IF EXISTS system CASCADE;
    DROP TABLE IF EXISTS public."FeatureToggle";
    CREATE TABLE public."FeatureToggle" (
     id text NOT NULL, "moduleKey" text NOT NULL, "isEnabled" boolean NOT NULL DEFAULT true,
     "nameEn" text NOT NULL, "nameAr" text NOT NULL, description text,
     CONSTRAINT "FeatureToggle_pkey" PRIMARY KEY (id));
    CREATE UNIQUE INDEX "FeatureToggle_moduleKey_key" ON public."FeatureToggle" ("moduleKey");
    INSERT INTO public."FeatureToggle" VALUES ('a', 'store', true, 'Store', 'المتجر', NULL), ('b', 'cms', false, 'CMS', 'المحتوى', NULL);`)
			require.NoError(t, err)
			if mode == "copy" {
				require.NoError(t, run())
				_, err = pool.Exec(ctx, `INSERT INTO system.module_setting (module_key, enabled, updated_by) VALUES ('cms', true, 'it:someone')`)
				require.NoError(t, err)
			}
			_, err = pool.Exec(ctx, string(sql))
			require.NoError(t, err)
			require.NoError(t, run())
			_, err = pool.Exec(ctx, string(sql))
			require.NoError(t, err, "re-running the completed handoff is safe")

			var legacy *string
			require.NoError(t, pool.QueryRow(ctx, `SELECT to_regclass('public."FeatureToggle"')::text`).Scan(&legacy))
			require.Nil(t, legacy, "the legacy table is gone")
			states := map[string]bool{}
			rows, err := pool.Query(ctx, `SELECT module_key, enabled FROM system.module_setting`)
			require.NoError(t, err)
			for rows.Next() {
				var key string
				var on bool
				require.NoError(t, rows.Scan(&key, &on))
				states[key] = on
			}
			require.True(t, states["store"])
			require.Equal(t, mode == "copy", states["cms"], "a choice the service already has wins over the legacy one")
		})
	}
}

// The Prisma migration hands "IntegrationSetting" to the system service whether or not the service has run yet.
func TestIntegrationsHandoff(t *testing.T) {
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, testkit.Postgres(t))
	require.NoError(t, err)
	defer pool.Close()
	sql, err := os.ReadFile("../../../../packages/database/prisma/migrations/20261102120000_move_integrations_to_system_service/migration.sql")
	require.NoError(t, err)
	run := func() error {
		return migrate.Run(ctx, pool, migrate.Options{Logger: slog.Default(), Schema: "system", Migrations: migrations.FS})
	}
	for _, mode := range []string{"move", "copy"} {
		t.Run(mode, func(t *testing.T) {
			_, err := pool.Exec(ctx, `DROP SCHEMA IF EXISTS system CASCADE;
    DROP TABLE IF EXISTS public."IntegrationSetting";
    CREATE TABLE public."IntegrationSetting" (
     provider text NOT NULL, "isActive" boolean NOT NULL DEFAULT false,
     credentials text, config jsonb, "syncLeaseToken" text, "syncLeaseUntil" timestamp(3),
     "healthStatus" text NOT NULL DEFAULT 'unknown', "lastCheckedAt" timestamp(3),
     "lastError" text, "accountName" text, "lastSyncedAt" timestamp(3),
     "updatedAt" timestamp(3) NOT NULL DEFAULT now(), "updatedById" text,
     CONSTRAINT "IntegrationSetting_pkey" PRIMARY KEY (provider));
    INSERT INTO public."IntegrationSetting" (provider, "isActive", credentials, config)
    VALUES ('stripe', true, 'encrypted-stripe', '{"test":true}'::jsonb),
           ('meta', false, 'encrypted-meta', NULL);`)
			require.NoError(t, err)
			if mode == "copy" {
				require.NoError(t, run())
				_, err = pool.Exec(ctx, `INSERT INTO system.integration_setting (provider, is_active, credentials, updated_by) VALUES ('meta', true, 'new-meta', 'it:admin')`)
				require.NoError(t, err)
			}
			_, err = pool.Exec(ctx, string(sql))
			require.NoError(t, err)
			require.NoError(t, run())
			_, err = pool.Exec(ctx, string(sql))
			require.NoError(t, err, "re-running the completed handoff is safe")

			var legacy *string
			require.NoError(t, pool.QueryRow(ctx, `SELECT to_regclass('public."IntegrationSetting"')::text`).Scan(&legacy))
			require.Nil(t, legacy, "the legacy table is gone")

			var stripeActive bool
			var stripeCreds string
			require.NoError(t, pool.QueryRow(ctx, `SELECT is_active, credentials FROM system.integration_setting WHERE provider = 'stripe'`).Scan(&stripeActive, &stripeCreds))
			require.True(t, stripeActive)
			require.Equal(t, "encrypted-stripe", stripeCreds)

			var metaActive bool
			var metaCreds string
			require.NoError(t, pool.QueryRow(ctx, `SELECT is_active, credentials FROM system.integration_setting WHERE provider = 'meta'`).Scan(&metaActive, &metaCreds))
			if mode == "copy" {
				require.True(t, metaActive)
				require.Equal(t, "new-meta", metaCreds)
			} else {
				require.False(t, metaActive)
				require.Equal(t, "encrypted-meta", metaCreds)
			}
		})
	}
}
