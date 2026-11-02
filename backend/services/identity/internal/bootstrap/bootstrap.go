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
	"regexp"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/authz"
	"platform.local/backend/pkg/catalog"
	"platform.local/backend/pkg/db"
	"platform.local/backend/pkg/outbox"
	"platform.local/backend/pkg/totp"
	"platform.local/backend/services/identity/internal/accounts"
	"platform.local/backend/services/identity/internal/postgres/sqlcdb"
)

// ErrExists means an IT account already exists; bootstrapping runs once per installation.
var ErrExists = errors.New("an IT account already exists; create further accounts from the IT dashboard")

// ErrRecoveryTarget refuses creating, reactivating or promoting an account during break-glass recovery.
var ErrRecoveryTarget = errors.New("recovery requires an existing active IT administrator")

var operatorID = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9:._/-]{0,190}$`)

// AccountLock serialises IT account changes, including checks that retain the last administrator.
const AccountLock = 0x1d_b007

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
	SubjectID     string   `json:"subjectId"`
	Secret        string   `json:"secret"`
	OTPAuthURL    string   `json:"otpAuthUrl"`
	RecoveryCodes []string `json:"recoveryCodes"`
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
	return provision(ctx, pool, hasher, sealer, in, now, "", nil)
}

// CreateITAccount provisions a further account for an authorized IT administrator, with a fresh factor.
func CreateITAccount(ctx context.Context, pool *pgxpool.Pool, hasher Hasher, sealer Sealer, in Input, now time.Time, actor authn.Principal) (Result, error) {
	if actor.Realm != authn.RealmIT || !authz.Allowed(catalog.ITAccess, actor, "it_accounts", "create") {
		return Result{}, accounts.ErrForbidden
	}
	return provision(ctx, pool, hasher, sealer, in, now, "", &actor)
}

// RecoverITAdmin replaces an existing administrator's password and factor and ends every session. It is an offline
// operator command, never an HTTP endpoint; actorID identifies the operator in the audit trail.
func RecoverITAdmin(ctx context.Context, pool *pgxpool.Pool, hasher Hasher, sealer Sealer, in Input, now time.Time, actorID string) (Result, error) {
	if !operatorID.MatchString(actorID) {
		return Result{}, errors.New("an operator ID (1 to 191 letters, digits or :._/-) is required")
	}
	in.Role = "it_admin"
	return provision(ctx, pool, hasher, sealer, in, now, actorID, nil)
}

func provision(ctx context.Context, pool *pgxpool.Pool, hasher Hasher, sealer Sealer, in Input, now time.Time, actorID string, creator *authn.Principal) (Result, error) {
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
	codes, hashes, err := totp.NewRecoveryCodes(in.RecoveryCount)
	if err != nil {
		return Result{}, err
	}
	err = db.WithTx(ctx, pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, "SELECT pg_advisory_xact_lock($1)", AccountLock); err != nil {
			return err
		}
		q := sqlcdb.New(tx)
		switch {
		case creator != nil:
			if err := accounts.CheckITAccess(ctx, q, *creator, "it_accounts", "create", now); err != nil {
				return err
			}
		case actorID == "":
			n, err := q.CountRealmAccounts(ctx, string(authn.RealmIT))
			if err != nil {
				return err
			}
			if n > 0 {
				return ErrExists
			}
		default:
			target, err := q.FindAccountByEmail(ctx, sqlcdb.FindAccountByEmailParams{Realm: string(authn.RealmIT), Email: in.Email})
			if errors.Is(err, pgx.ErrNoRows) {
				return ErrRecoveryTarget
			}
			if err != nil {
				return err
			}
			target, err = q.LockAccount(ctx, sqlcdb.LockAccountParams{Realm: target.Realm, SubjectID: target.SubjectID})
			if err != nil {
				return err
			}
			if !target.Active || !slices.Contains(target.Roles, "it_admin") {
				return ErrRecoveryTarget
			}
			subject = target.SubjectID
		}
		sealed, err := sealer.Seal(secret, subject)
		if err != nil {
			return err
		}
		verb, actor := "created", "identity:bootstrap-it"
		if creator != nil {
			actor = "it:" + creator.Subject
		}
		if actorID == "" {
			if err := q.InsertAccount(ctx, sqlcdb.InsertAccountParams{
				Realm: string(authn.RealmIT), SubjectID: subject, Email: in.Email, PasswordHash: &hash,
				Roles: []string{in.Role}, MfaEnabled: true, MfaSecretEncrypted: &sealed, Now: now,
			}); err != nil {
				return err
			}
		} else {
			verb, actor = "recovered", "operator:"+actorID
			if err := q.UpdateAccountHash(ctx, sqlcdb.UpdateAccountHashParams{Realm: string(authn.RealmIT), SubjectID: subject, PasswordHash: &hash, UpdatedAt: now}); err != nil {
				return err
			}
			if err := q.SetMFAState(ctx, sqlcdb.SetMFAStateParams{Realm: string(authn.RealmIT), SubjectID: subject, MfaEnabled: true, MfaSecretEncrypted: &sealed, UpdatedAt: now}); err != nil {
				return err
			}
			if err := q.DeleteAccountRecovery(ctx, sqlcdb.DeleteAccountRecoveryParams{Realm: string(authn.RealmIT), SubjectID: subject}); err != nil {
				return err
			}
			if err := q.RevokeSubjectSessions(ctx, sqlcdb.RevokeSubjectSessionsParams{Realm: string(authn.RealmIT), SubjectID: subject, RevokedAt: &now}); err != nil {
				return err
			}
		}
		for _, h := range hashes {
			if err := q.InsertAccountRecovery(ctx, sqlcdb.InsertAccountRecoveryParams{Realm: string(authn.RealmIT), SubjectID: subject, CodeHash: h}); err != nil {
				return err
			}
		}
		return outbox.Enqueue(ctx, tx, "identity", outbox.Event{Subject: "identity.user." + verb, Payload: map[string]any{
			"subjectId": subject, "realm": authn.RealmIT, "changedBy": actor,
		}})
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
