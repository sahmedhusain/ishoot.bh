package app
import (
	"context"
	"errors"
	"slices"
	"strings"
	"time"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/db"
	"platform.local/backend/pkg/outbox"
	"platform.local/backend/services/identity/internal/accounts"
	"platform.local/backend/services/identity/internal/bootstrap"
	"platform.local/backend/services/identity/internal/postgres/sqlcdb"
)
var (
	ErrValidation	= errors.New("invalid account settings")
	ErrNotFound	= errors.New("account not found")
	ErrLastAdmin	= errors.New("the last active IT administrator must be retained")
)
type ITAccount struct {
	ID			string		`json:"id"`
	Email			string		`json:"email"`
	Roles			[]string	`json:"roles"`
	Active			bool		`json:"active"`
	MFAEnabled		bool		`json:"mfaEnabled"`
	ReportingTo		*string		`json:"reportingTo,omitempty"`
	ReportingToEmail	*string		`json:"reportingToEmail,omitempty"`
	CreatedAt		time.Time	`json:"createdAt"`
	LastLoginAt		*time.Time	`json:"lastLoginAt"`
}
type ITAccountPage struct {
	Items			[]ITAccount	`json:"items"`
	NextCursor		string		`json:"nextCursor"`
	PasswordMinLength	int		`json:"passwordMinLength"`
}
type ITAccounts struct {
	pool		*pgxpool.Pool
	hasher		bootstrap.Hasher
	sealer		bootstrap.Sealer
	defaults	bootstrap.Input
	permits		chan struct{}
}
func NewITAccounts(pool *pgxpool.Pool, hasher bootstrap.Hasher, sealer bootstrap.Sealer, defaults bootstrap.Input, maxConcurrent int) *ITAccounts {
	return &ITAccounts{pool: pool, hasher: hasher, sealer: sealer, defaults: defaults, permits: make(chan struct{}, maxConcurrent)}
}
func (s *ITAccounts) List(ctx context.Context, actor authn.Principal, cursor string, limit int32) (ITAccountPage, error) {
	page := ITAccountPage{Items: []ITAccount{}, PasswordMinLength: s.defaults.MinPasswordLength}
	if len(cursor) > 200 || limit < 1 || limit > 200 {
		return page, ErrValidation
	}
	err := db.WithTx(ctx, s.pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		q := sqlcdb.New(tx)
		if err := accounts.CheckITAccess(ctx, q, actor, "it_accounts", "read", time.Now()); err != nil {
			return err
		}
		rows, err := tx.Query(ctx, `
			SELECT a.subject_id, a.email, a.roles, a.active, a.mfa_enabled, a.reporting_to,
			       m.email AS reporting_to_email, a.created_at, a.last_login_at
			FROM identity.account a
			LEFT JOIN identity.account m ON m.realm = a.realm AND m.subject_id = a.reporting_to
			WHERE a.realm = 'it' AND a.subject_id > $1
			ORDER BY a.subject_id LIMIT $2
		`, cursor, limit+1)
		if err != nil {
			return err
		}
		defer rows.Close()
		var items []ITAccount
		for rows.Next() {
			var item ITAccount
			if err := rows.Scan(&item.ID, &item.Email, &item.Roles, &item.Active, &item.MFAEnabled,
				&item.ReportingTo, &item.ReportingToEmail, &item.CreatedAt, &item.LastLoginAt); err != nil {
				return err
			}
			items = append(items, item)
		}
		if err := rows.Err(); err != nil {
			return err
		}
		if len(items) > int(limit) {
			page.NextCursor = items[limit-1].ID
			items = items[:limit]
		}
		page.Items = items
		return nil
	})
	return page, err
}
func (s *ITAccounts) Create(ctx context.Context, actor authn.Principal, email, password, role string, reportingTo *string) (bootstrap.Result, error) {
	in := s.defaults
	in.Email, in.Password, in.Role = strings.ToLower(strings.TrimSpace(email)), password, role
	in.ReportingTo = reportingTo
	if err := in.Validate(); err != nil {
		return bootstrap.Result{}, ErrValidation
	}
	select {
	case s.permits <- struct{}{}:
		defer func() { <-s.permits }()
	case <-ctx.Done():
		return bootstrap.Result{}, ctx.Err()
	}
	return bootstrap.CreateITAccount(ctx, s.pool, s.hasher, s.sealer, in, time.Now().UTC(), actor)
}
func (s *ITAccounts) Update(ctx context.Context, actor authn.Principal, id, role string, active bool, reportingTo *string) error {
	id = strings.TrimSpace(id)
	role = strings.TrimSpace(role)
	if id == "" || len(id) > 200 || role == "" || len(role) > 100 {
		return ErrValidation
	}
	return db.WithTx(ctx, s.pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, "SELECT pg_advisory_xact_lock($1)", bootstrap.AccountLock); err != nil {
			return err
		}
		q := sqlcdb.New(tx)
		now := time.Now().UTC()
		if err := accounts.CheckITAccess(ctx, q, actor, "it_accounts", "edit", now); err != nil {
			return err
		}
		var roleCount int
		if err := tx.QueryRow(ctx, "SELECT count(*) FROM identity.it_role").Scan(&roleCount); err != nil {
			return err
		}
		if roleCount > 0 {
			var roleExists bool
			if err := tx.QueryRow(ctx, "SELECT EXISTS (SELECT 1 FROM identity.it_role WHERE id = $1)", role).Scan(&roleExists); err != nil {
				return err
			}
			if !roleExists {
				return ErrValidation
			}
		} else if !strings.HasPrefix(role, "it_") {
			return ErrValidation
		}
		target, err := q.LockAccount(ctx, sqlcdb.LockAccountParams{Realm: string(authn.RealmIT), SubjectID: id})
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		if err != nil {
			return err
		}
		roles := []string{role}
		if target.Active && target.PasswordHash != nil && slices.Contains(target.Roles, "it_admin") && (!active || role != "it_admin") {
			n, err := q.CountActiveITAdmins(ctx)
			if err != nil {
				return err
			}
			if n <= 1 {
				return ErrLastAdmin
			}
		}
		if _, err := tx.Exec(ctx, `
			UPDATE identity.account
			SET roles = $1, active = $2, reporting_to = $3, updated_at = $4
			WHERE realm = 'it' AND subject_id = $5
		`, roles, active, reportingTo, now, id); err != nil {
			return err
		}
		if err := q.RevokeSubjectSessions(ctx, sqlcdb.RevokeSubjectSessionsParams{Realm: string(authn.RealmIT), SubjectID: id, RevokedAt: &now}); err != nil {
			return err
		}
		return outbox.Enqueue(ctx, tx, "identity", outbox.Event{Subject: "identity.user.changed", Payload: map[string]any{
			"subjectId":	id, "realm": authn.RealmIT, "changedBy": "it:" + actor.Subject,
		}})
	})
}
