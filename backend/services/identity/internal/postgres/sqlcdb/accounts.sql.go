package sqlcdb
import (
	"context"
	"time"
)
const activeAccountSession = `-- name: ActiveAccountSession :one
SELECT a.subject_id, a.roles FROM identity.account a
JOIN identity.session_family s ON s.realm=a.realm AND s.subject_id=a.subject_id
WHERE s.id=$1 AND s.realm=$2 AND s.revoked_at IS NULL AND s.expires_at>$3
 AND a.active
`
type ActiveAccountSessionParams struct {
	ID		string
	Realm		string
	ExpiresAt	time.Time
}
type ActiveAccountSessionRow struct {
	SubjectID	string
	Roles		[]string
}
func (q *Queries) ActiveAccountSession(ctx context.Context, arg ActiveAccountSessionParams) (ActiveAccountSessionRow, error) {
	row := q.db.QueryRow(ctx, activeAccountSession, arg.ID, arg.Realm, arg.ExpiresAt)
	var i ActiveAccountSessionRow
	err := row.Scan(&i.SubjectID, &i.Roles)
	return i, err
}
const clearExpiredMFAEnrollments = `-- name: ClearExpiredMFAEnrollments :execrows
UPDATE identity.account SET mfa_pending_secret_encrypted=NULL, mfa_pending_expires_at=NULL
WHERE (realm,subject_id) IN (
 SELECT a.realm,a.subject_id FROM identity.account AS a WHERE a.mfa_pending_expires_at <= $1
 ORDER BY a.mfa_pending_expires_at,a.realm,a.subject_id LIMIT $2::int FOR UPDATE SKIP LOCKED
)
`
type ClearExpiredMFAEnrollmentsParams struct {
	Cutoff		*time.Time
	BatchSize	int32
}
func (q *Queries) ClearExpiredMFAEnrollments(ctx context.Context, arg ClearExpiredMFAEnrollmentsParams) (int64, error) {
	result, err := q.db.Exec(ctx, clearExpiredMFAEnrollments, arg.Cutoff, arg.BatchSize)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}
const consumeAccountRecovery = `-- name: ConsumeAccountRecovery :execrows
UPDATE identity.mfa_recovery_code SET used_at=$4 WHERE realm=$1 AND subject_id=$2 AND code_hash=$3 AND used_at IS NULL
`
type ConsumeAccountRecoveryParams struct {
	Realm		string
	SubjectID	string
	CodeHash	string
	UsedAt		*time.Time
}
func (q *Queries) ConsumeAccountRecovery(ctx context.Context, arg ConsumeAccountRecoveryParams) (int64, error) {
	result, err := q.db.Exec(ctx, consumeAccountRecovery,
		arg.Realm,
		arg.SubjectID,
		arg.CodeHash,
		arg.UsedAt,
	)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}
