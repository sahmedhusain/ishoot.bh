package accounts_test

import (
	"context"
	"errors"
	"sync/atomic"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/password"
	"platform.local/backend/services/identity/internal/accounts"
	"platform.local/backend/services/identity/internal/sessions"
)

type missingRepo struct{}

func (missingRepo) FindBySubject(context.Context, authn.Realm, string) (accounts.Account, error) {
	return accounts.Account{}, accounts.ErrInvalid
}
func (missingRepo) ChangeMFA(context.Context, accounts.Account, authn.Principal, time.Time, func(accounts.Account, time.Time) (accounts.MFAChange, error)) error {
	return accounts.ErrInvalid
}

func (missingRepo) ActiveSession(context.Context, authn.Realm, string, time.Time) (string, []string, error) {
	return "", nil, accounts.ErrInvalid
}

func (missingRepo) FindByEmail(context.Context, authn.Realm, string) (accounts.Account, error) {
	return accounts.Account{}, accounts.ErrInvalid
}
func (missingRepo) CompleteLogin(context.Context, accounts.Account, *string, sessions.Credential, time.Time, func(accounts.Account) (accounts.MFAResult, error)) (accounts.Account, error) {
	panic("unexpected login")
}

func (missingRepo) RotateAccount(context.Context, authn.Realm, string, string, time.Time) (sessions.Family, accounts.Account, error) {
	return sessions.Family{}, accounts.Account{}, accounts.ErrInvalid
}

type sessionRepo struct{}

func (sessionRepo) Create(context.Context, sessions.Family, string) error { return nil }
func (sessionRepo) Rotate(context.Context, authn.Realm, string, string, time.Time) (sessions.Family, error) {
	return sessions.Family{}, sessions.ErrInvalid
}
func (sessionRepo) Revoke(context.Context, authn.Realm, string, time.Time) error { return nil }
func (sessionRepo) Active(context.Context, authn.Realm, string, time.Time) (sessions.Family, error) {
	return sessions.Family{}, sessions.ErrInvalid
}

type blockingPasswords struct {
	started chan struct{}
	release chan struct{}
	calls   atomic.Int32
}

func (*blockingPasswords) Hash(string) (string, error) { return "dummy", nil }
func (p *blockingPasswords) Verify(_ string, hash string) (bool, error) {
	if hash != "dummy" {
		panic("missing users must use dummy hash")
	}
	p.calls.Add(1)
	p.started <- struct{}{}
	<-p.release
	return false, password.ErrInvalid
}

type noSecrets struct{}

func (noSecrets) Open(string, string) ([]byte, error) { panic("unexpected MFA") }
func (noSecrets) Seal([]byte, string) (string, error) { panic("unexpected MFA") }

type noOTP struct{}

func (noOTP) Match([]byte, string, *int64, time.Time) (int64, bool) { panic("unexpected MFA") }

func TestMissingAccountsUseBoundedDummyVerification(t *testing.T) {
	p := &blockingPasswords{started: make(chan struct{}, 2), release: make(chan struct{})}
	sessionService, err := sessions.New(sessionRepo{}, time.Hour)
	require.NoError(t, err)
	svc, err := accounts.New(missingRepo{}, p, noSecrets{}, noOTP{}, sessionService, 1, allowGuard{}, accounts.MFAConfig{EnrollmentTTL: 10 * time.Minute, RecoveryCount: 10, Digits: 6, Period: 30 * time.Second})
	require.NoError(t, err)
	done := make(chan error, 1)
	go func() {
		_, err := svc.Login(context.Background(), accounts.Input{Realm: authn.RealmStaff, Email: "missing@example.test", Password: "password"}, time.Now())
		done <- err
	}()
	<-p.started
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	_, err = svc.Login(ctx, accounts.Input{Realm: authn.RealmStaff, Email: "other@example.test", Password: "password"}, time.Now())
	require.True(t, errors.Is(err, context.Canceled))
	require.EqualValues(t, 1, p.calls.Load(), "a cancelled waiter must not start another KDF")
	close(p.release)
	require.ErrorIs(t, <-done, accounts.ErrInvalid)
}
