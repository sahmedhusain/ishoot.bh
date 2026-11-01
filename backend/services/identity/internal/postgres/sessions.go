// Package postgres persists identity state with generated sqlc queries.
package postgres

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/db"
	"platform.local/backend/services/identity/internal/postgres/sqlcdb"
	"platform.local/backend/services/identity/internal/sessions"
)

type Repository struct {
	pool *pgxpool.Pool
	q    *sqlcdb.Queries
}

func New(pool *pgxpool.Pool) *Repository { return &Repository{pool: pool, q: sqlcdb.New(pool)} }

func (p *Repository) Create(ctx context.Context, f sessions.Family, tokenHash string) error {
	return db.WithTx(ctx, p.pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		q := p.q.WithTx(tx)
		if err := q.CreateSessionFamily(ctx, sqlcdb.CreateSessionFamilyParams{ID: f.ID, SubjectID: f.SubjectID, Realm: string(f.Realm), ExpiresAt: f.ExpiresAt}); err != nil {
			return err
		}
		return q.InsertRefreshRecord(ctx, sqlcdb.InsertRefreshRecordParams{TokenHash: tokenHash, FamilyID: f.ID})
	})
}

func (p *Repository) Rotate(ctx context.Context, realm authn.Realm, oldHash, nextHash string, now time.Time) (sessions.Family, error) {
	var family sessions.Family
	var result error
	err := db.WithTx(ctx, p.pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		q := p.q.WithTx(tx)
		// Read consumed_at only after locking the family: a concurrent waiter must see the committed consumption.
		id, err := q.FindRefreshFamily(ctx, sqlcdb.FindRefreshFamilyParams{TokenHash: oldHash, Realm: string(realm)})
		if errors.Is(err, pgx.ErrNoRows) {
			result = sessions.ErrInvalid
			return nil
		}
		if err != nil {
			return err
		}
		row, err := q.LockSessionFamily(ctx, id)
		if errors.Is(err, pgx.ErrNoRows) {
			result = sessions.ErrInvalid
			return nil
		}
		if err != nil {
			return err
		}
		if row.RevokedAt != nil || !row.ExpiresAt.After(now) {
			result = sessions.ErrInvalid
			return nil
		}
		consumed, err := q.RefreshConsumedAt(ctx, oldHash)
		if err != nil {
			return err
		}
		if consumed != nil {
			result = sessions.ErrReuse
			// Returning nil here commits revocation. ErrReuse is returned only after the commit succeeds.
			return q.RevokeSessionFamily(ctx, sqlcdb.RevokeSessionFamilyParams{ID: id, RevokedAt: &now})
		}
		if err := q.MarkRefreshConsumed(ctx, sqlcdb.MarkRefreshConsumedParams{TokenHash: oldHash, ConsumedAt: &now}); err != nil {
			return err
		}
		if err := q.InsertRefreshRecord(ctx, sqlcdb.InsertRefreshRecordParams{TokenHash: nextHash, FamilyID: id}); err != nil {
			return err
		}
		family = toFamily(row)
		return nil
	})
	if err != nil {
		return sessions.Family{}, err
	}
	if result != nil {
		return sessions.Family{}, result
	}
	return family, nil
}

func (p *Repository) Revoke(ctx context.Context, realm authn.Realm, tokenHash string, now time.Time) error {
	return p.q.LogoutSessionFamily(ctx, sqlcdb.LogoutSessionFamilyParams{Realm: string(realm), TokenHash: tokenHash, RevokedAt: &now})
}

func (p *Repository) Active(ctx context.Context, realm authn.Realm, id string, now time.Time) (sessions.Family, error) {
	row, err := p.q.ActiveSessionFamily(ctx, sqlcdb.ActiveSessionFamilyParams{ID: id, Realm: string(realm), ExpiresAt: now})
	if errors.Is(err, pgx.ErrNoRows) {
		return sessions.Family{}, sessions.ErrInvalid
	}
	return toFamily(row), err
}

func toFamily(row sqlcdb.IdentitySessionFamily) sessions.Family {
	return sessions.Family{ID: row.ID, SubjectID: row.SubjectID, Realm: authn.Realm(row.Realm), ExpiresAt: row.ExpiresAt.UTC()}
}

// DeleteExpired removes only families whose absolute expiry has passed. Cascading deletes remove their token history.
func (p *Repository) DeleteExpired(ctx context.Context, now time.Time) (int64, error) {
	return p.q.DeleteExpiredSessionFamilies(ctx, now)
}
