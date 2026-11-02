package app

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/catalog"
	"platform.local/backend/pkg/db"
	"platform.local/backend/services/identity/internal/accounts"
	"platform.local/backend/services/identity/internal/postgres/sqlcdb"
)

var ErrPolicyUnavailable = errors.New("staff access policy unavailable")

type StaffAccessPolicy struct {
	SubjectID   string            `json:"subjectId"`
	Role        string            `json:"role"`
	Permissions map[string]bool   `json:"permissions"`
	DataScopes  map[string]string `json:"dataScopes"`
}

type StaffAccess struct {
	pool    *pgxpool.Pool
	modules func(context.Context) (map[string]bool, error)
}

func NewStaffAccess(pool *pgxpool.Pool, modules func(context.Context) (map[string]bool, error)) *StaffAccess {
	return &StaffAccess{pool: pool, modules: modules}
}

func (s *StaffAccess) Read(ctx context.Context, actor authn.Principal) (StaffAccessPolicy, error) {
	var policy StaffAccessPolicy
	if actor.Realm != authn.RealmStaff || len(actor.Roles) != 1 {
		return policy, accounts.ErrInvalid
	}
	role := actor.Roles[0]
	var modules map[string]bool
	// Fetch outside the transaction so a slow dependency cannot hold account/session locks.
	if role != catalog.SuperAdminRole {
		if s.modules == nil {
			return policy, ErrPolicyUnavailable
		}
		var err error
		modules, err = s.modules(ctx)
		if err != nil || modules == nil {
			return policy, ErrPolicyUnavailable
		}
	}
	err := db.WithTx(ctx, s.pool, pgx.TxOptions{IsoLevel: pgx.RepeatableRead}, func(tx pgx.Tx) error {
		q := sqlcdb.New(tx)
		if err := accounts.CheckUserSession(ctx, q, actor, time.Now()); err != nil {
			return err
		}
		raw, err := q.StaffPermissionOverrides(ctx, actor.Subject)
		if errors.Is(err, pgx.ErrNoRows) {
			return accounts.ErrInvalid
		}
		if err != nil {
			return err
		}
		var overrides map[string]bool
		if err := json.Unmarshal(raw, &overrides); err != nil {
			return ErrPolicyUnavailable
		}
		grants, err := q.StaffPermissionGrants(ctx, role)
		if err != nil {
			return err
		}
		stored := make(map[string]bool, len(grants))
		for _, grant := range grants {
			stored[grant.Resource+":"+grant.Action] = grant.Allowed
		}
		scopes, err := q.StaffRoleScopes(ctx, role)
		if err != nil {
			return err
		}
		storedScopes := make(map[string]string, len(scopes))
		for _, scope := range scopes {
			storedScopes[scope.Area] = scope.Scope
		}
		policy = StaffAccessPolicy{SubjectID: actor.Subject, Role: role,
			Permissions: StaffPermissions(role, stored, overrides, modules), DataScopes: StaffScopes(role, storedScopes)}
		return nil
	})
	return policy, err
}
