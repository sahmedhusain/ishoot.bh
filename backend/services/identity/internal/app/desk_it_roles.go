package app

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/jackc/pgx/v5"
	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/db"
	"platform.local/backend/pkg/outbox"
	"platform.local/backend/services/identity/internal/accounts"
	"platform.local/backend/services/identity/internal/postgres/sqlcdb"
)

type ITRoleDraft struct {
	ID              string          `json:"id"`
	NameEn          string          `json:"nameEn"`
	NameAr          string          `json:"nameAr"`
	System          bool            `json:"system"`
	ReportingToRole *string         `json:"reportingToRole,omitempty"`
	Grants          map[string]bool `json:"grants"`
}

func (s *ITAccounts) Roles(ctx context.Context, actor authn.Principal) ([]ITRoleDraft, error) {
	var items []ITRoleDraft
	err := db.WithTx(ctx, s.pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		q := sqlcdb.New(tx)
		if err := accounts.CheckITAccess(ctx, q, actor, "staff_roles", "read", time.Now().UTC()); err != nil {
			return err
		}
		rows, err := tx.Query(ctx, `
			SELECT r.id, r.name_en, r.name_ar, r.is_system, r.reporting_to_role,
			       COALESCE(jsonb_object_agg(p.resource || ':' || p.action, p.allowed) FILTER (WHERE p.id IS NOT NULL), '{}'::jsonb) AS grants
			FROM identity.it_role r
			LEFT JOIN identity.it_permission p ON p.role_id = r.id
			GROUP BY r.id, r.name_en, r.name_ar, r.is_system, r.reporting_to_role, r.created_at
			ORDER BY r.created_at ASC
		`)
		if err != nil {
			return err
		}
		defer rows.Close()

		for rows.Next() {
			var r ITRoleDraft
			var grantsRaw []byte
			if err := rows.Scan(&r.ID, &r.NameEn, &r.NameAr, &r.System, &r.ReportingToRole, &grantsRaw); err != nil {
				return err
			}
			r.Grants = make(map[string]bool)
			if len(grantsRaw) > 0 {
				_ = json.Unmarshal(grantsRaw, &r.Grants)
			}
			items = append(items, r)
		}
		return rows.Err()
	})
	return items, err
}

func (s *ITAccounts) SaveRole(ctx context.Context, actor authn.Principal, in ITRoleDraft, create bool) error {
	in.NameEn = strings.TrimSpace(in.NameEn)
	in.NameAr = strings.TrimSpace(in.NameAr)
	in.ID = strings.TrimSpace(strings.ToLower(in.ID))
	if in.ID == "" || len(in.ID) > 100 || !utf8.ValidString(in.NameEn) || !utf8.ValidString(in.NameAr) || in.NameEn == "" || in.NameAr == "" {
		return ErrValidation
	}
	action := "edit"
	if create {
		action = "create"
	}
	return db.WithTx(ctx, s.pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		q := sqlcdb.New(tx)
		if err := accounts.CheckITAccess(ctx, q, actor, "staff_roles", action, time.Now().UTC()); err != nil {
			return err
		}
		var exists bool
		if err := tx.QueryRow(ctx, "SELECT EXISTS (SELECT 1 FROM identity.it_role WHERE id = $1)", in.ID).Scan(&exists); err != nil {
			return err
		}
		if create && exists {
			return ErrRoleExists
		}
		if !create && !exists {
			return ErrNotFound
		}

		if _, err := tx.Exec(ctx, `
			INSERT INTO identity.it_role (id, name_en, name_ar, is_system, reporting_to_role, revision)
			VALUES ($1, $2, $3, false, $4, 1)
			ON CONFLICT (id) DO UPDATE SET
				name_en = EXCLUDED.name_en,
				name_ar = EXCLUDED.name_ar,
				reporting_to_role = EXCLUDED.reporting_to_role,
				revision = identity.it_role.revision + 1
		`, in.ID, in.NameEn, in.NameAr, in.ReportingToRole); err != nil {
			return err
		}

		if _, err := tx.Exec(ctx, "DELETE FROM identity.it_permission WHERE role_id = $1", in.ID); err != nil {
			return err
		}

		for key, allowed := range in.Grants {
			parts := strings.SplitN(key, ":", 2)
			if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
				continue
			}
			pID := fmt.Sprintf("itperm_%s_%s_%s", in.ID, parts[0], parts[1])
			if _, err := tx.Exec(ctx, `
				INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at)
				VALUES ($1, $2, $3, $4, $5, now())
				ON CONFLICT (role_id, resource, action) DO UPDATE SET allowed = EXCLUDED.allowed
			`, pID, in.ID, parts[0], parts[1], allowed); err != nil {
				return err
			}
		}

		return outbox.Enqueue(ctx, tx, "identity", outbox.Event{
			Subject: "identity.it_role.changed",
			Payload: map[string]any{"roleId": in.ID, "action": action, "changedBy": "it:" + actor.Subject},
		})
	})
}

func (s *ITAccounts) DeleteRole(ctx context.Context, actor authn.Principal, id string) error {
	id = strings.TrimSpace(id)
	if id == "" {
		return ErrValidation
	}
	return db.WithTx(ctx, s.pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		q := sqlcdb.New(tx)
		if err := accounts.CheckITAccess(ctx, q, actor, "staff_roles", "delete", time.Now().UTC()); err != nil {
			return err
		}
		var isSystem bool
		err := tx.QueryRow(ctx, "SELECT is_system FROM identity.it_role WHERE id = $1", id).Scan(&isSystem)
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		if err != nil {
			return err
		}
		if isSystem {
			return ErrRoleAssigned
		}
		var assignedCount int64
		if err := tx.QueryRow(ctx, "SELECT count(*) FROM identity.account WHERE realm = 'it' AND roles @> ARRAY[$1::text]", id).Scan(&assignedCount); err != nil {
			return err
		}
		if assignedCount > 0 {
			return ErrRoleAssigned
		}

		if _, err := tx.Exec(ctx, "DELETE FROM identity.it_role WHERE id = $1 AND NOT is_system", id); err != nil {
			return err
		}
		return outbox.Enqueue(ctx, tx, "identity", outbox.Event{
			Subject: "identity.it_role.deleted",
			Payload: map[string]any{"roleId": id, "changedBy": "it:" + actor.Subject},
		})
	})
}
