package app

import (
	"context"
	"encoding/json"
	"errors"
	"slices"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
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

var ErrRoleExists = errors.New("role already exists")
var ErrRoleAssigned = errors.New("role is assigned or protected")

type StaffDraft struct {
	Email       string            `json:"email"`
	DisplayName string            `json:"displayName"`
	Role        string            `json:"role"`
	Active      bool              `json:"active"`
	Overrides   map[string]bool   `json:"overrides"`
	DataScopes  map[string]string `json:"dataScopes"`
	CopiedFrom  string            `json:"copiedFrom,omitempty"`
}
type AccessTemplate struct {
	Role       string            `json:"role"`
	Overrides  map[string]bool   `json:"overrides"`
	DataScopes map[string]string `json:"dataScopes"`
}
type StaffDeskAccount struct {
	ITAccount
	DisplayName string `json:"displayName"`
}
type StaffDeskPage struct {
	Items      []StaffDeskAccount `json:"items"`
	NextCursor string             `json:"nextCursor"`
}
type StaffRoleDraft struct {
	ID         string            `json:"id"`
	NameEn     string            `json:"nameEn"`
	NameAr     string            `json:"nameAr"`
	System     bool              `json:"system"`
	Grants     map[string]bool   `json:"grants"`
	DataScopes map[string]string `json:"dataScopes"`
}
type StaffRolePage struct {
	Items      []StaffRoleDraft `json:"items"`
	NextCursor string           `json:"nextCursor"`
}
type DeskStaff struct {
	pool    *pgxpool.Pool
	modules func(context.Context) (map[string]bool, error)
}

func NewDeskStaff(pool *pgxpool.Pool, modules func(context.Context) (map[string]bool, error)) *DeskStaff {
	return &DeskStaff{pool: pool, modules: modules}
}
func (s *DeskStaff) withIT(ctx context.Context, actor authn.Principal, resource, action string, fn func(pgx.Tx, *sqlcdb.Queries) error) error {
	return db.WithTx(ctx, s.pool, pgx.TxOptions{IsoLevel: pgx.RepeatableRead}, func(tx pgx.Tx) error {
		if action != "read" {
			if _, err := tx.Exec(ctx, "SELECT pg_advisory_xact_lock($1)", bootstrap.AccountLock); err != nil {
				return err
			}
		}
		q := sqlcdb.New(tx)
		if err := accounts.CheckITAccess(ctx, q, actor, resource, action, time.Now()); err != nil {
			return err
		}
		return fn(tx, q)
	})
}
func validStaffPolicy(role string, overrides map[string]bool, scopes map[string]string) bool {
	if !validID(role) || len(overrides) > len(catalog.StaffAccess.Resources)*len(catalog.StaffAccess.Actions) || len(scopes) > len(catalog.Scopes.Areas) {
		return false
	}
	for key := range overrides {
		resource, action, ok := strings.Cut(key, ":")
		if !ok || !slices.Contains(catalog.StaffAccess.Resources, resource) || !slices.Contains(catalog.StaffAccess.Actions, action) {
			return false
		}
	}
	for area, scope := range scopes {
		if !slices.Contains(catalog.Scopes.Areas, area) || !slices.Contains(catalog.Scopes.Scopes, scope) {
			return false
		}
	}
	return true
}
func staffDraft(ctx context.Context, q *sqlcdb.Queries, id string) (StaffDraft, error) {
	row, err := q.StaffAccountDraft(ctx, id)
	if errors.Is(err, pgx.ErrNoRows) {
		return StaffDraft{}, ErrNotFound
	}
	if err != nil {
		return StaffDraft{}, err
	}
	if len(row.Roles) != 1 {
		return StaffDraft{}, ErrPolicyUnavailable
	}
	out := StaffDraft{Email: row.Email, DisplayName: row.DisplayName, Role: row.Roles[0], Active: row.Active}
	if err := json.Unmarshal(row.PermissionOverrides, &out.Overrides); err != nil {
		return out, err
	}
	err = json.Unmarshal(row.DataScopes, &out.DataScopes)
	return out, err
}
func (s *DeskStaff) List(ctx context.Context, actor authn.Principal, cursor string, limit int32) (StaffDeskPage, error) {
	out := StaffDeskPage{Items: []StaffDeskAccount{}}
	if len(cursor) > 200 || limit < 1 || limit > 200 {
		return out, ErrValidation
	}
	err := s.withIT(ctx, actor, "staff_accounts", "read", func(_ pgx.Tx, q *sqlcdb.Queries) error {
		rows, err := q.ListStaffAccounts(ctx, sqlcdb.ListStaffAccountsParams{Cursor: cursor, RowLimit: limit + 1})
		if err != nil {
			return err
		}
		if len(rows) > int(limit) {
			rows = rows[:limit]
			out.NextCursor = rows[len(rows)-1].SubjectID
		}
		for _, row := range rows {
			name := ""
			if row.DisplayName != nil {
				name = *row.DisplayName
			}
			out.Items = append(out.Items, StaffDeskAccount{ITAccount: ITAccount{ID: row.SubjectID, Email: row.Email, Roles: row.Roles, Active: row.Active, MFAEnabled: row.MfaEnabled, CreatedAt: row.CreatedAt, LastLoginAt: row.LastLoginAt}, DisplayName: name})
		}
		return nil
	})
	return out, err
}
func (s *DeskStaff) Read(ctx context.Context, actor authn.Principal, id string) (StaffDraft, error) {
	var out StaffDraft
	if !validID(id) {
		return out, ErrValidation
	}
	err := s.withIT(ctx, actor, "staff_accounts", "read", func(_ pgx.Tx, q *sqlcdb.Queries) error { var err error; out, err = staffDraft(ctx, q, id); return err })
	return out, err
}
func (s *DeskStaff) CopyAccess(ctx context.Context, actor authn.Principal, id string) (AccessTemplate, error) {
	draft, err := s.Read(ctx, actor, id)
	return AccessTemplate{Role: draft.Role, Overrides: draft.Overrides, DataScopes: draft.DataScopes}, err
}
func (s *DeskStaff) Preview(ctx context.Context, actor authn.Principal, in AccessTemplate) (StaffAccessPolicy, error) {
	var out StaffAccessPolicy
	if !validStaffPolicy(in.Role, in.Overrides, in.DataScopes) {
		return out, ErrValidation
	}
	var modules map[string]bool
	if in.Role != catalog.SuperAdminRole {
		if s.modules == nil {
			return out, ErrPolicyUnavailable
		}
		var err error
		modules, err = s.modules(ctx)
		if err != nil || modules == nil {
			return out, ErrPolicyUnavailable
		}
	}
	err := s.withIT(ctx, actor, "staff_accounts", "read", func(_ pgx.Tx, q *sqlcdb.Queries) error {
		if _, err := q.StaffRole(ctx, in.Role); errors.Is(err, pgx.ErrNoRows) {
			return ErrValidation
		} else if err != nil {
			return err
		}
		grants, err := q.StaffPermissionGrants(ctx, in.Role)
		if err != nil {
			return err
		}
		stored := map[string]bool{}
		for _, grant := range grants {
			stored[grant.Resource+":"+grant.Action] = grant.Allowed
		}
		rows, err := q.StaffRoleScopes(ctx, in.Role)
		if err != nil {
			return err
		}
		scopes := map[string]string{}
		for _, row := range rows {
			scopes[row.Area] = row.Scope
		}
		for area, scope := range in.DataScopes {
			scopes[area] = scope
		}
		out = StaffAccessPolicy{Role: in.Role, Permissions: StaffPermissions(in.Role, stored, in.Overrides, modules), DataScopes: StaffScopes(in.Role, scopes)}
		return nil
	})
	return out, err
}
func (s *DeskStaff) Save(ctx context.Context, actor authn.Principal, id string, in StaffDraft) (string, error) {
	create := id == ""
	action := "edit"
	if create {
		id = uuid.NewString()
		action = "create"
	}
	email, ok := normalizeEmail(in.Email)
	if !ok || !validID(id) || !utf8.ValidString(in.DisplayName) || len([]rune(strings.TrimSpace(in.DisplayName))) < 1 || len([]rune(in.DisplayName)) > 120 || (!create && in.CopiedFrom != "") || len(in.CopiedFrom) > 200 {
		return "", ErrValidation
	}
	err := s.withIT(ctx, actor, "staff_accounts", action, func(tx pgx.Tx, q *sqlcdb.Queries) error {
		if in.CopiedFrom != "" {
			if err := accounts.CheckITAccess(ctx, q, actor, "staff_accounts", "read", time.Now()); err != nil {
				return err
			}
			source, err := staffDraft(ctx, q, in.CopiedFrom)
			if err != nil {
				return err
			}
			if in.Role == "" {
				in.Role = source.Role
			}
			if in.Overrides == nil {
				in.Overrides = source.Overrides
			}
			if in.DataScopes == nil {
				in.DataScopes = source.DataScopes
			}
		}
		if !validStaffPolicy(in.Role, in.Overrides, in.DataScopes) {
			return ErrValidation
		}
		if _, err := q.StaffRole(ctx, in.Role); errors.Is(err, pgx.ErrNoRows) {
			return ErrValidation
		} else if err != nil {
			return err
		}
		if !create {
			before, err := q.LockAccount(ctx, sqlcdb.LockAccountParams{Realm: "staff", SubjectID: id})
			if errors.Is(err, pgx.ErrNoRows) {
				return ErrNotFound
			}
			if err != nil {
				return err
			}
			if before.Active && before.PasswordHash != nil && slices.Contains(before.Roles, catalog.SuperAdminRole) && (!in.Active || in.Role != catalog.SuperAdminRole) {
				n, err := q.CountActiveStaffAdmins(ctx)
				if err != nil {
					return err
				}
				if n <= 1 {
					return ErrLastStaffAdmin
				}
			}
		}
		now := time.Now().UTC()
		if err := q.UpsertManagedAccount(ctx, sqlcdb.UpsertManagedAccountParams{Realm: "staff", SubjectID: id, Email: email, Username: nil, Roles: []string{in.Role}, Active: in.Active, Now: now}); err != nil {
			if uniqueViolation(err) {
				return ErrEmailTaken
			}
			return err
		}
		if in.Overrides == nil {
			in.Overrides = map[string]bool{}
		}
		if in.DataScopes == nil {
			in.DataScopes = map[string]string{}
		}
		overrides, err := json.Marshal(in.Overrides)
		if err != nil {
			return err
		}
		scopes, err := json.Marshal(in.DataScopes)
		if err != nil {
			return err
		}
		if err := q.SaveStaffAccountDraft(ctx, sqlcdb.SaveStaffAccountDraftParams{SubjectID: id, DisplayName: strings.TrimSpace(in.DisplayName), PermissionOverrides: overrides, DataScopes: scopes, Now: now}); err != nil {
			return err
		}
		if !create {
			if err := q.RevokeSubjectSessions(ctx, sqlcdb.RevokeSubjectSessionsParams{Realm: "staff", SubjectID: id, RevokedAt: &now}); err != nil {
				return err
			}
			if err := deleteResetLinks(ctx, q, authn.RealmStaff, id); err != nil {
				return err
			}
		}
		subject := "identity.user.changed"
		payload := map[string]any{"subjectId": id, "realm": "staff", "changedBy": "it:" + actor.Subject}
		if create {
			subject = "identity.user.created"
			if in.CopiedFrom != "" {
				payload["copiedFrom"] = in.CopiedFrom
			}
		}
		return outbox.Enqueue(ctx, tx, "identity", outbox.Event{Subject: subject, Payload: payload})
	})
	return id, err
}
func (s *DeskStaff) ResetMFA(ctx context.Context, actor authn.Principal, id string) error {
	if !validID(id) {
		return ErrValidation
	}
	return s.withIT(ctx, actor, "staff_accounts", "execute", func(tx pgx.Tx, _ *sqlcdb.Queries) error {
		return resetManagedMFA(ctx, tx, authn.RealmStaff, id, "it:"+actor.Subject)
	})
}
func (s *DeskStaff) Invite(ctx context.Context, actor authn.Principal, id string) (ResetRequest, error) {
	var out ResetRequest
	if !validID(id) {
		return out, ErrValidation
	}
	token, err := randomOAuthToken()
	if err != nil {
		return out, err
	}
	err = s.withIT(ctx, actor, "staff_accounts", "execute", func(tx pgx.Tx, q *sqlcdb.Queries) error {
		target, err := q.LockAccount(ctx, sqlcdb.LockAccountParams{Realm: "staff", SubjectID: id})
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		if err != nil {
			return err
		}
		if !target.Active {
			return ErrValidation
		}
		if err := deleteResetLinks(ctx, q, authn.RealmStaff, id); err != nil {
			return err
		}
		now := time.Now().UTC()
		out = ResetRequest{SubjectID: id, Email: target.Email, Token: token, ExpiresAt: now.Add(7 * 24 * time.Hour)}
		if err := q.InsertPasswordReset(ctx, sqlcdb.InsertPasswordResetParams{TokenHash: tokenHash(token), Realm: "staff", SubjectID: id, ExpiresAt: out.ExpiresAt, CreatedAt: now}); err != nil {
			return err
		}
		return outbox.Enqueue(ctx, tx, "identity", outbox.Event{Subject: "identity.password_reset.created", Payload: map[string]any{"subjectId": id, "realm": "staff", "changedBy": "it:" + actor.Subject}})
	})
	return out, err
}
