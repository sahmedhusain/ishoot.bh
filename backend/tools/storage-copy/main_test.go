package main

import (
	"context"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"platform.local/backend/pkg/db"
	"platform.local/backend/pkg/migrate"
	"platform.local/backend/pkg/objectstore"
	"platform.local/backend/pkg/testkit"
	"platform.local/backend/services/files/migrations"
	"platform.local/backend/services/files/settings"
)

func TestCopiesKnownFilesFromAFolder(t *testing.T) {
	ctx := context.Background()
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	s3 := testkit.S3(t)
	var cfg settings.Config
	cfg.Database = db.Config{URL: testkit.Postgres(t), MaxConns: 2, MaxConnLifetime: time.Minute, MaxConnIdleTime: time.Minute,
		HealthCheckPeriod: time.Minute, StatementTimeout: 10 * time.Second}
	cfg.S3 = objectstore.Config{Endpoint: s3.Endpoint, Region: "us-east-1", AccessKeyID: s3.AccessKeyID,
		SecretAccessKey: s3.SecretAccessKey, UsePathStyle: true, Timeout: 10 * time.Second}
	cfg.Files.PublicBucket, cfg.Files.PrivateBucket = "public-assets", "private-assets"

	pool, err := db.Open(ctx, cfg.Database, logger)
	require.NoError(t, err)
	defer pool.Close()
	require.NoError(t, migrate.Run(ctx, pool, migrate.Options{Schema: "files", Migrations: migrations.FS, Logger: logger}))
	target := objectstore.New(cfg.S3)
	require.NoError(t, target.EnsureBucket(ctx, "public-assets"))
	require.NoError(t, target.EnsureBucket(ctx, "private-assets"))

	dir := t.TempDir()
	write := func(key, body string) {
		require.NoError(t, os.MkdirAll(filepath.Join(dir, filepath.Dir(key)), 0o750))
		require.NoError(t, os.WriteFile(filepath.Join(dir, key), []byte(body), 0o600))
	}
	write("brand/logo.png", "\x89PNG\r\n\x1a\nlogo")
	write("vault/contract.pdf", "%PDF-1.7 contract")
	write("vault/wrong-size.pdf", "%PDF-1.7")
	insert := func(url string, public bool, size int, mime string) {
		_, err := pool.Exec(ctx, `INSERT INTO files.upload_object (id, file_url, file_name, file_size, mime_type, is_public, claimed_at, expires_at)
			VALUES (gen_random_uuid()::text, $1, 'f', $2, $3, $4, now(), now())`, url, size, mime, public)
		require.NoError(t, err)
	}
	insert("/api/files/brand/logo.png", true, 12, "image/png")
	insert("/api/files/vault/contract.pdf", false, 17, "application/pdf")
	insert("/api/files/vault/missing.pdf", false, 10, "application/pdf")
	insert("/api/files/vault/wrong-size.pdf", false, 99, "application/pdf")

	result, err := run(ctx, cfg, dirSource{root: dir}, false, logger)
	assert.Error(t, err, "the size mismatch is reported")
	assert.Equal(t, summary{copied: 2, missing: 1, failed: 1}, result)
	_, err = target.Head(ctx, "public-assets", "brand/logo.png")
	assert.NoError(t, err, "public files go to the public bucket")
	_, err = target.Head(ctx, "private-assets", "vault/contract.pdf")
	assert.NoError(t, err)

	_, err = pool.Exec(ctx, `DELETE FROM files.upload_object WHERE file_url = '/api/files/vault/wrong-size.pdf'`)
	require.NoError(t, err)
	result, err = run(ctx, cfg, dirSource{root: dir}, false, logger)
	require.NoError(t, err)
	assert.Equal(t, summary{present: 2, missing: 1}, result, "a second run skips what is already there")

	require.NoError(t, target.Put(ctx, "public-assets", "brand/logo.png", strings.NewReader("bad"), 3, "image/png"))
	result, err = run(ctx, cfg, dirSource{root: dir}, false, logger)
	require.Error(t, err, "a corrupt destination must not be reported as successfully copied")
	assert.Equal(t, summary{present: 1, missing: 1, failed: 1}, result)
}
