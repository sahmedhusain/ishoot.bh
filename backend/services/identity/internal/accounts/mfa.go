package accounts

import (
	"context"
	"crypto/rand"
	"encoding/base32"
	"errors"
	"time"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/password"
	"platform.local/backend/pkg/totp"
	"platform.local/backend/services/identity/internal/guard"
)

// MFAConfig controls enrollment lifetime and the recovery codes returned once on confirmation.
type MFAConfig struct {
	EnrollmentTTL, Period time.Duration
	RecoveryCount, Digits int
}
type MFAChange struct {
	// Kind is begin, cancel, confirm, disable, or password (a person changing their own password).
	Kind string
	// PasswordHash is the new hash for Kind password.
	PasswordHash        *string
	Secret              *string
	ExpiresAt           *time.Time
	Step                *int64
	RecoveryHashes      []string
	CurrentRecoveryHash string
}
type Enrollment struct {
	Secret        string
	Digits        int
	PeriodSeconds int64
	ExpiresAt     time.Time
}

// CheckFactor verifies a factor for a locked account; the caller must atomically consume recovery codes and persist the step.
func (s *Service) CheckFactor(account Account, code string, now time.Time) (MFAResult, error) {
	if !account.MFAEnabled {
		return MFAResult{}, nil
	}
	if code == "" {
		return MFAResult{}, ErrMFARequired
	}
	if hash, ok := totp.RecoveryHash(code); ok {
		return MFAResult{RecoveryHash: hash}, nil
	}
	if account.MFASecret == nil {
		return MFAResult{}, ErrInvalid
	}
	secret, err := s.secrets.Open(*account.MFASecret, account.SubjectID)
	if err != nil {
		return MFAResult{}, err
	}
	defer clear(secret)
	step, ok := s.otp.Match(secret, code, account.LastStep, now)
	if !ok {
		return MFAResult{}, ErrInvalid
	}
	return MFAResult{Step: &step}, nil
}

func (s *Service) mfaSnapshot(ctx context.Context, p authn.Principal, plain, ip string, now time.Time) (Account, error) {
	if len(plain) == 0 || len(plain) > 1024 {
		return Account{}, ErrInvalid
	}
	if err := s.ValidateSession(ctx, p, now); err != nil {
		return Account{}, err
	}
	account, err := s.repo.FindBySubject(ctx, p.Realm, p.Subject)
	if err != nil {
		return Account{}, err
	}
	if account.PasswordHash == nil || !account.Active {
		return Account{}, ErrInvalid
	}
	if err = s.guard.Check(ctx, p.Realm, account.Email, ip); err != nil {
		if errors.Is(err, guard.ErrDenied) {
			return Account{}, ErrInvalid
		}
		return Account{}, err
	}
	select {
	case s.permits <- struct{}{}:
	case <-ctx.Done():
		return Account{}, ctx.Err()
	}
	_, err = s.passwords.Verify(plain, *account.PasswordHash)
	<-s.permits
	if errors.Is(err, password.ErrInvalid) {
		return Account{}, ErrInvalid
	}
	if err != nil {
		return Account{}, err
	}
	return account, nil
}

