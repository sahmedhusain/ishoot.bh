// Command storage-copy copies existing files into the files service's buckets (ADR 0009). It walks the file records
// (files.upload_object), so only known files are copied, each into the bucket its record says, and files already
// present are skipped: it can be re-run safely. Sources:
//
//	-from-dir <path>    the old local upload folder (<folder>/<name> under it)
//	-from-s3 <endpoint> an S3-compatible source, e.g. Supabase Storage's S3 protocol
//	                    (with -from-access-key, -from-secret-key, -from-region)
//
// The target and database come from the files service's own environment (DATABASE_URL, S3_*, FILES_*_BUCKET).
// Run: go run ./tools/storage-copy -from-dir ./legacy-uploads
package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"strings"

	"platform.local/backend/pkg/catalog"
	"platform.local/backend/pkg/config"
	"platform.local/backend/pkg/db"
	"platform.local/backend/pkg/objectstore"
	"platform.local/backend/services/files/settings"
)

type source interface {
	open(ctx context.Context, bucket, key string) (io.ReadCloser, int64, error)
}

type dirSource struct{ root string }

func (d dirSource) open(_ context.Context, _, key string) (io.ReadCloser, int64, error) {
	path := filepath.Join(d.root, filepath.FromSlash(key))
	if !strings.HasPrefix(path, filepath.Clean(d.root)+string(filepath.Separator)) {
		return nil, 0, fmt.Errorf("key %q escapes the source folder", key)
	}
	f, err := os.Open(path) //nolint:gosec // the path is checked to stay inside the operator's source folder
	if errors.Is(err, os.ErrNotExist) {
		return nil, 0, objectstore.ErrNotFound
	}
	if err != nil {
		return nil, 0, err
	}
	info, err := f.Stat()
	if err != nil {
		_ = f.Close()
		return nil, 0, err
	}
	return f, info.Size(), nil
}

type s3Source struct{ store *objectstore.S3 }

func (s s3Source) open(ctx context.Context, bucket, key string) (io.ReadCloser, int64, error) {
	body, info, err := s.store.Get(ctx, bucket, key)
	return body, info.Size, err
}

type record struct {
	url    string
	public bool
	size   int64
	mime   string
}

func main() {
	fromDir := flag.String("from-dir", "", "old local upload folder")
	fromS3 := flag.String("from-s3", "", "S3-compatible source endpoint")
	accessKey := flag.String("from-access-key", "", "source access key")
	secretKey := flag.String("from-secret-key", "", "source secret key")
	region := flag.String("from-region", "us-east-1", "source region")
	dryRun := flag.Bool("dry-run", false, "report what would be copied without writing")
	flag.Parse()
	if (*fromDir == "") == (*fromS3 == "") {
		fmt.Fprintln(os.Stderr, "storage-copy: give exactly one of -from-dir or -from-s3")
		os.Exit(2)
	}
	var src source = dirSource{root: *fromDir}
	if *fromS3 != "" {
		src = s3Source{store: objectstore.New(objectstore.Config{
			Endpoint: *fromS3, Region: *region, AccessKeyID: *accessKey, SecretAccessKey: *secretKey, UsePathStyle: true,
		})}
	}
	var cfg settings.Config
	err := config.LoadFrom(&cfg, withServiceName())
	if err == nil {
		_, err = run(context.Background(), cfg, src, *dryRun, slog.New(slog.NewTextHandler(os.Stderr, nil)))
	}
	if err != nil {
		fmt.Fprintln(os.Stderr, "storage-copy:", err)
		os.Exit(1)
	}
}

// summary counts what a run did.
type summary struct{ copied, present, missing, failed int }

func run(ctx context.Context, cfg settings.Config, src source, dryRun bool, logger *slog.Logger) (summary, error) {
	pool, err := db.Open(ctx, cfg.Database, logger)
	if err != nil {
		return summary{}, err
	}
	defer pool.Close()
	target := objectstore.New(cfg.S3)

	rows, err := pool.Query(ctx, `SELECT file_url, is_public, file_size, mime_type FROM files.upload_object ORDER BY created_at`)
	if err != nil {
		return summary{}, err
	}
	var records []record
	for rows.Next() {
		var r record
		if err := rows.Scan(&r.url, &r.public, &r.size, &r.mime); err != nil {
			return summary{}, err
		}
		records = append(records, r)
	}
	if err := rows.Err(); err != nil {
		return summary{}, err
	}

	var copied, present, missing, failed int
	for _, r := range records {
		bucket := cfg.Files.PrivateBucket
		if r.public {
			bucket = cfg.Files.PublicBucket
		}
		key := strings.TrimPrefix(r.url, catalog.Files.URLPrefix)
		if info, err := target.Head(ctx, bucket, key); err == nil {
			if info.Size != r.size {
				failed++
				logger.Error("destination size differs from the record", "file", r.url, "record", r.size, "destination", info.Size)
				continue
			}
			present++
			continue
		} else if !errors.Is(err, objectstore.ErrNotFound) {
			failed++
			logger.Error("checking the destination failed", "file", r.url, "error", err)
			continue
		}
		body, size, err := src.open(ctx, bucket, key)
		if errors.Is(err, objectstore.ErrNotFound) {
			missing++
			logger.Warn("not in the source", "file", r.url)
			continue
		}
		if err != nil {
			failed++
			logger.Error("reading the source failed", "file", r.url, "error", err)
			continue
		}
		if size != r.size {
			_ = body.Close()
			failed++
			logger.Error("size differs from the record", "file", r.url, "record", r.size, "source", size)
			continue
		}
		if !dryRun {
			err = target.Put(ctx, bucket, key, body, size, r.mime)
		}
		_ = body.Close()
		if err != nil {
			failed++
			logger.Error("writing failed", "file", r.url, "error", err)
			continue
		}
		copied++
	}
	logger.Info("done", "records", len(records), "copied", copied, "alreadyPresent", present, "missingInSource", missing, "failed", failed, "dryRun", dryRun)
	result := summary{copied: copied, present: present, missing: missing, failed: failed}
	if failed > 0 {
		return result, fmt.Errorf("%d file(s) could not be copied", failed)
	}
	return result, nil
}

// withServiceName reads the process environment, filling SERVICE_NAME so the files service's settings validate.
func withServiceName() map[string]string {
	env := map[string]string{}
	for _, kv := range os.Environ() {
		if k, v, ok := strings.Cut(kv, "="); ok {
			env[k] = v
		}
	}
	if env["SERVICE_NAME"] == "" {
		env["SERVICE_NAME"] = "storage-copy"
	}
	return env
}
