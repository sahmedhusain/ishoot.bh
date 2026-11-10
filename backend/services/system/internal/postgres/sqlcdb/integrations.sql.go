package sqlcdb
import (
	"context"
	"encoding/json"
	"time"
)
const claimSyncLease = `-- name: ClaimSyncLease :execrows
UPDATE system.integration_setting
SET sync_lease_token = $1,
    sync_lease_until = $2
WHERE provider = $3
  AND is_active = true
  AND (sync_lease_until IS NULL OR sync_lease_until <= $4)
`
type ClaimSyncLeaseParams struct {
	SyncLeaseToken	*string
	SyncLeaseUntil	*time.Time
	Provider	string
	Now		*time.Time
}
func (q *Queries) ClaimSyncLease(ctx context.Context, arg ClaimSyncLeaseParams) (int64, error) {
	result, err := q.db.Exec(ctx, claimSyncLease,
		arg.SyncLeaseToken,
		arg.SyncLeaseUntil,
		arg.Provider,
		arg.Now,
	)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}
const getIntegration = `-- name: GetIntegration :one
SELECT provider, is_active, credentials, config, sync_lease_token, sync_lease_until, health_status, last_checked_at, last_error, account_name, last_synced_at, updated_at, updated_by FROM system.integration_setting WHERE provider = $1
`
func (q *Queries) GetIntegration(ctx context.Context, provider string) (SystemIntegrationSetting, error) {
	row := q.db.QueryRow(ctx, getIntegration, provider)
	var i SystemIntegrationSetting
	err := row.Scan(
		&i.Provider,
		&i.IsActive,
		&i.Credentials,
		&i.Config,
		&i.SyncLeaseToken,
		&i.SyncLeaseUntil,
		&i.HealthStatus,
		&i.LastCheckedAt,
		&i.LastError,
		&i.AccountName,
		&i.LastSyncedAt,
		&i.UpdatedAt,
		&i.UpdatedBy,
	)
	return i, err
}
const listIntegrations = `-- name: ListIntegrations :many
SELECT provider, is_active, credentials, config, sync_lease_token, sync_lease_until, health_status, last_checked_at, last_error, account_name, last_synced_at, updated_at, updated_by FROM system.integration_setting ORDER BY provider
`
func (q *Queries) ListIntegrations(ctx context.Context) ([]SystemIntegrationSetting, error) {
	rows, err := q.db.Query(ctx, listIntegrations)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []SystemIntegrationSetting
	for rows.Next() {
		var i SystemIntegrationSetting
		if err := rows.Scan(
			&i.Provider,
			&i.IsActive,
			&i.Credentials,
			&i.Config,
			&i.SyncLeaseToken,
			&i.SyncLeaseUntil,
			&i.HealthStatus,
			&i.LastCheckedAt,
			&i.LastError,
			&i.AccountName,
			&i.LastSyncedAt,
			&i.UpdatedAt,
			&i.UpdatedBy,
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
const unlinkIntegration = `-- name: UnlinkIntegration :exec
INSERT INTO system.integration_setting (
    provider, is_active, credentials, config, health_status, last_error, account_name, last_synced_at, sync_lease_token, sync_lease_until, updated_by, updated_at
) VALUES (
    $1, false, NULL, '{}'::jsonb, 'unknown', NULL, NULL, NULL, NULL, NULL, $2, $3
) ON CONFLICT (provider) DO UPDATE SET
    is_active = false,
    credentials = NULL,
    config = '{}'::jsonb,
    health_status = 'unknown',
    last_error = NULL,
    account_name = NULL,
    last_synced_at = NULL,
    sync_lease_token = NULL,
    sync_lease_until = NULL,
    updated_by = EXCLUDED.updated_by,
    updated_at = EXCLUDED.updated_at
`
type UnlinkIntegrationParams struct {
	Provider	string
	UpdatedBy	*string
	UpdatedAt	time.Time
}
func (q *Queries) UnlinkIntegration(ctx context.Context, arg UnlinkIntegrationParams) error {
	_, err := q.db.Exec(ctx, unlinkIntegration, arg.Provider, arg.UpdatedBy, arg.UpdatedAt)
	return err
}
const updateIntegrationStatus = `-- name: UpdateIntegrationStatus :exec
UPDATE system.integration_setting
SET health_status = $1,
    last_error = $2,
    account_name = $3,
    last_checked_at = $4,
    last_synced_at = $5,
    config = COALESCE($6, system.integration_setting.config),
    credentials = COALESCE($7, system.integration_setting.credentials),
    sync_lease_token = $8,
    sync_lease_until = $9,
    updated_at = $10
WHERE provider = $11
`
type UpdateIntegrationStatusParams struct {
	HealthStatus	string
	LastError	*string
	AccountName	*string
	LastCheckedAt	*time.Time
	LastSyncedAt	*time.Time
	Config		json.RawMessage
	Credentials	*string
	SyncLeaseToken	*string
	SyncLeaseUntil	*time.Time
	UpdatedAt	time.Time
	Provider	string
}
func (q *Queries) UpdateIntegrationStatus(ctx context.Context, arg UpdateIntegrationStatusParams) error {
	_, err := q.db.Exec(ctx, updateIntegrationStatus,
		arg.HealthStatus,
		arg.LastError,
		arg.AccountName,
		arg.LastCheckedAt,
		arg.LastSyncedAt,
		arg.Config,
		arg.Credentials,
		arg.SyncLeaseToken,
		arg.SyncLeaseUntil,
		arg.UpdatedAt,
		arg.Provider,
	)
	return err
}
const upsertIntegration = `-- name: UpsertIntegration :exec
INSERT INTO system.integration_setting (
    provider, is_active, credentials, config, health_status, last_error, account_name, updated_by, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9
) ON CONFLICT (provider) DO UPDATE SET
    is_active = EXCLUDED.is_active,
    credentials = COALESCE(EXCLUDED.credentials, system.integration_setting.credentials),
    config = EXCLUDED.config,
    health_status = EXCLUDED.health_status,
    last_error = EXCLUDED.last_error,
    account_name = EXCLUDED.account_name,
    updated_by = EXCLUDED.updated_by,
    updated_at = EXCLUDED.updated_at
`
type UpsertIntegrationParams struct {
	Provider	string
	IsActive	bool
	Credentials	*string
	Config		json.RawMessage
	HealthStatus	string
	LastError	*string
	AccountName	*string
	UpdatedBy	*string
	UpdatedAt	time.Time
}
func (q *Queries) UpsertIntegration(ctx context.Context, arg UpsertIntegrationParams) error {
	_, err := q.db.Exec(ctx, upsertIntegration,
		arg.Provider,
		arg.IsActive,
		arg.Credentials,
		arg.Config,
		arg.HealthStatus,
		arg.LastError,
		arg.AccountName,
		arg.UpdatedBy,
		arg.UpdatedAt,
	)
	return err
}
