package migrations_test

import (
	"context"
	"log/slog"
	"os"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"

	"platform.local/backend/pkg/migrate"
	"platform.local/backend/pkg/testkit"
	"platform.local/backend/services/files/migrations"
)

func TestPrismaHandoff(t *testing.T) {
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, testkit.Postgres(t))
	require.NoError(t, err)
	defer pool.Close()
	sql, err := os.ReadFile("../../../../packages/database/prisma/migrations/20261101120000_move_uploads_to_files_service/migration.sql")
	require.NoError(t, err)
	for _, mode := range []string{"move", "copy", "collision"} {
		t.Run(mode, func(t *testing.T) {
			_, err := pool.Exec(ctx, `DROP SCHEMA IF EXISTS files CASCADE;
    DROP TABLE IF EXISTS public."UploadObject";
    CREATE TABLE public."UploadObject" (
     id text CONSTRAINT "UploadObject_pkey" PRIMARY KEY,
     "fileUrl" text NOT NULL, "ownerId" text NOT NULL, "fileName" text NOT NULL,
     "fileSize" integer NOT NULL, "mimeType" text NOT NULL, "isPublic" boolean NOT NULL DEFAULT false,
     "claimedAt" timestamp, "expiresAt" timestamp NOT NULL, "createdAt" timestamp NOT NULL DEFAULT now());
    CREATE UNIQUE INDEX "UploadObject_fileUrl_key" ON public."UploadObject" ("fileUrl");
    CREATE INDEX "UploadObject_ownerId_expiresAt_idx" ON public."UploadObject" ("ownerId", "expiresAt");
    INSERT INTO public."UploadObject" VALUES ('legacy', '/api/files/general/test.pdf', 'owner', 'test.pdf', 4,
     'application/pdf', false, NULL, '2026-11-02 12:00:00', '2026-11-01 12:00:00');`)
			require.NoError(t, err)
			if mode != "move" {
				require.NoError(t, migrate.Run(ctx, pool, migrate.Options{Logger: slog.Default(), Schema: "files", Migrations: migrations.FS}))
			}
			if mode == "collision" {
				_, err = pool.Exec(ctx, `INSERT INTO files.upload_object (id, file_url, owner_id, file_name, file_size, mime_type, expires_at)
     VALUES ('other', '/api/files/general/test.pdf', 'other-owner', 'test.pdf', 4, 'application/pdf', now())`)
				require.NoError(t, err)
			}
			_, err = pool.Exec(ctx, string(sql))
			if mode == "collision" {
				require.ErrorContains(t, err, "conflicting file URLs")
				var count int
				require.NoError(t, pool.QueryRow(ctx, `SELECT count(*) FROM public."UploadObject"`).Scan(&count))
				require.Equal(t, 1, count, "failed handoff must preserve the source")
				return
			}
			require.NoError(t, err)
			require.NoError(t, migrate.Run(ctx, pool, migrate.Options{Logger: slog.Default(), Schema: "files", Migrations: migrations.FS, WithRiver: true}))
			_, err = pool.Exec(ctx, string(sql))
			require.NoError(t, err, "re-running the completed handoff is safe")
			var owner string
			var size int64
			var created time.Time
			require.NoError(t, pool.QueryRow(ctx, `SELECT owner_id, file_size, created_at FROM files.upload_object WHERE id='legacy'`).Scan(&owner, &size, &created))
			require.Equal(t, "owner", owner)
			require.Equal(t, int64(4), size)
			require.True(t, created.Equal(time.Date(2026, 11, 1, 12, 0, 0, 0, time.UTC)), "legacy timestamps stay UTC")
		})
	}
}