// BeginMFA returns a temporary base32 secret only after password and live-session checks.
func (s *Service) BeginMFA(ctx context.Context, p authn.Principal, plain, ip string, now time.Time) (Enrollment, error) {
	account, err := s.mfaSnapshot(ctx, p, plain, ip, now)
	if err != nil {
		return Enrollment{}, err
	}
	secret := make([]byte, 20)
	if _, err = rand.Read(secret); err != nil {
		return Enrollment{}, err
	}
	defer clear(secret)
	encoded := base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(secret)
	encrypted, err := s.secrets.Seal(secret, p.Subject)
	if err != nil {
		return Enrollment{}, err
	}
	var expires time.Time
	err = s.repo.ChangeMFA(ctx, account, p, now, func(_ Account, lockedAt time.Time) (MFAChange, error) {
		expires = lockedAt.Add(s.mfa.EnrollmentTTL)
		return MFAChange{Kind: "begin", Secret: &encrypted, ExpiresAt: &expires}, nil
	})
	if err != nil {
		return Enrollment{}, err
	}
	return Enrollment{Secret: encoded, Digits: s.mfa.Digits, PeriodSeconds: int64(s.mfa.Period / time.Second), ExpiresAt: expires}, nil
}
func (s *Service) CancelMFA(ctx context.Context, p authn.Principal, plain, ip string, now time.Time) error {
	account, err := s.mfaSnapshot(ctx, p, plain, ip, now)
	if err != nil {
		return err
	}
	return s.repo.ChangeMFA(ctx, account, p, now, func(Account, time.Time) (MFAChange, error) { return MFAChange{Kind: "cancel"}, nil })
}
func (s *Service) ConfirmMFA(ctx context.Context, p authn.Principal, plain, code, currentCode, ip string, now time.Time) ([]string, error) {
	if len(code) == 0 || len(code) > 64 || len(currentCode) > 64 {
		return nil, ErrInvalid
	}
	account, err := s.mfaSnapshot(ctx, p, plain, ip, now)
	if err != nil {
		return nil, err
	}
	codes, hashes, err := totp.NewRecoveryCodes(s.mfa.RecoveryCount)
	if err != nil {
		return nil, err
	}
	err = s.repo.ChangeMFA(ctx, account, p, now, func(current Account, lockedAt time.Time) (MFAChange, error) {
		if current.PendingSecret == nil || current.PendingExpires == nil || !current.PendingExpires.After(lockedAt) {
			return MFAChange{}, ErrInvalid
		}
		factor, err := s.CheckFactor(current, currentCode, lockedAt)
		if err != nil {
			return MFAChange{}, err
		}
		secret, err := s.secrets.Open(*current.PendingSecret, current.SubjectID)
		if err != nil {
			return MFAChange{}, err
		}
		defer clear(secret)
		step, ok := s.otp.Match(secret, code, nil, lockedAt)
		if !ok {
			return MFAChange{}, ErrInvalid
		}
		return MFAChange{Kind: "confirm", Secret: current.PendingSecret, Step: &step, RecoveryHashes: hashes, CurrentRecoveryHash: factor.RecoveryHash}, nil
	})
	if err != nil {
		return nil, err
	}
	return codes, nil
}
func (s *Service) DisableMFA(ctx context.Context, p authn.Principal, plain, code, ip string, now time.Time) error {
	if p.Realm == authn.RealmIT || len(code) == 0 || len(code) > 64 {
		return ErrInvalid
	}
	account, err := s.mfaSnapshot(ctx, p, plain, ip, now)
	if err != nil {
		return err
	}
	return s.repo.ChangeMFA(ctx, account, p, now, func(current Account, lockedAt time.Time) (MFAChange, error) {
		if !current.MFAEnabled {
			return MFAChange{}, ErrInvalid
		}
		factor, err := s.CheckFactor(current, code, lockedAt)
		if err != nil {
			return MFAChange{}, err
		}
		return MFAChange{Kind: "disable", CurrentRecoveryHash: factor.RecoveryHash}, nil
	})
}

// ChangePassword sets a person's own password after checking the current one, their second factor when it is on,
// and their live session. Every session ends, including the current one.
func (s *Service) ChangePassword(ctx context.Context, p authn.Principal, current, next, code, ip string, minLength int, now time.Time) error {
	if p.Realm == authn.RealmIT || len([]rune(next)) < minLength || len(next) > 1024 || len(code) > 64 {
		return ErrInvalid
	}
	account, err := s.mfaSnapshot(ctx, p, current, ip, now)
	if err != nil {
		return err
	}
	select {
	case s.permits <- struct{}{}:
	case <-ctx.Done():
		return ctx.Err()
	}
	hash, err := s.passwords.Hash(next)
	<-s.permits
	if err != nil {
		return err
	}
	return s.repo.ChangeMFA(ctx, account, p, now, func(locked Account, lockedAt time.Time) (MFAChange, error) {
		factor, err := s.CheckFactor(locked, code, lockedAt)
		if err != nil {
			return MFAChange{}, err
		}
		return MFAChange{Kind: "password", PasswordHash: &hash, Step: factor.Step, CurrentRecoveryHash: factor.RecoveryHash}, nil
	})
}
