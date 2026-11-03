package postgres

import (
	"context"
	"errors"
	"slices"
	"time"

	"github.com/jackc/pgx/v5"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/db"
	"platform.local/backend/pkg/outbox"
	"platform.local/backend/services/identity/internal/accounts"
	"platform.local/backend/services/identity/internal/postgres/sqlcdb"
	"platform.local/backend/services/identity/internal/sessions"
)

func toAccount(row sqlcdb.IdentityAccount) accounts.Account {
	return accounts.Account{Realm: authn.Realm(row.Realm), SubjectID: row.SubjectID, Email: row.Email, PasswordHash: row.PasswordHash, Roles: row.Roles, Active: row.Active, MFAEnabled: row.MfaEnabled, MFASecret: row.MfaSecretEncrypted, LastStep: row.MfaLastStep, PendingSecret: row.MfaPendingSecretEncrypted, PendingExpires: row.MfaPendingExpiresAt}
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
		if credential.Family.UserAgent != "" || credential.Family.ClientIP != "" {
			if err := q.SetSessionDevice(ctx, sqlcdb.SetSessionDeviceParams{ID: credential.Family.ID,
				UserAgent: optional(credential.Family.UserAgent), ClientIp: optional(credential.Family.ClientIP)}); err != nil {
				return err
			}
		}
		if err := q.InsertRefreshRecord(ctx, sqlcdb.InsertRefreshRecordParams{TokenHash: credential.Digest(), FamilyID: credential.Family.ID}); err != nil {
			return err
		}
		return sessionEvent(ctx, tx, "started", credential.Family, "login")
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

func (p *Repository) FindBySubject(ctx context.Context, realm authn.Realm, subject string) (accounts.Account, error) {
	row, err := p.q.FindAccountBySubject(ctx, sqlcdb.FindAccountBySubjectParams{Realm: string(realm), SubjectID: subject})
	if errors.Is(err, pgx.ErrNoRows) {
		return accounts.Account{}, accounts.ErrInvalid
	}
	return toAccount(row), err
}

func (p *Repository) ChangeMFA(ctx context.Context, snapshot accounts.Account, principal authn.Principal, now time.Time, change func(accounts.Account, time.Time) (accounts.MFAChange, error)) error {
	return db.WithTx(ctx, p.pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		q := p.q.WithTx(tx)
		row, err := q.LockAccount(ctx, sqlcdb.LockAccountParams{Realm: string(principal.Realm), SubjectID: principal.Subject})
		if errors.Is(err, pgx.ErrNoRows) {
			return accounts.ErrInvalid
		}
		if err != nil {
			return err
		}
		if !row.Active || row.PasswordHash == nil || snapshot.PasswordHash == nil || *row.PasswordHash != *snapshot.PasswordHash || row.Email != snapshot.Email || !slices.Equal(row.Roles, principal.Roles) || (principal.Realm == authn.RealmIT && !row.MfaEnabled) {
			return accounts.ErrInvalid
		}
		session, err := q.LockSessionFamily(ctx, principal.SessionID)
		if errors.Is(err, pgx.ErrNoRows) {
			return accounts.ErrInvalid
		}
		if err != nil {
			return err
		}
		if current := time.Now(); current.After(now) {
			now = current
		}
		if session.Realm != row.Realm || session.SubjectID != row.SubjectID || session.RevokedAt != nil || !session.ExpiresAt.After(now) {
			return accounts.ErrInvalid
		}
		update, err := change(toAccount(row), now)
		if err != nil {
			return err
		}
		if update.CurrentRecoveryHash != "" {
			n, err := q.ConsumeAccountRecovery(ctx, sqlcdb.ConsumeAccountRecoveryParams{Realm: row.Realm, SubjectID: row.SubjectID, CodeHash: update.CurrentRecoveryHash, UsedAt: &now})
			if err != nil {
				return err
			}
			if n != 1 {
				return accounts.ErrInvalid
			}
		}
		switch update.Kind {
		case "begin", "cancel":
			if err := q.SetMFAPending(ctx, sqlcdb.SetMFAPendingParams{Realm: row.Realm, SubjectID: row.SubjectID, MfaPendingSecretEncrypted: update.Secret, MfaPendingExpiresAt: update.ExpiresAt, UpdatedAt: now}); err != nil {
				return err
			}
		case "confirm", "disable":
			enabled := update.Kind == "confirm"
			if enabled && (update.Secret == nil || update.Step == nil || len(update.RecoveryHashes) == 0) {
				return accounts.ErrInvalid
			}
			if err := q.SetMFAState(ctx, sqlcdb.SetMFAStateParams{Realm: row.Realm, SubjectID: row.SubjectID, MfaEnabled: enabled, MfaSecretEncrypted: update.Secret, MfaLastStep: update.Step, UpdatedAt: now}); err != nil {
				return err
			}
			if err := q.DeleteAccountRecovery(ctx, sqlcdb.DeleteAccountRecoveryParams{Realm: row.Realm, SubjectID: row.SubjectID}); err != nil {
				return err
			}
			for _, hash := range update.RecoveryHashes {
				if err := q.InsertAccountRecovery(ctx, sqlcdb.InsertAccountRecoveryParams{Realm: row.Realm, SubjectID: row.SubjectID, CodeHash: hash}); err != nil {
					return err
				}
			}
			if err := q.RevokeSubjectSessions(ctx, sqlcdb.RevokeSubjectSessionsParams{Realm: row.Realm, SubjectID: row.SubjectID, RevokedAt: &now}); err != nil {
				return err
			}
		case "password":
			if update.PasswordHash == nil {
				return accounts.ErrInvalid
			}
			if err := q.UpdateAccountHash(ctx, sqlcdb.UpdateAccountHashParams{Realm: row.Realm, SubjectID: row.SubjectID, PasswordHash: update.PasswordHash, UpdatedAt: now}); err != nil {
				return err
			}
			if update.Step != nil {
				if err := q.SetAccountMFAStep(ctx, sqlcdb.SetAccountMFAStepParams{Realm: row.Realm, SubjectID: row.SubjectID, MfaLastStep: update.Step, UpdatedAt: now}); err != nil {
					return err
				}
			}
			if err := q.RevokeSubjectSessions(ctx, sqlcdb.RevokeSubjectSessionsParams{Realm: row.Realm, SubjectID: row.SubjectID, RevokedAt: &now}); err != nil {
				return err
			}
			if err := q.SetMFAPending(ctx, sqlcdb.SetMFAPendingParams{Realm: row.Realm, SubjectID: row.SubjectID, UpdatedAt: now}); err != nil {
				return err
			}
			if err := q.DeleteOpenPasswordResets(ctx, sqlcdb.DeleteOpenPasswordResetsParams{Realm: row.Realm, SubjectID: row.SubjectID}); err != nil {
				return err
			}
			if err := q.CancelLegacyResetChallenges(ctx, sqlcdb.CancelLegacyResetChallengesParams{Realm: row.Realm, SubjectID: row.SubjectID}); err != nil {
				return err
			}
			return outbox.Enqueue(ctx, tx, "identity", outbox.Event{Subject: "identity.user.changed", Payload: map[string]any{
				"subjectId": row.SubjectID, "realm": row.Realm, "changedBy": row.Realm + ":" + row.SubjectID,
			}})

		default:
			return accounts.ErrInvalid
		}
		return outbox.Enqueue(ctx, tx, "identity", outbox.Event{Subject: "identity.mfa.changed", Payload: map[string]any{
			"subjectId": row.SubjectID, "realm": row.Realm, "changedBy": row.Realm + ":" + row.SubjectID, "operation": update.Kind,
		}})
	})
}

