// Package postgres stores file records in the files schema.
package postgres

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"platform.local/backend/pkg/db"
	"platform.local/backend/services/files/internal/domain"
	"platform.local/backend/services/files/internal/postgres/sqlcdb"
)

// Repository implements app.Repository on PostgreSQL.
type Repository struct {
	pool *pgxpool.Pool
	q    *sqlcdb.Queries
}

// New returns a repository using pool.
func New(pool *pgxpool.Pool) *Repository { return &Repository{pool: pool, q: sqlcdb.New(pool)} }

// Insert adds a record; ErrExists when the address is taken.
func (r *Repository) Insert(ctx context.Context, f domain.File) (domain.File, error) {
	row, err := r.q.InsertFile(ctx, sqlcdb.InsertFileParams{
		ID: f.ID, FileUrl: f.URL, OwnerID: optional(f.OwnerID), FileName: f.FileName, FileSize: f.Size,
		MimeType: f.MIMEType, IsPublic: f.Public, ClaimedAt: f.ClaimedAt, ExpiresAt: f.ExpiresAt,
	})
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.File{}, domain.ErrExists
	}
	if err != nil {
		return domain.File{}, err
	}
	return toDomain(row), nil
}

// Get returns a record by address.
func (r *Repository) Get(ctx context.Context, url string) (domain.File, error) {
	row, err := r.q.GetFile(ctx, url)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.File{}, domain.ErrNotFound
	}
	if err != nil {
		return domain.File{}, err
	}
	return toDomain(row), nil
}

// List returns the records of the given addresses that exist.
func (r *Repository) List(ctx context.Context, urls []string) ([]domain.File, error) {
	rows, err := r.q.ListFiles(ctx, urls)
	if err != nil {
		return nil, err
	}
	out := make([]domain.File, len(rows))
	for i, row := range rows {
		out[i] = toDomain(row)
	}
	return out, nil
}

// Claim marks an upload claimed if it is still the owner's, unclaimed and unexpired.
func (r *Repository) Claim(ctx context.Context, url, owner string, now time.Time) (domain.File, error) {
	row, err := r.q.ClaimFile(ctx, sqlcdb.ClaimFileParams{Now: &now, FileUrl: url, OwnerID: &owner})
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.File{}, domain.ErrUnavailable
	}
	if err != nil {
		return domain.File{}, err
	}
	return toDomain(row), nil
}

// Delete removes a record and reports whether it existed.
func (r *Repository) Delete(ctx context.Context, url string) (bool, error) {
	n, err := r.q.DeleteFile(ctx, url)
	return n > 0, err
}

// WithExpired locks up to limit expired, unclaimed uploads, calls fn with them and, if fn succeeds, deletes their
// records in the same transaction. Concurrent workers skip rows another worker holds.
func (r *Repository) WithExpired(ctx context.Context, now time.Time, limit int32, fn func([]domain.File) error) (int, error) {
	count := 0
	err := db.WithTx(ctx, r.pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		q := r.q.WithTx(tx)
		rows, err := q.LockExpiredUploads(ctx, sqlcdb.LockExpiredUploadsParams{Now: now, BatchSize: limit})
		if err != nil || len(rows) == 0 {
			return err
		}
		files := make([]domain.File, len(rows))
		ids := make([]string, len(rows))
		for i, row := range rows {
			files[i], ids[i] = toDomain(row), row.ID
		}
		if err := fn(files); err != nil {
			return err
		}
		count = len(rows)
		return q.DeleteFilesByID(ctx, ids)
	})
	return count, err
}

// WithOrphanedPrivate locks up to limit claimed files that haven't been accessed for the given duration, calls fn
// with them and, if fn succeeds, deletes their records in the same transaction.
func (r *Repository) WithOrphanedPrivate(ctx context.Context, olderThan time.Time, limit int32, fn func([]domain.File) error) (int, error) {
	count := 0
	err := db.WithTx(ctx, r.pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		q := r.q.WithTx(tx)
		rows, err := q.LockOrphanedPrivateUploads(ctx, sqlcdb.LockOrphanedPrivateUploadsParams{OlderThan: olderThan, BatchSize: limit})
		if err != nil || len(rows) == 0 {
			return err
		}
		files := make([]domain.File, len(rows))
		ids := make([]string, len(rows))
		for i, row := range rows {
			files[i], ids[i] = toDomain(row), row.ID
		}
		if err := fn(files); err != nil {
			return err
		}
		count = len(rows)
		return q.DeleteFilesByID(ctx, ids)
	})
	return count, err
}

func toDomain(row sqlcdb.FilesUploadObject) domain.File {
	f := domain.File{
		ID: row.ID, URL: row.FileUrl, FileName: row.FileName, Size: row.FileSize, MIMEType: row.MimeType,
		Public: row.IsPublic, ClaimedAt: row.ClaimedAt, ExpiresAt: row.ExpiresAt, CreatedAt: row.CreatedAt,
	}
	if row.OwnerID != nil {
		f.OwnerID = *row.OwnerID
	}
	return f
}

func optional(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
