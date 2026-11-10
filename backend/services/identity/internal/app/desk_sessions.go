package app
import (
	"context"
	"errors"
	"slices"
	"time"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/db"
	"platform.local/backend/pkg/outbox"
	"platform.local/backend/services/identity/internal/accounts"
	"platform.local/backend/services/identity/internal/bootstrap"
	"platform.local/backend/services/identity/internal/postgres/sqlcdb"
)
type DeskSession struct {
	ID		string		`json:"id"`
	Realm		string		`json:"realm"`
	SubjectID	string		`json:"subjectId"`
	Email		*string		`json:"email"`
	CreatedAt	time.Time	`json:"createdAt"`
	ExpiresAt	time.Time	`json:"expiresAt"`
	RevokedAt	*time.Time	`json:"revokedAt"`
}
type DeskSessionPage struct {
	Items		[]DeskSession	`json:"items"`
	NextCursor	string		`json:"nextCursor"`
}
type DeskSessions struct{ pool *pgxpool.Pool }
func NewDeskSessions(pool *pgxpool.Pool) *DeskSessions	{ return &DeskSessions{pool: pool} }
func (s *DeskSessions) List(ctx context.Context, actor authn.Principal, realm, subject, cursor string, limit int32) (DeskSessionPage, error) {
	page := DeskSessionPage{Items: []DeskSession{}}
	if (realm != "" && !slices.Contains(authn.UserRealms, authn.Realm(realm))) || len(subject) > 200 || limit < 1 || limit > 200 {
		return page, ErrValidation
	}
	after := uuid.Nil
	if cursor != "" {
		var err error
		after, err = uuid.Parse(cursor)
		if err != nil {
			return page, ErrValidation
		}
	}
	err := db.WithTx(ctx, s.pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		q := sqlcdb.New(tx)
		if err := accounts.CheckITAccess(ctx, q, actor, "sessions", "read", time.Now()); err != nil {
			return err
		}
		rows, err := q.ListDeskSessions(ctx, sqlcdb.ListDeskSessionsParams{Realm: realm, SubjectID: subject, Cursor: after.String(), RowLimit: limit + 1})
		if err != nil {
			return err
		}
		if len(rows) > int(limit) {
			rows = rows[:limit]
			page.NextCursor = rows[len(rows)-1].ID
		}
		for _, row := range rows {
			page.Items = append(page.Items, DeskSession{ID: row.ID, Realm: row.Realm, SubjectID: row.SubjectID, Email: row.Email, CreatedAt: row.CreatedAt, ExpiresAt: row.ExpiresAt, RevokedAt: row.RevokedAt})
		}
		return nil
	})
	return page, err
}
func (s *DeskSessions) Revoke(ctx context.Context, actor authn.Principal, id string) error {
	parsed, err := uuid.Parse(id)
	if err != nil {
		return ErrValidation
	}
	return db.WithTx(ctx, s.pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, "SELECT pg_advisory_xact_lock($1)", bootstrap.AccountLock); err != nil {
			return err
		}
		q := sqlcdb.New(tx)
		now := time.Now().UTC()
		if err := accounts.CheckITAccess(ctx, q, actor, "sessions", "delete", now); err != nil {
			return err
		}
		target, err := q.LockSessionFamily(ctx, parsed.String())
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		if err != nil {
			return err
		}
		if target.RevokedAt != nil {
			return nil
		}
		if err := q.RevokeSessionFamily(ctx, sqlcdb.RevokeSessionFamilyParams{ID: target.ID, RevokedAt: &now}); err != nil {
			return err
		}
		return outbox.Enqueue(ctx, tx, "identity", outbox.Event{Subject: "identity.session.revoked", Payload: map[string]any{
			"sessionId":	target.ID, "subjectId": target.SubjectID, "realm": target.Realm, "reason": "it_revocation", "changedBy": "it:" + actor.Subject,
		}})
	})
}
