// Package app holds identity's account administration use cases.
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
	"platform.local/backend/pkg/catalog"
	"platform.local/backend/pkg/db"
	"platform.local/backend/pkg/outbox"
	"platform.local/backend/services/identity/internal/accounts"
	"platform.local/backend/services/identity/internal/bootstrap"
	"platform.local/backend/services/identity/internal/postgres/sqlcdb"
)

var (
	ErrValidation = errors.New("invalid account settings")
	ErrNotFound   = errors.New("account not found")
	ErrLastAdmin  = errors.New("the last active IT administrator must be retained")
)

type ITAccount struct {
	ID          string     `json:"id"`
	Email       string     `json:"email"`
	Roles       []string   `json:"roles"`
	Active      bool       `json:"active"`
	MFAEnabled  bool       `json:"mfaEnabled"`
	CreatedAt   time.Time  `json:"createdAt"`
	LastLoginAt *time.Time `json:"lastLoginAt"`
}

type ITAccountPage struct {
	Items             []ITAccount `json:"items"`
	NextCursor        string      `json:"nextCursor"`
	PasswordMinLength int         `json:"passwordMinLength"`
}

type ITAccounts struct {
	pool     *pgxpool.Pool
	hasher   bootstrap.Hasher
	sealer   bootstrap.Sealer
	defaults bootstrap.Input
	permits  chan struct{}
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
		rows, err := q.ListITAccounts(ctx, sqlcdb.ListITAccountsParams{Cursor: cursor, RowLimit: limit + 1})
		if err != nil {
			return err
		}
		if len(rows) > int(limit) {
			rows = rows[:limit]
			page.NextCursor = rows[len(rows)-1].SubjectID
		}
		for _, row := range rows {
			page.Items = append(page.Items, ITAccount{ID: row.SubjectID, Email: row.Email, Roles: row.Roles, Active: row.Active,
				MFAEnabled: row.MfaEnabled, CreatedAt: row.CreatedAt, LastLoginAt: row.LastLoginAt})
		}
		return nil
	})
	return page, err
}

func (s *ITAccounts) Create(ctx context.Context, actor authn.Principal, email, password, role string) (bootstrap.Result, error) {
	in := s.defaults
	in.Email, in.Password, in.Role = strings.ToLower(strings.TrimSpace(email)), password, role
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

func (s *ITAccounts) Update(ctx context.Context, actor authn.Principal, id, role string, active bool) error {
	if id == "" || len(id) > 200 || !slices.Contains(catalog.ITAccess.Roles, role) {
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
		target, err := q.LockAccount(ctx, sqlcdb.LockAccountParams{Realm: string(authn.RealmIT), SubjectID: id})
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		if err != nil {
			return err
		}
		roles := []string{role}
		if target.Active == active && slices.Equal(target.Roles, roles) {
			return nil
		}
		if target.Active && target.MfaEnabled && target.PasswordHash != nil && slices.Contains(target.Roles, "it_admin") && (!active || role != "it_admin") {
			n, err := q.CountActiveITAdmins(ctx)
			if err != nil {
				return err
			}
			if n <= 1 {
				return ErrLastAdmin
			}
		}
		if err := q.SetITAccountAccess(ctx, sqlcdb.SetITAccountAccessParams{SubjectID: id, Roles: roles, Active: active, Now: now}); err != nil {
			return err
		}
		if err := q.RevokeSubjectSessions(ctx, sqlcdb.RevokeSubjectSessionsParams{Realm: string(authn.RealmIT), SubjectID: id, RevokedAt: &now}); err != nil {
			return err
		}
		return outbox.Enqueue(ctx, tx, "identity", outbox.Event{Subject: "identity.user.changed", Payload: map[string]any{
			"subjectId": id, "realm": authn.RealmIT, "changedBy": "it:" + actor.Subject,
		}})
	})
}
