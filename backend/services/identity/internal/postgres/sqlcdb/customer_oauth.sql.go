package sqlcdb
import (
	"context"
	"time"
)
const claimOAuthExchange = `-- name: ClaimOAuthExchange :exec
UPDATE identity.oauth_state SET exchanging_at=$2 WHERE state_hash=$1
`
type ClaimOAuthExchangeParams struct {
	StateHash	string
	ExchangingAt	*time.Time
}
func (q *Queries) ClaimOAuthExchange(ctx context.Context, arg ClaimOAuthExchangeParams) error {
	_, err := q.db.Exec(ctx, claimOAuthExchange, arg.StateHash, arg.ExchangingAt)
	return err
}
const consumeOAuthState = `-- name: ConsumeOAuthState :exec
UPDATE identity.oauth_state SET consumed_at=$2 WHERE state_hash=$1
`
type ConsumeOAuthStateParams struct {
	StateHash	string
	ConsumedAt	*time.Time
}
func (q *Queries) ConsumeOAuthState(ctx context.Context, arg ConsumeOAuthStateParams) error {
	_, err := q.db.Exec(ctx, consumeOAuthState, arg.StateHash, arg.ConsumedAt)
	return err
}
const deleteExpiredOAuthStates = `-- name: DeleteExpiredOAuthStates :execrows
DELETE FROM identity.oauth_state WHERE state_hash IN (
 SELECT os.state_hash FROM identity.oauth_state os WHERE os.expires_at <= $1 ORDER BY os.expires_at,os.state_hash
 LIMIT $2::int FOR UPDATE SKIP LOCKED
)
`
type DeleteExpiredOAuthStatesParams struct {
	Cutoff		time.Time
	BatchSize	int32
}
func (q *Queries) DeleteExpiredOAuthStates(ctx context.Context, arg DeleteExpiredOAuthStatesParams) (int64, error) {
	result, err := q.db.Exec(ctx, deleteExpiredOAuthStates, arg.Cutoff, arg.BatchSize)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}
const findProviderCustomer = `-- name: FindProviderCustomer :one
SELECT a.realm, a.subject_id, a.email, a.password_hash, a.roles, a.active, a.mfa_enabled, a.mfa_secret_encrypted, a.mfa_last_step, a.last_login_at, a.created_at, a.updated_at, a.mfa_pending_secret_encrypted, a.mfa_pending_expires_at, a.username, a.reporting_to FROM identity.customer_provider p JOIN identity.account a ON a.realm=p.realm AND a.subject_id=p.subject_id
WHERE p.provider=$1 AND p.provider_subject=$2
`
type FindProviderCustomerParams struct {
	Provider	string
	ProviderSubject	string
}
func (q *Queries) FindProviderCustomer(ctx context.Context, arg FindProviderCustomerParams) (IdentityAccount, error) {
	row := q.db.QueryRow(ctx, findProviderCustomer, arg.Provider, arg.ProviderSubject)
	var i IdentityAccount
	err := row.Scan(
		&i.Realm,
		&i.SubjectID,
		&i.Email,
		&i.PasswordHash,
		&i.Roles,
		&i.Active,
		&i.MfaEnabled,
		&i.MfaSecretEncrypted,
		&i.MfaLastStep,
		&i.LastLoginAt,
		&i.CreatedAt,
		&i.UpdatedAt,
		&i.MfaPendingSecretEncrypted,
		&i.MfaPendingExpiresAt,
		&i.Username,
		&i.ReportingTo,
	)
	return i, err
}
const linkCustomerProvider = `-- name: LinkCustomerProvider :exec
INSERT INTO identity.customer_provider(provider,provider_subject,subject_id) VALUES ($1,$2,$3)
ON CONFLICT(provider,subject_id) DO UPDATE SET provider_subject=EXCLUDED.provider_subject
`
type LinkCustomerProviderParams struct {
	Provider	string
	ProviderSubject	string
	SubjectID	string
}
func (q *Queries) LinkCustomerProvider(ctx context.Context, arg LinkCustomerProviderParams) error {
	_, err := q.db.Exec(ctx, linkCustomerProvider, arg.Provider, arg.ProviderSubject, arg.SubjectID)
	return err
}
const lockOAuthState = `-- name: LockOAuthState :one
SELECT state_hash, provider, redirect_uri, next_path, locale, secret_encrypted, claims_encrypted, exchanging_at, consumed_at, expires_at, created_at FROM identity.oauth_state WHERE state_hash=$1 FOR UPDATE
`
func (q *Queries) LockOAuthState(ctx context.Context, stateHash string) (IdentityOauthState, error) {
	row := q.db.QueryRow(ctx, lockOAuthState, stateHash)
	var i IdentityOauthState
	err := row.Scan(
		&i.StateHash,
		&i.Provider,
		&i.RedirectUri,
		&i.NextPath,
		&i.Locale,
		&i.SecretEncrypted,
		&i.ClaimsEncrypted,
		&i.ExchangingAt,
		&i.ConsumedAt,
		&i.ExpiresAt,
		&i.CreatedAt,
	)
	return i, err
}
const storeOAuthClaims = `-- name: StoreOAuthClaims :exec
UPDATE identity.oauth_state SET claims_encrypted=$2 WHERE state_hash=$1 AND consumed_at IS NULL
`
type StoreOAuthClaimsParams struct {
	StateHash	string
	ClaimsEncrypted	*string
}
func (q *Queries) StoreOAuthClaims(ctx context.Context, arg StoreOAuthClaimsParams) error {
	_, err := q.db.Exec(ctx, storeOAuthClaims, arg.StateHash, arg.ClaimsEncrypted)
	return err
}
const storeOAuthState = `-- name: StoreOAuthState :exec
INSERT INTO identity.oauth_state (state_hash,provider,redirect_uri,next_path,locale,secret_encrypted,expires_at)
VALUES ($1,$2,$3,$4,$5,$6,$7)
`
type StoreOAuthStateParams struct {
	StateHash	string
	Provider	string
	RedirectUri	string
	NextPath	string
	Locale		string
	SecretEncrypted	string
	ExpiresAt	time.Time
}
func (q *Queries) StoreOAuthState(ctx context.Context, arg StoreOAuthStateParams) error {
	_, err := q.db.Exec(ctx, storeOAuthState,
		arg.StateHash,
		arg.Provider,
		arg.RedirectUri,
		arg.NextPath,
		arg.Locale,
		arg.SecretEncrypted,
		arg.ExpiresAt,
	)
	return err
}
