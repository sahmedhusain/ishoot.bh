package app

import (
	"context"
	"errors"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/outbox"
	"platform.local/backend/services/identity/internal/postgres/sqlcdb"
)

func staffRole(ctx context.Context, q *sqlcdb.Queries, id string) (StaffRoleDraft, error) {
	row, err := q.StaffRole(ctx, id)
	if errors.Is(err, pgx.ErrNoRows) {
		return StaffRoleDraft{}, ErrNotFound
	}
	if err != nil {
		return StaffRoleDraft{}, err
	}
	out := StaffRoleDraft{ID: row.ID, NameEn: row.NameEn, NameAr: row.NameAr, System: row.IsSystem, Grants: map[string]bool{}, DataScopes: map[string]string{}}
	grants, err := q.StaffPermissionGrants(ctx, id)
	if err != nil {
		return out, err
	}
	for _, grant := range grants {
		out.Grants[grant.Resource+":"+grant.Action] = grant.Allowed
	}
	scopes, err := q.StaffRoleScopes(ctx, id)
	if err != nil {
		return out, err
	}
	for _, scope := range scopes {
		out.DataScopes[scope.Area] = scope.Scope
	}
	return out, nil
}
func (s *DeskStaff) Roles(ctx context.Context, actor authn.Principal, cursor string, limit int32) (StaffRolePage, error) {
	out := StaffRolePage{Items: []StaffRoleDraft{}}
	if len(cursor) > 200 || limit < 1 || limit > 200 {
		return out, ErrValidation
	}
	err := s.withIT(ctx, actor, "staff_roles", "read", func(_ pgx.Tx, q *sqlcdb.Queries) error {
		rows, err := q.ListStaffRoles(ctx, sqlcdb.ListStaffRolesParams{Cursor: cursor, RowLimit: limit + 1})
		if err != nil {
			return err
		}
		if len(rows) > int(limit) {
			rows = rows[:limit]
			out.NextCursor = rows[len(rows)-1].ID
		}
		for _, row := range rows {
			role, err := staffRole(ctx, q, row.ID)
			if err != nil {
				return err
			}
			out.Items = append(out.Items, role)
		}
		return nil
	})
	return out, err
}
func (s *DeskStaff) SaveRole(ctx context.Context, actor authn.Principal, in StaffRoleDraft, create bool) error {
	in.NameEn = strings.TrimSpace(in.NameEn)
	in.NameAr = strings.TrimSpace(in.NameAr)
	if !validStaffPolicy(in.ID, in.Grants, in.DataScopes) || !utf8.ValidString(in.NameEn) || !utf8.ValidString(in.NameAr) || in.NameEn == "" || in.NameAr == "" || len([]rune(in.NameEn)) > 120 || len([]rune(in.NameAr)) > 120 {
		return ErrValidation
	}
	action := "edit"
	if create {
		action = "create"
	}
	return s.withIT(ctx, actor, "staff_roles", action, func(tx pgx.Tx, q *sqlcdb.Queries) error {
		_, err := q.StaffRole(ctx, in.ID)
		if create && err == nil {
			return ErrRoleExists
		}
		if !create && errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return err
		}
		if err := q.SaveStaffRole(ctx, sqlcdb.SaveStaffRoleParams{ID: in.ID, NameEn: in.NameEn, NameAr: in.NameAr}); err != nil {
			return err
		}
		if err := q.ClearStaffRoleGrants(ctx, in.ID); err != nil {
			return err
		}
		for key, allowed := range in.Grants {
			resource, action, _ := strings.Cut(key, ":")
			if err := q.SaveStaffRoleGrant(ctx, sqlcdb.SaveStaffRoleGrantParams{ID: uuid.NewString(), RoleID: in.ID, Resource: resource, Action: action, Allowed: allowed}); err != nil {
				return err
			}
		}
		if err := q.ClearStaffRoleScopes(ctx, in.ID); err != nil {
			return err
		}
		for area, scope := range in.DataScopes {
			if err := q.SaveStaffRoleScope(ctx, sqlcdb.SaveStaffRoleScopeParams{RoleID: in.ID, Area: area, Scope: scope}); err != nil {
				return err
			}
		}
		now := time.Now().UTC()
		if err := q.RevokeStaffRoleSessions(ctx, sqlcdb.RevokeStaffRoleSessionsParams{RoleID: in.ID, Now: &now}); err != nil {
			return err
		}
		if err := q.QueueStaffRoleProjections(ctx, in.ID); err != nil {
			return err
		}
		return outbox.Enqueue(ctx, tx, "identity", outbox.Event{Subject: "identity.role.changed", Payload: map[string]any{"roleId": in.ID, "changedBy": "it:" + actor.Subject, "operation": action}})
	})
}
func (s *DeskStaff) DeleteRole(ctx context.Context, actor authn.Principal, id string) error {
	if !validID(id) {
		return ErrValidation
	}
	return s.withIT(ctx, actor, "staff_roles", "delete", func(tx pgx.Tx, q *sqlcdb.Queries) error {
		role, err := q.StaffRole(ctx, id)
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		if err != nil {
			return err
		}
		if role.IsSystem {
			return ErrRoleAssigned
		}
		n, err := q.CountStaffRoleAssignments(ctx, id)
		if err != nil {
			return err
		}
		if n > 0 {
			return ErrRoleAssigned
		}
		if err := q.DeleteStaffRole(ctx, id); err != nil {
			return err
		}
		return outbox.Enqueue(ctx, tx, "identity", outbox.Event{Subject: "identity.role.changed", Payload: map[string]any{"roleId": id, "changedBy": "it:" + actor.Subject, "operation": "delete"}})
	})
}
