package app
import (
	"context"
	"time"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/db"
	"platform.local/backend/pkg/outbox"
	"platform.local/backend/services/identity/internal/accounts"
	"platform.local/backend/services/identity/internal/postgres/sqlcdb"
)
type SelfService struct {
	pool		*pgxpool.Pool
	login		*accounts.Service
	minPassword	int
}
func NewSelfService(pool *pgxpool.Pool, login *accounts.Service, minPassword int) *SelfService {
	return &SelfService{pool: pool, login: login, minPassword: minPassword}
}
type OwnSession struct {
	ID		string		`json:"id"`
	CreatedAt	time.Time	`json:"createdAt"`
	ExpiresAt	time.Time	`json:"expiresAt"`
	UserAgent	*string		`json:"userAgent"`
	ClientIP	*string		`json:"clientIp"`
	Current		bool		`json:"current"`
}
func (s *SelfService) withSession(ctx context.Context, p authn.Principal, use func(pgx.Tx, time.Time) error) error {
	if p.Realm != authn.RealmStaff && p.Realm != authn.RealmCustomer {
		return accounts.ErrForbidden
	}
	return db.WithTx(ctx, s.pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		q := sqlcdb.New(tx)
		now := time.Now().UTC()
		if err := accounts.CheckUserSession(ctx, q, p, now); err != nil {
			return err
		}
		return use(tx, time.Now().UTC())
	})
}
type AccountSecurity struct {
	Email			string	`json:"email"`
	MFAEnabled		bool	`json:"mfaEnabled"`
	RecoveryCodesLeft	int64	`json:"recoveryCodesLeft"`
	HasPassword		bool	`json:"hasPassword"`
	Google			bool	`json:"google"`
	Apple			bool	`json:"apple"`
}
func (s *SelfService) Security(ctx context.Context, p authn.Principal) (AccountSecurity, error) {
	var result AccountSecurity
	err := s.withSession(ctx, p, func(tx pgx.Tx, _ time.Time) error {
		q := sqlcdb.New(tx)
		row, err := q.OwnAccountSecurity(ctx, sqlcdb.OwnAccountSecurityParams{Realm: string(p.Realm), SubjectID: p.Subject})
		result = AccountSecurity{Email: row.Email, MFAEnabled: row.MfaEnabled, RecoveryCodesLeft: row.RecoveryCodesLeft, HasPassword: row.HasPassword, Google: row.Google, Apple: row.Apple}
		return err
	})
	return result, err
}
func (s *SelfService) Sessions(ctx context.Context, p authn.Principal) ([]OwnSession, error) {
	out := []OwnSession{}
	err := s.withSession(ctx, p, func(tx pgx.Tx, now time.Time) error {
		q := sqlcdb.New(tx)
		rows, err := q.ListOwnSessions(ctx, sqlcdb.ListOwnSessionsParams{Realm: string(p.Realm), SubjectID: p.Subject, Now: now})
		for _, r := range rows {
			out = append(out, OwnSession{ID: r.ID, CreatedAt: r.CreatedAt, ExpiresAt: r.ExpiresAt, UserAgent: r.UserAgent, ClientIP: r.ClientIp, Current: r.ID == p.SessionID})
		}
		return err
	})
	return out, err
}
func (s *SelfService) Revoke(ctx context.Context, p authn.Principal, id string) error {
	if _, err := uuid.Parse(id); err != nil {
		return ErrNotFound
	}
	return s.withSession(ctx, p, func(tx pgx.Tx, now time.Time) error {
		q := sqlcdb.New(tx)
		n, err := q.RevokeOwnSession(ctx, sqlcdb.RevokeOwnSessionParams{ID: id, Realm: string(p.Realm), SubjectID: p.Subject, Now: &now})
		if err != nil {
			return err
		}
		if n == 0 {
			return ErrNotFound
		}
		return outbox.Enqueue(ctx, tx, "identity", outbox.Event{Subject: "identity.session.revoked", Payload: map[string]any{
			"subjectId":	p.Subject, "realm": p.Realm, "changedBy": string(p.Realm) + ":" + p.Subject, "sessionId": id, "reason": "owner",
		}})
	})
}
func (s *SelfService) RevokeOthers(ctx context.Context, p authn.Principal) error {
	return s.withSession(ctx, p, func(tx pgx.Tx, now time.Time) error {
		q := sqlcdb.New(tx)
		ids, err := q.RevokeOwnOtherSessions(ctx, sqlcdb.RevokeOwnOtherSessionsParams{Realm: string(p.Realm), SubjectID: p.Subject, KeepID: p.SessionID, Now: &now})
		if err != nil {
			return err
		}
		for _, id := range ids {
			if err := outbox.Enqueue(ctx, tx, "identity", outbox.Event{Subject: "identity.session.revoked", Payload: map[string]any{
				"subjectId":	p.Subject, "realm": p.Realm, "changedBy": string(p.Realm) + ":" + p.Subject, "sessionId": id, "reason": "owner",
			}}); err != nil {
				return err
			}
		}
		return nil
	})
}
func (s *SelfService) ChangePassword(ctx context.Context, p authn.Principal, current, next, code, ip string) error {
	if p.Realm != authn.RealmStaff && p.Realm != authn.RealmCustomer {
		return accounts.ErrForbidden
	}
	minimum := s.minPassword
	if p.Realm == authn.RealmCustomer {
		minimum = 8
	}
	return s.login.ChangePassword(ctx, p, current, next, code, ip, minimum, time.Now().UTC())
}
func (s *SelfService) DeleteCustomer(ctx context.Context, p authn.Principal) error {
	if p.Realm != authn.RealmCustomer {
		return accounts.ErrForbidden
	}
	return s.withSession(ctx, p, func(tx pgx.Tx, _ time.Time) error {
		if err := sqlcdb.New(tx).DeleteOwnCustomerAccount(ctx, p.Subject); err != nil {
			return err
		}
		return outbox.Enqueue(ctx, tx, "identity", outbox.Event{Subject: "identity.user.deleted", Payload: map[string]any{"subjectId": p.Subject, "realm": "customer", "changedBy": "customer:" + p.Subject}})
	})
}