const countRealmAccounts = `-- name: CountRealmAccounts :one
SELECT count(*) FROM identity.account WHERE realm=$1
`
func (q *Queries) CountRealmAccounts(ctx context.Context, realm string) (int64, error) {
	row := q.db.QueryRow(ctx, countRealmAccounts, realm)
	var count int64
	err := row.Scan(&count)
	return count, err
}
const deleteAccountRecovery = `-- name: DeleteAccountRecovery :exec
DELETE FROM identity.mfa_recovery_code WHERE realm=$1 AND subject_id=$2
`
type DeleteAccountRecoveryParams struct {
	Realm		string
	SubjectID	string
}
func (q *Queries) DeleteAccountRecovery(ctx context.Context, arg DeleteAccountRecoveryParams) error {
	_, err := q.db.Exec(ctx, deleteAccountRecovery, arg.Realm, arg.SubjectID)
	return err
}
const findAccountByEmail = `-- name: FindAccountByEmail :one
SELECT realm, subject_id, email, password_hash, roles, active, mfa_enabled, mfa_secret_encrypted, mfa_last_step, last_login_at, created_at, updated_at, mfa_pending_secret_encrypted, mfa_pending_expires_at, username, reporting_to FROM identity.account WHERE realm=$1 AND (email=$2 OR lower(email)=lower($2) OR (username IS NOT NULL AND lower(username)=lower($2)))
`
type FindAccountByEmailParams struct {
	Realm	string
	Email	string
}
func (q *Queries) FindAccountByEmail(ctx context.Context, arg FindAccountByEmailParams) (IdentityAccount, error) {
	row := q.db.QueryRow(ctx, findAccountByEmail, arg.Realm, arg.Email)
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
const findAccountBySubject = `-- name: FindAccountBySubject :one
SELECT realm, subject_id, email, password_hash, roles, active, mfa_enabled, mfa_secret_encrypted, mfa_last_step, last_login_at, created_at, updated_at, mfa_pending_secret_encrypted, mfa_pending_expires_at, username, reporting_to FROM identity.account WHERE realm=$1 AND subject_id=$2
`
type FindAccountBySubjectParams struct {
	Realm		string
	SubjectID	string
}
func (q *Queries) FindAccountBySubject(ctx context.Context, arg FindAccountBySubjectParams) (IdentityAccount, error) {
	row := q.db.QueryRow(ctx, findAccountBySubject, arg.Realm, arg.SubjectID)
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
const insertAccount = `-- name: InsertAccount :exec
INSERT INTO identity.account (realm,subject_id,email,password_hash,roles,mfa_enabled,mfa_secret_encrypted,created_at,updated_at)
VALUES ($1,$2,$3,$4,$5::text[],$6,$7,$8,$8)
`
type InsertAccountParams struct {
	Realm			string
	SubjectID		string
	Email			string
	PasswordHash		*string
	Roles			[]string
	MfaEnabled		bool
	MfaSecretEncrypted	*string
	Now			time.Time
}
func (q *Queries) InsertAccount(ctx context.Context, arg InsertAccountParams) error {
	_, err := q.db.Exec(ctx, insertAccount,
		arg.Realm,
		arg.SubjectID,
		arg.Email,
		arg.PasswordHash,
		arg.Roles,
		arg.MfaEnabled,
		arg.MfaSecretEncrypted,
		arg.Now,
	)
	return err
}
const insertAccountRecovery = `-- name: InsertAccountRecovery :exec
INSERT INTO identity.mfa_recovery_code (realm,subject_id,code_hash) VALUES ($1,$2,$3)
`
type InsertAccountRecoveryParams struct {
	Realm		string
	SubjectID	string
	CodeHash	string
}
func (q *Queries) InsertAccountRecovery(ctx context.Context, arg InsertAccountRecoveryParams) error {
	_, err := q.db.Exec(ctx, insertAccountRecovery, arg.Realm, arg.SubjectID, arg.CodeHash)
	return err
}
const lockAccount = `-- name: LockAccount :one
SELECT realm, subject_id, email, password_hash, roles, active, mfa_enabled, mfa_secret_encrypted, mfa_last_step, last_login_at, created_at, updated_at, mfa_pending_secret_encrypted, mfa_pending_expires_at, username, reporting_to FROM identity.account WHERE realm=$1 AND subject_id=$2 FOR UPDATE
`
type LockAccountParams struct {
	Realm		string
	SubjectID	string
}
func (q *Queries) LockAccount(ctx context.Context, arg LockAccountParams) (IdentityAccount, error) {
	row := q.db.QueryRow(ctx, lockAccount, arg.Realm, arg.SubjectID)
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
const revokeSubjectSessions = `-- name: RevokeSubjectSessions :exec
UPDATE identity.session_family SET revoked_at=COALESCE(revoked_at,$3) WHERE realm=$1 AND subject_id=$2
`
type RevokeSubjectSessionsParams struct {
	Realm		string
	SubjectID	string
	RevokedAt	*time.Time
}
func (q *Queries) RevokeSubjectSessions(ctx context.Context, arg RevokeSubjectSessionsParams) error {
	_, err := q.db.Exec(ctx, revokeSubjectSessions, arg.Realm, arg.SubjectID, arg.RevokedAt)
	return err
}
const setAccountLastLogin = `-- name: SetAccountLastLogin :exec
UPDATE identity.account SET last_login_at=$3 WHERE realm=$1 AND subject_id=$2
`
type SetAccountLastLoginParams struct {
	Realm		string
	SubjectID	string
	LastLoginAt	*time.Time
}
func (q *Queries) SetAccountLastLogin(ctx context.Context, arg SetAccountLastLoginParams) error {
	_, err := q.db.Exec(ctx, setAccountLastLogin, arg.Realm, arg.SubjectID, arg.LastLoginAt)
	return err
}
const setAccountMFAStep = `-- name: SetAccountMFAStep :exec
UPDATE identity.account SET mfa_last_step=$3, updated_at=$4 WHERE realm=$1 AND subject_id=$2
`
type SetAccountMFAStepParams struct {
	Realm		string
	SubjectID	string
	MfaLastStep	*int64
	UpdatedAt	time.Time
}
func (q *Queries) SetAccountMFAStep(ctx context.Context, arg SetAccountMFAStepParams) error {
	_, err := q.db.Exec(ctx, setAccountMFAStep,
		arg.Realm,
		arg.SubjectID,
		arg.MfaLastStep,
		arg.UpdatedAt,
	)
	return err
}
const setMFAPending = `-- name: SetMFAPending :exec
UPDATE identity.account SET mfa_pending_secret_encrypted=$3, mfa_pending_expires_at=$4, updated_at=$5 WHERE realm=$1 AND subject_id=$2
`
type SetMFAPendingParams struct {
	Realm				string
	SubjectID			string
	MfaPendingSecretEncrypted	*string
	MfaPendingExpiresAt		*time.Time
	UpdatedAt			time.Time
}
func (q *Queries) SetMFAPending(ctx context.Context, arg SetMFAPendingParams) error {
	_, err := q.db.Exec(ctx, setMFAPending,
		arg.Realm,
		arg.SubjectID,
		arg.MfaPendingSecretEncrypted,
		arg.MfaPendingExpiresAt,
		arg.UpdatedAt,
	)
	return err
}
const setMFAState = `-- name: SetMFAState :exec
UPDATE identity.account SET mfa_enabled=$3, mfa_secret_encrypted=$4, mfa_last_step=$5,
 mfa_pending_secret_encrypted=NULL, mfa_pending_expires_at=NULL, updated_at=$6 WHERE realm=$1 AND subject_id=$2
`
type SetMFAStateParams struct {
	Realm			string
	SubjectID		string
	MfaEnabled		bool
	MfaSecretEncrypted	*string
	MfaLastStep		*int64
	UpdatedAt		time.Time
}
func (q *Queries) SetMFAState(ctx context.Context, arg SetMFAStateParams) error {
	_, err := q.db.Exec(ctx, setMFAState,
		arg.Realm,
		arg.SubjectID,
		arg.MfaEnabled,
		arg.MfaSecretEncrypted,
		arg.MfaLastStep,
		arg.UpdatedAt,
	)
	return err
}
const updateAccountHash = `-- name: UpdateAccountHash :exec
UPDATE identity.account SET password_hash=$3, updated_at=$4 WHERE realm=$1 AND subject_id=$2
`
type UpdateAccountHashParams struct {
	Realm		string
	SubjectID	string
	PasswordHash	*string
	UpdatedAt	time.Time
}
func (q *Queries) UpdateAccountHash(ctx context.Context, arg UpdateAccountHashParams) error {
	_, err := q.db.Exec(ctx, updateAccountHash,
		arg.Realm,
		arg.SubjectID,
		arg.PasswordHash,
		arg.UpdatedAt,
	)
	return err
}
