// Package sessions manages opaque rotating refresh credentials. Only hashes are persisted.
package sessions

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"time"

	"github.com/google/uuid"

	"platform.local/backend/pkg/authn"
)

var (
	ErrInvalid = errors.New("invalid session")
	ErrReuse   = errors.New("refresh token reuse detected")
)

// Family is a login session with an absolute expiry shared by all its refresh tokens.
type Family struct {
	ID        string
	SubjectID string
	Realm     authn.Realm
	ExpiresAt time.Time
}

// Repository must rotate atomically and commit family revocation on reuse, even though it returns ErrReuse.
type Repository interface {
	Create(context.Context, Family, string) error
	Rotate(context.Context, authn.Realm, string, string, time.Time) (Family, error)
	Revoke(context.Context, authn.Realm, string, time.Time) error
	Active(context.Context, authn.Realm, string, time.Time) (Family, error)
}

type Service struct {
	repo Repository
	ttl  time.Duration
}

func New(repo Repository, ttl time.Duration) (*Service, error) {
	if repo == nil || ttl <= 0 {
		return nil, errors.New("invalid session configuration")
	}
	return &Service{repo: repo, ttl: ttl}, nil
}

// Credential contains the one-time plaintext refresh token. Never log or persist Token.
type Credential struct {
	Family Family
	Token  string
}

func userRealm(realm authn.Realm) bool {
	return realm == authn.RealmStaff || realm == authn.RealmCustomer || realm == authn.RealmIT
}

// Start is called only after the login use case completes all authentication requirements, including IT MFA.
func (s *Service) Start(ctx context.Context, realm authn.Realm, subject string, now time.Time) (Credential, error) {
	if !userRealm(realm) || subject == "" {
		return Credential{}, ErrInvalid
	}
	token, err := newToken()
	if err != nil {
		return Credential{}, err
	}
	family := Family{ID: uuid.NewString(), SubjectID: subject, Realm: realm, ExpiresAt: now.Add(s.ttl)}
	if err := s.repo.Create(ctx, family, hash(token)); err != nil {
		return Credential{}, err
	}
	return Credential{Family: family, Token: token}, nil
}

func (s *Service) Refresh(ctx context.Context, realm authn.Realm, token string, now time.Time) (Credential, error) {
	if !userRealm(realm) || !validToken(token) {
		return Credential{}, ErrInvalid
	}
	next, err := newToken()
	if err != nil {
		return Credential{}, err
	}
	family, err := s.repo.Rotate(ctx, realm, hash(token), hash(next), now)
	if err != nil {
		return Credential{}, err
	}
	return Credential{Family: family, Token: next}, nil
}

// Logout revokes the family even if the supplied refresh token was consumed before logout.
func (s *Service) Logout(ctx context.Context, realm authn.Realm, token string, now time.Time) error {
	if !userRealm(realm) || !validToken(token) {
		return ErrInvalid
	}
	return s.repo.Revoke(ctx, realm, hash(token), now)
}

func (s *Service) Active(ctx context.Context, realm authn.Realm, id string, now time.Time) (Family, error) {
	if !userRealm(realm) {
		return Family{}, ErrInvalid
	}
	if _, err := uuid.Parse(id); err != nil {
		return Family{}, ErrInvalid
	}
	return s.repo.Active(ctx, realm, id, now)
}

func newToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(bytes), nil
}
func validToken(token string) bool {
	if len(token) != 43 {
		return false
	}
	decoded, err := base64.RawURLEncoding.Strict().DecodeString(token)
	return err == nil && len(decoded) == 32
}
func hash(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}
