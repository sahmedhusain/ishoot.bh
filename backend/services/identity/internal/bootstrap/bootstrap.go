// Package bootstrap creates the first IT account. IT sign-in requires an enrolled authenticator and enrolling needs a
// session, so the first account is created with its factor already enrolled; later IT accounts are created from
// the IT dashboard.
package bootstrap

import (
	"context"
	"crypto/rand"
	"encoding/base32"
	"errors"
	"fmt"
	"net/mail"
	"net/url"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/catalog"
	"platform.local/backend/pkg/db"
	"platform.local/backend/pkg/totp"
	"platform.local/backend/services/identity/internal/postgres/sqlcdb"
)

// ErrExists means an IT account already exists; bootstrapping runs once per installation.
var ErrExists = errors.New("an IT account already exists; create further accounts from the IT dashboard")

// lockKey serialises concurrent bootstraps (pg_advisory_xact_lock).
const lockKey = 0x1d_b007

// Hasher hashes passwords (pkg/password).
type Hasher interface {
	Hash(password string) (string, error)
}

// Sealer encrypts authenticator secrets (pkg/secrets).
type Sealer interface {
	Seal(plaintext []byte, context string) (string, error)
}

// Input describes the account to create.
type Input struct {
	Email, Password, Role string
	MinPasswordLength     int
	RecoveryCount         int
	// Issuer and Digits/Period label the authenticator entry.
	Issuer string
	Digits int
	Period time.Duration
}

// Result is shown once to the operator and never stored in plain text.
type Result struct {
	SubjectID     string
	Secret        string
	OTPAuthURL    string
	RecoveryCodes []string
}

// Validate checks the input before anything is hashed or written.
func (in Input) Validate() error {
	addr, err := mail.ParseAddress(in.Email)
	switch {
	case err != nil || addr.Address != in.Email || len(in.Email) > 254:
		return errors.New("a valid e-mail address is required")
	case len(in.Password) < in.MinPasswordLength || len(in.Password) > 1024:
		return fmt.Errorf("the password must be %d to 1024 characters", in.MinPasswordLength)
	case !slices.Contains(catalog.ITAccess.Roles, in.Role):
		return fmt.Errorf("unknown IT role %q", in.Role)
	}
	return nil
}

// CreateITAdmin creates the first IT account with an enrolled authenticator and recovery codes.
func CreateITAdmin(ctx context.Context, pool *pgxpool.Pool, hasher Hasher, sealer Sealer, in Input, now time.Time) (Result, error) {
	in.Email = strings.ToLower(strings.TrimSpace(in.Email))
	if err := in.Validate(); err != nil {
		return Result{}, err
	}
	hash, err := hasher.Hash(in.Password)
	if err != nil {
		return Result{}, err
	}
	secret := make([]byte, 20)
	if _, err = rand.Read(secret); err != nil {
		return Result{}, err
	}
	defer clear(secret)
	subject := uuid.NewString()
	sealed, err := sealer.Seal(secret, subject)
	if err != nil {
		return Result{}, err
	}
	codes, hashes, err := totp.NewRecoveryCodes(in.RecoveryCount)
	if err != nil {
		return Result{}, err
	}
	err = db.WithTx(ctx, pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, "SELECT pg_advisory_xact_lock($1)", lockKey); err != nil {
			return err
		}
		q := sqlcdb.New(tx)
		n, err := q.CountRealmAccounts(ctx, string(authn.RealmIT))
		if err != nil {
			return err
		}
		if n > 0 {
			return ErrExists
		}
		if err := q.InsertAccount(ctx, sqlcdb.InsertAccountParams{
			Realm: string(authn.RealmIT), SubjectID: subject, Email: in.Email, PasswordHash: &hash,
			Roles: []string{in.Role}, MfaEnabled: true, MfaSecretEncrypted: &sealed, Now: now,
		}); err != nil {
			return err
		}
		for _, h := range hashes {
			if err := q.InsertAccountRecovery(ctx, sqlcdb.InsertAccountRecoveryParams{Realm: string(authn.RealmIT), SubjectID: subject, CodeHash: h}); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return Result{}, err
	}
	encoded := base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(secret)
	return Result{SubjectID: subject, Secret: encoded, OTPAuthURL: otpAuthURL(in, encoded), RecoveryCodes: codes}, nil
}

// otpAuthURL is the Key URI Format authenticator apps read from a QR code or a pasted link.
func otpAuthURL(in Input, secret string) string {
	query := url.Values{
		"secret": {secret}, "issuer": {in.Issuer}, "algorithm": {"SHA1"},
		"digits": {strconv.Itoa(in.Digits)}, "period": {strconv.Itoa(int(in.Period / time.Second))},
	}
	label := url.PathEscape(in.Issuer + ":" + in.Email)
	return "otpauth://totp/" + label + "?" + query.Encode()
}
