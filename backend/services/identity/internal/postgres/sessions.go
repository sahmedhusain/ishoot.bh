package postgres
import (
	"context"
	"errors"
	"time"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/db"
	"platform.local/backend/pkg/outbox"
	"platform.local/backend/services/identity/internal/accounts"
	"platform.local/backend/services/identity/internal/postgres/sqlcdb"
	"platform.local/backend/services/identity/internal/sessions"
)
const Schema = "identity"
type Repository struct {
	pool	*pgxpool.Pool
	q	*sqlcdb.Queries
}
func New(pool *pgxpool.Pool) *Repository	{ return &Repository{pool: pool, q: sqlcdb.New(pool)} }
func (p *Repository) Create(ctx context.Context, f sessions.Family, tokenHash string) error {
	return db.WithTx(ctx, p.pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		q := p.q.WithTx(tx)
		if err := q.CreateSessionFamily(ctx, sqlcdb.CreateSessionFamilyParams{ID: f.ID, SubjectID: f.SubjectID, Realm: string(f.Realm), ExpiresAt: f.ExpiresAt}); err != nil {
			return err
		}
		if err := q.InsertRefreshRecord(ctx, sqlcdb.InsertRefreshRecordParams{TokenHash: tokenHash, FamilyID: f.ID}); err != nil {
			return err
		}
		return sessionEvent(ctx, tx, "started", f, "login")
	})
}
func (p *Repository) Rotate(ctx context.Context, realm authn.Realm, oldHash, nextHash string, now time.Time) (sessions.Family, error) {
	family, _, err := p.rotate(ctx, realm, oldHash, nextHash, now, false)
	return family, err
}
func (p *Repository) RotateAccount(ctx context.Context, realm authn.Realm, oldHash, nextHash string, now time.Time) (sessions.Family, accounts.Account, error) {
	return p.rotate(ctx, realm, oldHash, nextHash, now, true)
}
func (p *Repository) rotate(ctx context.Context, realm authn.Realm, oldHash, nextHash string, now time.Time, checkAccount bool) (sessions.Family, accounts.Account, error) {
	var family sessions.Family
	var account accounts.Account
	var result error
	err := db.WithTx(ctx, p.pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		q := p.q.WithTx(tx)
		id, err := q.FindRefreshFamily(ctx, sqlcdb.FindRefreshFamilyParams{TokenHash: oldHash, Realm: string(realm)})
		if errors.Is(err, pgx.ErrNoRows) {
			result = sessions.ErrInvalid
			return nil
		}
		if err != nil {
			return err
		}
		var accountInvalid bool
		if checkAccount {
			initial, err := q.ReadSessionFamily(ctx, id)
			if errors.Is(err, pgx.ErrNoRows) {
				result = sessions.ErrInvalid
				return nil
			}
			if err != nil {
				return err
			}
			row, err := q.LockAccount(ctx, sqlcdb.LockAccountParams{Realm: string(realm), SubjectID: initial.SubjectID})
			switch {
			case errors.Is(err, pgx.ErrNoRows):
				accountInvalid = true
			case err != nil:
				return err
			default:
				account = toAccount(row)
				accountInvalid = !row.Active
			}
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
		if checkAccount && (accountInvalid || row.SubjectID != account.SubjectID || row.Realm != string(realm)) {
			result = sessions.ErrInvalid
			if err := q.RevokeSessionFamily(ctx, sqlcdb.RevokeSessionFamilyParams{ID: id, RevokedAt: &now}); err != nil {
				return err
			}
			return sessionEvent(ctx, tx, "revoked", toFamily(row), "account_invalid")
		}
		consumed, err := q.RefreshConsumedAt(ctx, oldHash)
		if err != nil {
			return err
		}
		if consumed != nil {
			result = sessions.ErrReuse
			if err := q.RevokeSessionFamily(ctx, sqlcdb.RevokeSessionFamilyParams{ID: id, RevokedAt: &now}); err != nil {
				return err
			}
			return sessionEvent(ctx, tx, "revoked", toFamily(row), "refresh_reuse")
		}
		if err := q.MarkRefreshConsumed(ctx, sqlcdb.MarkRefreshConsumedParams{TokenHash: oldHash, ConsumedAt: &now}); err != nil {
			return err
		}
		if err := q.InsertRefreshRecord(ctx, sqlcdb.InsertRefreshRecordParams{TokenHash: nextHash, FamilyID: id}); err != nil {
			return err
		}
		family = toFamily(row)
		return sessionEvent(ctx, tx, "rotated", family, "refresh")
	})
	if err != nil {
		return sessions.Family{}, accounts.Account{}, err
	}
	if result != nil {
		return sessions.Family{}, accounts.Account{}, result
	}
	return family, account, nil
}
func (p *Repository) Revoke(ctx context.Context, realm authn.Realm, tokenHash string, now time.Time) error {
	return db.WithTx(ctx, p.pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		q := p.q.WithTx(tx)
		id, err := q.FindRefreshFamily(ctx, sqlcdb.FindRefreshFamilyParams{Realm: string(realm), TokenHash: tokenHash})
		if errors.Is(err, pgx.ErrNoRows) {
			return nil
		}
		if err != nil {
			return err
		}
		row, err := q.LockSessionFamily(ctx, id)
		if errors.Is(err, pgx.ErrNoRows) {
			return nil
		}
		if err != nil {
			return err
		}
		if row.RevokedAt != nil {
			return nil
		}
		if err := q.RevokeSessionFamily(ctx, sqlcdb.RevokeSessionFamilyParams{ID: id, RevokedAt: &now}); err != nil {
			return err
		}
		return sessionEvent(ctx, tx, "revoked", toFamily(row), "logout")
	})
}
func sessionEvent(ctx context.Context, tx pgx.Tx, verb string, f sessions.Family, reason string) error {
	return outbox.Enqueue(ctx, tx, "identity", outbox.Event{Subject: "identity.session." + verb, Payload: map[string]any{
		"subjectId":	f.SubjectID, "realm": f.Realm, "sessionId": f.ID, "changedBy": string(f.Realm) + ":" + f.SubjectID, "reason": reason,
	}})
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
func (p *Repository) DeleteExpired(ctx context.Context, now time.Time, batch int32) (int64, error) {
	if batch <= 0 {
		return 0, errors.New("cleanup batch must be positive")
	}
	return p.q.DeleteExpiredSessionFamilies(ctx, sqlcdb.DeleteExpiredSessionFamiliesParams{Cutoff: now, BatchSize: batch})
}
