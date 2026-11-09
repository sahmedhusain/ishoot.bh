package app

import (
	"context"
	"encoding/json"
	"errors"
	"slices"
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
		var err error
		policy, err = evaluateStaffPolicy(ctx, q, actor.Subject, role, modules)
		return err
	})
	return policy, err
}

func evaluateStaffPolicy(ctx context.Context, q *sqlcdb.Queries, subject, role string, modules map[string]bool) (StaffAccessPolicy, error) {
	raw, err := q.StaffPermissionOverrides(ctx, subject)
	if errors.Is(err, pgx.ErrNoRows) {
		return StaffAccessPolicy{}, accounts.ErrInvalid
	}
	if err != nil {
		return StaffAccessPolicy{}, err
	}
	var overrides map[string]bool
	if err := json.Unmarshal(raw, &overrides); err != nil {
		return StaffAccessPolicy{}, ErrPolicyUnavailable
	}
	grants, err := q.StaffPermissionGrants(ctx, role)
	if err != nil {
		return StaffAccessPolicy{}, err
	}
	stored := make(map[string]bool, len(grants))
	for _, grant := range grants {
		stored[grant.Resource+":"+grant.Action] = grant.Allowed
	}
	scopes, err := q.StaffRoleScopes(ctx, role)
	if err != nil {
		return StaffAccessPolicy{}, err
	}
	storedScopes := make(map[string]string, len(scopes))
	for _, scope := range scopes {
		storedScopes[scope.Area] = scope.Scope
	}
	scopeOverrides, err := q.StaffScopeOverrides(ctx, subject)
	if err != nil {
		return StaffAccessPolicy{}, err
	}
	var individualScopes map[string]string
	if err := json.Unmarshal(scopeOverrides, &individualScopes); err != nil {
		return StaffAccessPolicy{}, ErrPolicyUnavailable
	}
	for area, scope := range individualScopes {
		storedScopes[area] = scope
	}
	policy := StaffAccessPolicy{SubjectID: subject, Role: role,
		Permissions: StaffPermissions(role, stored, overrides, modules), DataScopes: StaffScopes(role, storedScopes)}
	return policy, nil
}

// ReadSubject serves the authenticated legacy business backend while domain queries are being replaced.
func (s *StaffAccess) ReadSubject(ctx context.Context, id string) (StaffAccessPolicy, error) {
	var out StaffAccessPolicy
	if !validID(id) {
		return out, ErrValidation
	}
	snapshot, err := sqlcdb.New(s.pool).StaffAccountAuthorization(ctx, id)
	if errors.Is(err, pgx.ErrNoRows) {
		return out, ErrNotFound
	}
	if err != nil {
		return out, err
	}
	if !snapshot.Active || len(snapshot.Roles) != 1 {
		return out, accounts.ErrInvalid
	}
	var modules map[string]bool
	if snapshot.Roles[0] != catalog.SuperAdminRole {
		if s.modules == nil {
			return out, ErrPolicyUnavailable
		}
		modules, err = s.modules(ctx)
		if err != nil || modules == nil {
			return out, ErrPolicyUnavailable
		}
	}
	err = db.WithTx(ctx, s.pool, pgx.TxOptions{IsoLevel: pgx.RepeatableRead}, func(tx pgx.Tx) error {
		q := sqlcdb.New(tx)
		live, err := q.LockAccount(ctx, sqlcdb.LockAccountParams{Realm: "staff", SubjectID: id})
		if err != nil {
			return err
		}
		if !live.Active || !slices.Equal(live.Roles, snapshot.Roles) {
			return accounts.ErrInvalid
		}
		out, err = evaluateStaffPolicy(ctx, q, id, live.Roles[0], modules)
		return err
	})
	return out, err
}

type StaffRoleItem struct {
	ID              string  `json:"id"`
	NameEn          string  `json:"nameEn"`
	NameAr          string  `json:"nameAr"`
	IsSystem        bool    `json:"isSystem"`
	ReportingToRole *string `json:"reportingToRole"`
	Revision        int64   `json:"revision"`
}

func (s *StaffAccess) ListRoles(ctx context.Context) ([]StaffRoleItem, error) {
	rows, err := s.pool.Query(ctx, `SELECT id, name_en, name_ar, is_system, reporting_to_role, revision FROM identity.staff_role ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []StaffRoleItem
	for rows.Next() {
		var item StaffRoleItem
		if err := rows.Scan(&item.ID, &item.NameEn, &item.NameAr, &item.IsSystem, &item.ReportingToRole, &item.Revision); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}
