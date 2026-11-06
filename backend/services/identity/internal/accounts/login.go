// Package accounts authenticates identity accounts without exposing authentication data to API consumers.
package accounts

import (
	"context"
	"errors"
	"slices"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/password"
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
	Username           *string
	PasswordHash       *string
	Roles              []string
	Active, MFAEnabled bool
	MFASecret          *string
	LastStep           *int64
	PendingSecret      *string
	PendingExpires     *time.Time
}
type MFAResult struct {
	Step         *int64
	RecoveryHash string
}

// Repository completes credential rechecks, MFA updates and session creation in one transaction.
type Repository interface {
	ActiveSession(context.Context, authn.Realm, string, time.Time) (string, []string, error)
	FindBySubject(context.Context, authn.Realm, string) (Account, error)
	ChangeMFA(context.Context, Account, authn.Principal, time.Time, func(Account, time.Time) (MFAChange, error)) error
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
	Seal([]byte, string) (string, error)
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
	mfa       MFAConfig
}

func New(repo Repository, passwords Passwords, secrets SecretReader, otp OTP, sessions *sessions.Service, maxConcurrent int, guard Guard, mfa MFAConfig) (*Service, error) {
	if repo == nil || passwords == nil || secrets == nil || otp == nil || sessions == nil || (maxConcurrent < 1 || maxConcurrent > 64) || guard == nil || mfa.EnrollmentTTL <= 0 || mfa.RecoveryCount < 1 || mfa.RecoveryCount > 64 || (mfa.Digits != 6 && mfa.Digits != 8) || mfa.Period < time.Second || mfa.Period%time.Second != 0 {
		return nil, errors.New("invalid identity account configuration")
	}
	dummy, err := passwords.Hash("identity-dummy-credential")
	if err != nil {
		return nil, err
	}
	return &Service{repo: repo, passwords: passwords, secrets: secrets, otp: otp, sessions: sessions, permits: make(chan struct{}, maxConcurrent), dummyHash: dummy, guard: guard, mfa: mfa}, nil
}

type Input struct {
	Realm                                     authn.Realm
	Email, Password, OTP, ClientIP, UserAgent string
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
	credential.Family.UserAgent, credential.Family.ClientIP = input.UserAgent, input.ClientIP
	locked, err := s.repo.CompleteLogin(ctx, account, replacement, credential, now, func(current Account) (MFAResult, error) {
		return s.CheckFactor(current, input.OTP, now)
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

// ValidateSession checks current account and session state after verifying the access-token signature.
func (s *Service) ValidateSession(ctx context.Context, principal authn.Principal, now time.Time) error {
	if principal.Realm != authn.RealmStaff && principal.Realm != authn.RealmCustomer && principal.Realm != authn.RealmIT {
		return ErrInvalid
	}
	if _, err := uuid.Parse(principal.SessionID); err != nil {
		return ErrInvalid
	}
	subject, roles, err := s.repo.ActiveSession(ctx, principal.Realm, principal.SessionID, now)
	if err != nil {
		return err
	}
	if subject != principal.Subject || !slices.Equal(roles, principal.Roles) {
		return ErrInvalid
	}
	return nil
}
