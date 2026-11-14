package sqlcdb

import (
	"context"
	"time"
)

const deleteOwnCustomerAccount = `-- name: DeleteOwnCustomerAccount :exec
DELETE FROM identity.account WHERE realm='customer' AND subject_id=$1
`

func (q *Queries) DeleteOwnCustomerAccount(ctx context.Context, subjectID string) error {
	_, err := q.db.Exec(ctx, deleteOwnCustomerAccount, subjectID)
	return err
}

const listOwnSessions = `-- name: ListOwnSessions :many
SELECT id, created_at, expires_at, user_agent, client_ip FROM identity.session_family
WHERE realm = $1 AND subject_id = $2 AND revoked_at IS NULL AND expires_at > $3
ORDER BY created_at DESC LIMIT 50
`

type ListOwnSessionsParams struct {
	Realm     string    `json:"realm"`
	SubjectID string    `json:"subjectId"`
	Now       time.Time `json:"now"`
}
type ListOwnSessionsRow struct {
	ID        string    `json:"id"`
	CreatedAt time.Time `json:"createdAt"`
	ExpiresAt time.Time `json:"expiresAt"`
	UserAgent *string   `json:"userAgent"`
	ClientIp  *string   `json:"clientIp"`
}

func (q *Queries) ListOwnSessions(ctx context.Context, arg ListOwnSessionsParams) ([]ListOwnSessionsRow, error) {
	rows, err := q.db.Query(ctx, listOwnSessions, arg.Realm, arg.SubjectID, arg.Now)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []ListOwnSessionsRow
	for rows.Next() {
		var i ListOwnSessionsRow
		if err := rows.Scan(
			&i.ID,
			&i.CreatedAt,
			&i.ExpiresAt,
			&i.UserAgent,
			&i.ClientIp,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const ownAccountSecurity = `-- name: OwnAccountSecurity :one
SELECT a.email, a.mfa_enabled, (a.password_hash IS NOT NULL)::boolean AS has_password,
 EXISTS(SELECT 1 FROM identity.customer_provider p WHERE p.realm=a.realm AND p.subject_id=a.subject_id AND p.provider='google')::boolean AS google,
 EXISTS(SELECT 1 FROM identity.customer_provider p WHERE p.realm=a.realm AND p.subject_id=a.subject_id AND p.provider='apple')::boolean AS apple,
 (SELECT count(*) FROM identity.mfa_recovery_code r WHERE r.realm = a.realm AND r.subject_id = a.subject_id AND r.used_at IS NULL)::bigint AS recovery_codes_left
FROM identity.account a WHERE a.realm = $1 AND a.subject_id = $2
`

type OwnAccountSecurityParams struct {
	Realm     string `json:"realm"`
	SubjectID string `json:"subjectId"`
}
type OwnAccountSecurityRow struct {
	Email             string `json:"email"`
	MfaEnabled        bool   `json:"mfaEnabled"`
	HasPassword       bool   `json:"hasPassword"`
	Google            bool   `json:"google"`
	Apple             bool   `json:"apple"`
	RecoveryCodesLeft int64  `json:"recoveryCodesLeft"`
}

func (q *Queries) OwnAccountSecurity(ctx context.Context, arg OwnAccountSecurityParams) (OwnAccountSecurityRow, error) {
	row := q.db.QueryRow(ctx, ownAccountSecurity, arg.Realm, arg.SubjectID)
	var i OwnAccountSecurityRow
	err := row.Scan(
		&i.Email,
		&i.MfaEnabled,
		&i.HasPassword,
		&i.Google,
		&i.Apple,
		&i.RecoveryCodesLeft,
	)
	return i, err
}

const revokeOwnOtherSessions = `-- name: RevokeOwnOtherSessions :many
UPDATE identity.session_family SET revoked_at = $1
WHERE realm = $2 AND subject_id = $3 AND id <> $4
 AND revoked_at IS NULL AND expires_at > $1
RETURNING id
`

type RevokeOwnOtherSessionsParams struct {
	Now       *time.Time `json:"now"`
	Realm     string     `json:"realm"`
	SubjectID string     `json:"subjectId"`
	KeepID    string     `json:"keepId"`
}

func (q *Queries) RevokeOwnOtherSessions(ctx context.Context, arg RevokeOwnOtherSessionsParams) ([]string, error) {
	rows, err := q.db.Query(ctx, revokeOwnOtherSessions,
		arg.Now,
		arg.Realm,
		arg.SubjectID,
		arg.KeepID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		items = append(items, id)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const revokeOwnSession = `-- name: RevokeOwnSession :execrows
UPDATE identity.session_family SET revoked_at = COALESCE(revoked_at, $1)
WHERE id = $2 AND realm = $3 AND subject_id = $4 AND revoked_at IS NULL
`

type RevokeOwnSessionParams struct {
	Now       *time.Time `json:"now"`
	ID        string     `json:"id"`
	Realm     string     `json:"realm"`
	SubjectID string     `json:"subjectId"`
}

func (q *Queries) RevokeOwnSession(ctx context.Context, arg RevokeOwnSessionParams) (int64, error) {
	result, err := q.db.Exec(ctx, revokeOwnSession,
		arg.Now,
		arg.ID,
		arg.Realm,
		arg.SubjectID,
	)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}

const setSessionDevice = `-- name: SetSessionDevice :exec
UPDATE identity.session_family SET user_agent = $1, client_ip = $2 WHERE id = $3
`

type SetSessionDeviceParams struct {
	UserAgent *string `json:"userAgent"`
	ClientIp  *string `json:"clientIp"`
	ID        string  `json:"id"`
}

func (q *Queries) SetSessionDevice(ctx context.Context, arg SetSessionDeviceParams) error {
	_, err := q.db.Exec(ctx, setSessionDevice, arg.UserAgent, arg.ClientIp, arg.ID)
	return err
}
