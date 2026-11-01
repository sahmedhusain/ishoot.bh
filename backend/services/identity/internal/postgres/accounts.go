package postgres

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/db"
	"platform.local/backend/services/identity/internal/accounts"
	"platform.local/backend/services/identity/internal/postgres/sqlcdb"
	"platform.local/backend/services/identity/internal/sessions"
)

func toAccount(row sqlcdb.IdentityAccount) accounts.Account {
	return accounts.Account{Realm: authn.Realm(row.Realm), SubjectID: row.SubjectID, Email: row.Email, PasswordHash: row.PasswordHash, Roles: row.Roles, Active: row.Active, MFAEnabled: row.MfaEnabled, MFASecret: row.MfaSecretEncrypted, LastStep: row.MfaLastStep}
}

func (p *Repository) FindByEmail(ctx context.Context, realm authn.Realm, email string) (accounts.Account, error) {
	row, err := p.q.FindAccountByEmail(ctx, sqlcdb.FindAccountByEmailParams{Realm: string(realm), Email: email})
	if errors.Is(err, pgx.ErrNoRows) {
		return accounts.Account{}, accounts.ErrInvalid
	}
	return toAccount(row), err
}

func (p *Repository) CompleteLogin(ctx context.Context, snapshot accounts.Account, replacement *string, credential sessions.Credential, now time.Time, check func(accounts.Account) (accounts.MFAResult, error)) (accounts.Account, error) {
	var result accounts.Account
	err := db.WithTx(ctx, p.pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		q := p.q.WithTx(tx)
		row, err := q.LockAccount(ctx, sqlcdb.LockAccountParams{Realm: string(snapshot.Realm), SubjectID: snapshot.SubjectID})
		if errors.Is(err, pgx.ErrNoRows) {
			return accounts.ErrInvalid
		}
		if err != nil {
			return err
		}
		if !row.Active || row.PasswordHash == nil || snapshot.PasswordHash == nil || *row.PasswordHash != *snapshot.PasswordHash || row.Email != snapshot.Email || credential.Family.Realm != snapshot.Realm || credential.Family.SubjectID != snapshot.SubjectID || !credential.Family.ExpiresAt.After(now) {
			return accounts.ErrInvalid
		}
		result = toAccount(row)
		factor, err := check(result)
		if err != nil {
			return err
		}
		if factor.RecoveryHash != "" {
			n, err := q.ConsumeAccountRecovery(ctx, sqlcdb.ConsumeAccountRecoveryParams{Realm: row.Realm, SubjectID: row.SubjectID, CodeHash: factor.RecoveryHash, UsedAt: &now})
			if err != nil {
				return err
			}
			if n != 1 {
				return accounts.ErrInvalid
			}
		}
		if factor.Step != nil {
			if row.MfaLastStep != nil && *factor.Step <= *row.MfaLastStep {
				return accounts.ErrInvalid
			}
			if err := q.SetAccountMFAStep(ctx, sqlcdb.SetAccountMFAStepParams{Realm: row.Realm, SubjectID: row.SubjectID, MfaLastStep: factor.Step, UpdatedAt: now}); err != nil {
				return err
			}
		}
		if replacement != nil {
			if err := q.UpdateAccountHash(ctx, sqlcdb.UpdateAccountHashParams{Realm: row.Realm, SubjectID: row.SubjectID, PasswordHash: replacement, UpdatedAt: now}); err != nil {
				return err
			}
		}
		if err := q.SetAccountLastLogin(ctx, sqlcdb.SetAccountLastLoginParams{Realm: row.Realm, SubjectID: row.SubjectID, LastLoginAt: &now}); err != nil {
			return err
		}
		if err := q.CreateSessionFamily(ctx, sqlcdb.CreateSessionFamilyParams{ID: credential.Family.ID, SubjectID: row.SubjectID, Realm: row.Realm, ExpiresAt: credential.Family.ExpiresAt}); err != nil {
			return err
		}
		return q.InsertRefreshRecord(ctx, sqlcdb.InsertRefreshRecordParams{TokenHash: credential.Digest(), FamilyID: credential.Family.ID})
	})
	if err != nil {
		return accounts.Account{}, err
	}
	return result, nil
}

func (p *Repository) ActiveSession(ctx context.Context, realm authn.Realm, id string, now time.Time) (string, []string, error) {
	row, err := p.q.ActiveAccountSession(ctx, sqlcdb.ActiveAccountSessionParams{ID: id, Realm: string(realm), ExpiresAt: now})
	if errors.Is(err, pgx.ErrNoRows) {
		return "", nil, accounts.ErrInvalid
	}
	return row.SubjectID, row.Roles, err
}