func (p *Repository) ClearExpiredMFAEnrollments(ctx context.Context, now time.Time, batch int32) (int64, error) {
	if batch <= 0 {
		return 0, errors.New("cleanup batch must be positive")
	}
	return p.q.ClearExpiredMFAEnrollments(ctx, sqlcdb.ClearExpiredMFAEnrollmentsParams{Cutoff: &now, BatchSize: batch})
}

func optional(v string) *string {
	if v == "" {
		return nil
	}
	return &v
}

// ClearExpiredCredentials removes bounded batches of expired password reset links and email codes.
func (p *Repository) ClearExpiredCredentials(ctx context.Context, now time.Time, batch int32) (int64, error) {
	if batch <= 0 {
		return 0, errors.New("cleanup batch must be positive")
	}
	n, err := p.q.DeleteExpiredPasswordResets(ctx, sqlcdb.DeleteExpiredPasswordResetsParams{Cutoff: now, BatchSize: batch})
	if err != nil {
		return 0, err
	}
	m, err := p.q.DeleteExpiredCustomerCodes(ctx, sqlcdb.DeleteExpiredCustomerCodesParams{Cutoff: now, BatchSize: batch})
	if err != nil {
		return n, err
	}
	o, err := p.q.DeleteExpiredOAuthStates(ctx, sqlcdb.DeleteExpiredOAuthStatesParams{Cutoff: now, BatchSize: batch})
	if err != nil {
		return n + m + o, err
	}
	l, err := p.q.DeleteExpiredLegacyResetChallenges(ctx, sqlcdb.DeleteExpiredLegacyResetChallengesParams{Cutoff: now, BatchSize: batch})
	return n + m + o + l, err
}
