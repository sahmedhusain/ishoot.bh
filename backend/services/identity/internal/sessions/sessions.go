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
	ErrInvalid	= errors.New("invalid session")
	ErrReuse	= errors.New("refresh token reuse detected")
)
type Family struct {
	ID		string
	SubjectID	string
	Realm		authn.Realm
	ExpiresAt	time.Time
	UserAgent, ClientIP	string
}
type Repository interface {
	Create(context.Context, Family, string) error
	Rotate(context.Context, authn.Realm, string, string, time.Time) (Family, error)
	Revoke(context.Context, authn.Realm, string, time.Time) error
	Active(context.Context, authn.Realm, string, time.Time) (Family, error)
}
type Service struct {
	repo		Repository
	customerTTL	time.Duration
	staffTTL	time.Duration
	itTTL		time.Duration
}
type Lifetimes struct {
	Customer	time.Duration
	Staff		time.Duration
	IT		time.Duration
}
func New(repo Repository, ttl time.Duration) (*Service, error) {
	return NewWithLifetimes(repo, Lifetimes{Customer: ttl, Staff: ttl, IT: ttl})
}
func NewWithLifetimes(repo Repository, lifetimes Lifetimes) (*Service, error) {
	if repo == nil || lifetimes.Customer <= 0 || lifetimes.Staff <= 0 || lifetimes.IT <= 0 {
		return nil, errors.New("invalid session configuration")
	}
	return &Service{repo: repo, customerTTL: lifetimes.Customer, staffTTL: lifetimes.Staff, itTTL: lifetimes.IT}, nil
}
type Credential struct {
	Family	Family
	Token	string
}
func userRealm(realm authn.Realm) bool {
	return realm == authn.RealmStaff || realm == authn.RealmCustomer || realm == authn.RealmIT
}
func (s *Service) Prepare(realm authn.Realm, subject string, now time.Time) (Credential, error) {
	if !userRealm(realm) || subject == "" {
		return Credential{}, ErrInvalid
	}
	token, err := newToken()
	if err != nil {
		return Credential{}, err
	}
	ttl := s.staffTTL
	switch realm {
	case authn.RealmCustomer:
		ttl = s.customerTTL
	case authn.RealmIT:
		ttl = s.itTTL
	}
	return Credential{Family: Family{ID: uuid.NewString(), SubjectID: subject, Realm: realm, ExpiresAt: now.Add(ttl)}, Token: token}, nil
}
func (c Credential) Digest() string	{ return hash(c.Token) }
func (s *Service) Start(ctx context.Context, realm authn.Realm, subject string, now time.Time) (Credential, error) {
	credential, err := s.Prepare(realm, subject, now)
	if err != nil {
		return Credential{}, err
	}
	if err := s.repo.Create(ctx, credential.Family, credential.Digest()); err != nil {
		return Credential{}, err
	}
	return credential, nil
}
func (s *Service) PrepareRotation(realm authn.Realm, token string) (string, Credential, error) {
	if !userRealm(realm) || !validToken(token) {
		return "", Credential{}, ErrInvalid
	}
	next, err := newToken()
	if err != nil {
		return "", Credential{}, err
	}
	return hash(token), Credential{Token: next}, nil
}
func (s *Service) Refresh(ctx context.Context, realm authn.Realm, token string, now time.Time) (Credential, error) {
	oldHash, next, err := s.PrepareRotation(realm, token)
	if err != nil {
		return Credential{}, err
	}
	family, err := s.repo.Rotate(ctx, realm, oldHash, next.Digest(), now)
	if err != nil {
		return Credential{}, err
	}
	next.Family = family
	return next, nil
}
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
