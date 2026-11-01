// Package accounts authenticates identity accounts without exposing authentication data to API consumers.
package accounts

import (
	"context"
	"errors"
	"strings"
	"time"
	"unicode/utf8"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/password"
	"platform.local/backend/pkg/totp"
	"platform.local/backend/services/identity/internal/guard"
	"platform.local/backend/services/identity/internal/sessions"
)

var (
	ErrInvalid     = errors.New("invalid credentials")
	ErrMFARequired = errors.New("authentication code required")
)

type Account struct {
	Realm              authn.Realm
	SubjectID, Email   string
	PasswordHash       *string
	Roles              []string
	Active, MFAEnabled bool
	MFASecret          *string
	LastStep           *int64
}
type MFAResult struct {
	Step         *int64
	RecoveryHash string
}

// Repository completes credential rechecks, MFA updates and session creation in one transaction.
type Repository interface {
	FindByEmail(context.Context, authn.Realm, string) (Account, error)
	CompleteLogin(context.Context, Account, *string, sessions.Credential, time.Time, func(Account) (MFAResult, error)) (Account, error)
	RotateAccount(context.Context, authn.Realm, string, string, time.Time) (sessions.Family, Account, error)
}
type Passwords interface {
	Hash(string) (string, error)
	Verify(string, string) (bool, error)
}
type SecretReader interface {
	Open(string, string) ([]byte, error)
}
type Guard interface {
	Check(context.Context, authn.Realm, string, string) error
}

type OTP interface {
	Match([]byte, string, *int64, time.Time) (int64, bool)
}

type Service struct {
	repo      Repository
	passwords Passwords
	secrets   SecretReader
	otp       OTP
	sessions  *sessions.Service
	permits   chan struct{}
	dummyHash string
	guard     Guard
}

func New(repo Repository, passwords Passwords, secrets SecretReader, otp OTP, sessions *sessions.Service, maxConcurrent int, guard Guard) (*Service, error) {
	if repo == nil || passwords == nil || secrets == nil || otp == nil || sessions == nil || (maxConcurrent < 1 || maxConcurrent > 64) || guard == nil {
		return nil, errors.New("invalid identity account configuration")
	}
	dummy, err := passwords.Hash("identity-dummy-credential")
	if err != nil {
		return nil, err
	}
	return &Service{repo: repo, passwords: passwords, secrets: secrets, otp: otp, sessions: sessions, permits: make(chan struct{}, maxConcurrent), dummyHash: dummy, guard: guard}, nil
}

type Input struct {
	Realm                          authn.Realm
	Email, Password, OTP, ClientIP string
}
type Result struct {
	Account    Account
	Credential sessions.Credential
}

// Login enforces rate limits and bounds simultaneous password KDF work before opening the account transaction.
func (s *Service) Login(ctx context.Context, input Input, now time.Time) (Result, error) {
	if input.Realm != authn.RealmStaff && input.Realm != authn.RealmCustomer && input.Realm != authn.RealmIT {
		return Result{}, ErrInvalid
	}
	email := strings.ToLower(strings.TrimSpace(input.Email))
	if len(email) == 0 || len(email) > 254 || !utf8.ValidString(email) || strings.IndexByte(email, 0) >= 0 || len(input.Password) == 0 || len(input.Password) > 1024 || len(input.OTP) > 64 {
		return Result{}, ErrInvalid
	}
	if err := s.guard.Check(ctx, input.Realm, email, input.ClientIP); err != nil {
		if errors.Is(err, guard.ErrDenied) {
			return Result{}, ErrInvalid
		}
		return Result{}, err
	}
	account, err := s.repo.FindByEmail(ctx, input.Realm, email)
	missing := errors.Is(err, ErrInvalid)
	if err != nil && !missing {
		return Result{}, err
	}
	encoded := s.dummyHash
	if !missing && account.PasswordHash != nil {
		encoded = *account.PasswordHash
	}
	select {
	case s.permits <- struct{}{}:
	case <-ctx.Done():
		return Result{}, ctx.Err()
	}
	upgrade, verifyErr := s.passwords.Verify(input.Password, encoded)
	var replacement *string
	if verifyErr == nil && !missing && account.PasswordHash != nil && account.Active && upgrade {
		hash, hashErr := s.passwords.Hash(input.Password)
		if hashErr != nil {
			<-s.permits
			return Result{}, hashErr
		}
		replacement = &hash
	}
	<-s.permits
	if missing || account.PasswordHash == nil || !account.Active || errors.Is(verifyErr, password.ErrInvalid) {
		return Result{}, ErrInvalid
	}
	if verifyErr != nil {
		return Result{}, verifyErr
	}
	credential, err := s.sessions.Prepare(input.Realm, account.SubjectID, now)
	if err != nil {
		return Result{}, err
	}
	locked, err := s.repo.CompleteLogin(ctx, account, replacement, credential, now, func(current Account) (MFAResult, error) {
		if current.Realm == authn.RealmIT && !current.MFAEnabled {
			return MFAResult{}, ErrInvalid
		}
		if !current.MFAEnabled {
			return MFAResult{}, nil
		}
		if input.OTP == "" {
			return MFAResult{}, ErrMFARequired
		}
		if hash, ok := totp.RecoveryHash(input.OTP); ok {
			return MFAResult{RecoveryHash: hash}, nil
		}
		if current.MFASecret == nil {
			return MFAResult{}, ErrInvalid
		}
		secret, err := s.secrets.Open(*current.MFASecret, current.SubjectID)
		if err != nil {
			return MFAResult{}, err
		}
		step, ok := s.otp.Match(secret, input.OTP, current.LastStep, now)
		if !ok {
			return MFAResult{}, ErrInvalid
		}
		return MFAResult{Step: &step}, nil
	})
	if err != nil {
		return Result{}, err
	}
	return Result{Account: locked, Credential: credential}, nil
}

// Refresh atomically checks account status and rotates the credential; the current account roles accompany it.
func (s *Service) Refresh(ctx context.Context, realm authn.Realm, token string, now time.Time) (Result, error) {
	oldHash, next, err := s.sessions.PrepareRotation(realm, token)
	if err != nil {
		return Result{}, err
	}
	family, account, err := s.repo.RotateAccount(ctx, realm, oldHash, next.Digest(), now)
	if err != nil {
		return Result{}, err
	}
	next.Family = family
	return Result{Account: account, Credential: next}, nil
}
