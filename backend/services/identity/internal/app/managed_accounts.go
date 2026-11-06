package app

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"net/mail"
	"slices"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/db"
	"platform.local/backend/pkg/outbox"
	"platform.local/backend/services/identity/internal/bootstrap"
	"platform.local/backend/services/identity/internal/postgres/sqlcdb"
)

var (
	// ErrEmailTaken means another account of the realm already uses the address.
	ErrEmailTaken     = errors.New("email already used by another account")
	ErrLastStaffAdmin = errors.New("the last active staff administrator must be retained")
	// ErrResetInvalid means a reset token is unknown, used or expired.
	ErrResetInvalid = errors.New("password reset token is invalid or expired")
)

// ManagedAccounts keeps the staff and customer accounts the apps own the profiles of: the app pushes each account's
// address, roles and active state, while identity owns its credentials (password, MFA, password resets).
type ManagedAccounts struct {
	pool        *pgxpool.Pool
	hasher      bootstrap.Hasher
	minPassword int
	resetTTL    time.Duration
	permits     chan struct{}
	limit       func(context.Context, authn.Realm, string, string, string) error
	now         func() time.Time
}

// NewManagedAccounts returns the use cases; maxConcurrent bounds password hashing.
func NewManagedAccounts(pool *pgxpool.Pool, hasher bootstrap.Hasher, minPassword int, resetTTL time.Duration, maxConcurrent int, limit func(context.Context, authn.Realm, string, string, string) error) *ManagedAccounts {
	return &ManagedAccounts{pool: pool, hasher: hasher, minPassword: minPassword, resetTTL: resetTTL,
		limit: limit, permits: make(chan struct{}, maxConcurrent), now: func() time.Time { return time.Now().UTC() }}
}

// AccountInput is what the app owns about an account.
type AccountInput struct {
	Email    string
	Username string
	Roles    []string
	Active   bool
}

func managedRealm(r authn.Realm) bool { return r == authn.RealmStaff || r == authn.RealmCustomer || r == authn.RealmIT }

func normalizeEmail(email string) (string, bool) {
	email = strings.ToLower(strings.TrimSpace(email))
	addr, err := mail.ParseAddress(email)
	return email, err == nil && addr.Address == email && len(email) <= 254
}

func validID(id string) bool {
	return id != "" && len(id) <= 200 && !strings.ContainsAny(id, " \t\r\n")
}

func uniqueViolation(err error) bool {
	var pg *pgconn.PgError
	return errors.As(err, &pg) && pg.Code == "23505"
}

// Sync creates or updates an account as the app describes it. Turning an account off or changing its roles signs
// it out everywhere. It returns whether the account was new. by names who made the change.
func (s *ManagedAccounts) Sync(ctx context.Context, realm authn.Realm, id string, in AccountInput, by string) (bool, error) {
	email, ok := normalizeEmail(in.Email)
	if !managedRealm(realm) || !validID(id) || !ok || len(in.Roles) > 20 {
		return false, ErrValidation
	}
	roles := slices.Clone(in.Roles)
	if roles == nil {
		roles = []string{}
	}
	created := false
	err := db.WithTx(ctx, s.pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, "SELECT pg_advisory_xact_lock($1)", bootstrap.AccountLock); err != nil {
			return err
		}
		q := sqlcdb.New(tx)
		now := s.now()
		before, err := q.LockAccount(ctx, sqlcdb.LockAccountParams{Realm: string(realm), SubjectID: id})
		created = errors.Is(err, pgx.ErrNoRows)
		if err != nil && !created {
			return err
		}
		if !created && realm == authn.RealmStaff && before.Active && before.PasswordHash != nil && slices.Contains(before.Roles, "super_admin") && (!in.Active || !slices.Contains(roles, "super_admin")) {
			count, err := q.CountActiveStaffAdmins(ctx)
			if err != nil {
				return err
			}
			if count <= 1 {
				return ErrLastStaffAdmin
			}
		}
		var u *string
		if in.Username != "" {
			trimmed := strings.ToUpper(strings.TrimSpace(in.Username))
			u = &trimmed
		}
		sameUsername := (u == nil && before.Username == nil) || (u != nil && before.Username != nil && *u == *before.Username)
		if !created && before.Email == email && before.Active == in.Active && slices.Equal(before.Roles, roles) && sameUsername {
			if realm == authn.RealmStaff {
				return q.EnsureStaffAccess(ctx, id)
			}
			return nil
		}
		if err := q.UpsertManagedAccount(ctx, sqlcdb.UpsertManagedAccountParams{Realm: string(realm), SubjectID: id,
			Email: email, Username: u, Roles: roles, Active: in.Active, Now: now}); err != nil {
			if uniqueViolation(err) {
				return ErrEmailTaken
			}
			return err
		}
		if realm == authn.RealmStaff {
			if err := q.EnsureStaffAccess(ctx, id); err != nil {
				return err
			}
		}
		if !created && (before.Active && !in.Active || !slices.Equal(before.Roles, roles)) {
			if err := q.RevokeSubjectSessions(ctx, sqlcdb.RevokeSubjectSessionsParams{Realm: string(realm), SubjectID: id, RevokedAt: &now}); err != nil {
				return err
			}
		}
		if !created && (before.Email != email || !in.Active) {
			if err := deleteResetLinks(ctx, q, realm, id); err != nil {
				return err
			}
		}
		subject := "identity.user.changed"
		if created {
			subject = "identity.user.created"
		}
		return outbox.Enqueue(ctx, tx, "identity", outbox.Event{Subject: subject, Payload: map[string]any{
			"subjectId": id, "realm": realm, "changedBy": by,
		}})
	})
	return created, err
}

func (s *ManagedAccounts) hash(ctx context.Context, realm authn.Realm, password string) (string, error) {
	minimum := s.minPassword
	if realm == authn.RealmCustomer {
		minimum = 8
	}
	if len([]rune(password)) < minimum || len(password) > 1024 {
		return "", ErrValidation
	}
	select {
	case s.permits <- struct{}{}:
		defer func() { <-s.permits }()
	case <-ctx.Done():
		return "", ctx.Err()
	}
	return s.hasher.Hash(password)
}

// setPassword stores a new hash, ends every session except keep (a person changing their own password stays signed
// in) and cancels open reset links.
func setPassword(ctx context.Context, q *sqlcdb.Queries, realm authn.Realm, id, hash, keep string, now time.Time) error {
	if err := q.UpdateAccountHash(ctx, sqlcdb.UpdateAccountHashParams{Realm: string(realm), SubjectID: id, PasswordHash: &hash, UpdatedAt: now}); err != nil {
		return err
	}
	if err := q.SetMFAPending(ctx, sqlcdb.SetMFAPendingParams{Realm: string(realm), SubjectID: id, UpdatedAt: now}); err != nil {
		return err
	}
	var err error
	if keep != "" {
		err = q.RevokeOtherSubjectSessions(ctx, sqlcdb.RevokeOtherSubjectSessionsParams{Realm: string(realm), SubjectID: id, KeepID: keep, RevokedAt: &now})
	} else {
		err = q.RevokeSubjectSessions(ctx, sqlcdb.RevokeSubjectSessionsParams{Realm: string(realm), SubjectID: id, RevokedAt: &now})
	}
	if err != nil {
		return err
	}
	return deleteResetLinks(ctx, q, realm, id)
}

// SetPassword sets an account's password (an administrator, an import, or the person after confirming their old one).
func (s *ManagedAccounts) SetPassword(ctx context.Context, realm authn.Realm, id, password, keepSession, by string) error {
	if !managedRealm(realm) || !validID(id) || len(keepSession) > 64 {
		return ErrValidation
	}
	hash, err := s.hash(ctx, realm, password)
	if err != nil {
		return err
	}
	return db.WithTx(ctx, s.pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		q := sqlcdb.New(tx)
		if _, err := q.LockAccount(ctx, sqlcdb.LockAccountParams{Realm: string(realm), SubjectID: id}); errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		} else if err != nil {
			return err
		}
		if err := setPassword(ctx, q, realm, id, hash, keepSession, s.now()); err != nil {
			return err
		}
		return outbox.Enqueue(ctx, tx, "identity", outbox.Event{Subject: "identity.user.changed", Payload: map[string]any{
			"subjectId": id, "realm": realm, "changedBy": by,
		}})
	})
}

// ResetMFA turns two-step sign-in off for an account (an administrator helping someone who lost their device) and
// signs it out everywhere.
func (s *ManagedAccounts) ResetMFA(ctx context.Context, realm authn.Realm, id, by string) error {
	if !managedRealm(realm) || !validID(id) {
		return ErrValidation
	}
	return db.WithTx(ctx, s.pool, pgx.TxOptions{}, func(tx pgx.Tx) error { return resetManagedMFA(ctx, tx, realm, id, by) })
}
func resetManagedMFA(ctx context.Context, tx pgx.Tx, realm authn.Realm, id, by string) error {
	q := sqlcdb.New(tx)
	account, err := q.LockAccount(ctx, sqlcdb.LockAccountParams{Realm: string(realm), SubjectID: id})
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	if !account.MfaEnabled && account.MfaPendingSecretEncrypted == nil {
		return nil
	}
	now := time.Now().UTC()
	if err := q.SetMFAState(ctx, sqlcdb.SetMFAStateParams{Realm: string(realm), SubjectID: id, MfaEnabled: false, UpdatedAt: now}); err != nil {
		return err
	}
	if err := q.DeleteAccountRecovery(ctx, sqlcdb.DeleteAccountRecoveryParams{Realm: string(realm), SubjectID: id}); err != nil {
		return err
	}
	if err := q.RevokeSubjectSessions(ctx, sqlcdb.RevokeSubjectSessionsParams{Realm: string(realm), SubjectID: id, RevokedAt: &now}); err != nil {
		return err
	}
	return outbox.Enqueue(ctx, tx, "identity", outbox.Event{Subject: "identity.mfa.changed", Payload: map[string]any{
		"subjectId": id, "realm": realm, "changedBy": by, "operation": "disable",
	}})
}

// ResetRequest is a reset link's token, returned once to the app that e-mails it.
type ResetRequest struct {
	Email     string    `json:"email"`
	SubjectID string    `json:"subjectId"`
	Token     string    `json:"token"`
	ExpiresAt time.Time `json:"expiresAt"`
}

func tokenHash(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

// RequestReset issues a reset token for an active account with the address, replacing any earlier open one.
// ErrNotFound for an unknown or inactive address: the app answers the person the same way either way.
func (s *ManagedAccounts) RequestReset(ctx context.Context, realm authn.Realm, email, ip string) (ResetRequest, error) {
	if s.limit == nil {
		return ResetRequest{}, ErrPolicyUnavailable
	}
	if err := s.limit(ctx, realm, "reset", email, ip); err != nil {
		return ResetRequest{}, err
	}
	email, ok := normalizeEmail(email)
	if !managedRealm(realm) || !ok {
		return ResetRequest{}, ErrValidation
	}
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return ResetRequest{}, err
	}
	out := ResetRequest{Token: base64.RawURLEncoding.EncodeToString(raw)}
	err := db.WithTx(ctx, s.pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		q := sqlcdb.New(tx)
		id, err := q.FindActiveAccountByEmail(ctx, sqlcdb.FindActiveAccountByEmailParams{Realm: string(realm), Email: email})
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		if err != nil {
			return err
		}
		account, err := q.LockAccount(ctx, sqlcdb.LockAccountParams{Realm: string(realm), SubjectID: id})
		if err != nil {
			return err
		}
		if !account.Active || account.Email != email {
			return ErrNotFound
		}
		now := s.now()
		out.SubjectID, out.ExpiresAt, out.Email = id, now.Add(s.resetTTL), account.Email
		if err := deleteResetLinks(ctx, q, realm, id); err != nil {
			return err
		}
		if err := q.InsertPasswordReset(ctx, sqlcdb.InsertPasswordResetParams{TokenHash: tokenHash(out.Token), Realm: string(realm),
			SubjectID: id, ExpiresAt: out.ExpiresAt, CreatedAt: now}); err != nil {
			return err
		}
		return outbox.Enqueue(ctx, tx, "identity", outbox.Event{Subject: "identity.password_reset.created", Payload: map[string]any{"subjectId": id, "realm": realm, "changedBy": "service:identity"}})
	})
	return out, err
}

// ConfirmReset uses a reset token once to set a new password, signing the account out everywhere.
func (s *ManagedAccounts) ConfirmReset(ctx context.Context, realm authn.Realm, token, password string, legacyEmail ...string) (string, error) {
	if !managedRealm(realm) || (len(token) != 43 && len(token) != 64) {
		return "", ErrResetInvalid
	}
	ip := ""
	if len(legacyEmail) > 1 {
		ip = legacyEmail[1]
	}
	key := token
	if len(token) == 64 && len(legacyEmail) > 0 {
		key = legacyEmail[0]
	}
	if s.limit == nil {
		return "", ErrPolicyUnavailable
	}
	if err := s.limit(ctx, realm, "reset-confirm", key, ip); err != nil {
		return "", err
	}
	hash, err := s.hash(ctx, realm, password)
	if err != nil {
		return "", err
	}
	if len(token) == 64 {
		if realm != authn.RealmStaff || len(legacyEmail) < 1 {
			return "", ErrResetInvalid
		}
		if _, err := hex.DecodeString(token); err != nil {
			return "", ErrResetInvalid
		}
		return s.confirmImportedReset(ctx, legacyEmail[0], token, hash)
	}
	var id string
	err = db.WithTx(ctx, s.pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		q := sqlcdb.New(tx)
		id, err = q.PasswordResetSubject(ctx, sqlcdb.PasswordResetSubjectParams{TokenHash: tokenHash(token), Realm: string(realm)})
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrResetInvalid
		}
		if err != nil {
			return err
		}
		account, err := q.LockAccount(ctx, sqlcdb.LockAccountParams{Realm: string(realm), SubjectID: id})
		if err != nil {
			return err
		}
		if len(legacyEmail) > 0 && legacyEmail[0] != "" {
			email, ok := normalizeEmail(legacyEmail[0])
			if !ok || email != account.Email {
				return ErrResetInvalid
			}
		}
		if !account.Active {
			return ErrResetInvalid
		}
		now := s.now()
		id, err = q.ConsumePasswordReset(ctx, sqlcdb.ConsumePasswordResetParams{TokenHash: tokenHash(token), Realm: string(realm), Now: &now})
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrResetInvalid
		}
		if err != nil {
			return err
		}
		if err := setPassword(ctx, q, realm, id, hash, "", now); err != nil {
			return err
		}
		return outbox.Enqueue(ctx, tx, "identity", outbox.Event{Subject: "identity.user.changed", Payload: map[string]any{
			"subjectId": id, "realm": realm, "changedBy": string(realm) + ":" + id,
		}})
	})
	return id, err
}

// RegisterCustomer creates the customer credential and its audit record in one transaction.
func (s *ManagedAccounts) RegisterCustomer(ctx context.Context, email, password, by, ip string) (string, error) {
	email, ok := normalizeEmail(email)
	if !ok {
		return "", ErrValidation
	}
	if s.limit == nil {
		return "", ErrPolicyUnavailable
	}
	if err := s.limit(ctx, authn.RealmCustomer, "signup", email, ip); err != nil {
		return "", err
	}
	hash, err := s.hash(ctx, authn.RealmCustomer, password)
	if err != nil {
		return "", err
	}
	id := uuid.NewString()
	err = db.WithTx(ctx, s.pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		if err := sqlcdb.New(tx).RegisterCustomer(ctx, sqlcdb.RegisterCustomerParams{SubjectID: id, Email: email, PasswordHash: &hash}); err != nil {
			if uniqueViolation(err) {
				return ErrEmailTaken
			}
			return err
		}
		return outbox.Enqueue(ctx, tx, "identity", outbox.Event{Subject: "identity.user.created", Payload: map[string]any{"subjectId": id, "realm": "customer", "changedBy": by}})
	})
	return id, err
}

// All outstanding proofs are invalidated together after a password, address or activation change.
func deleteResetLinks(ctx context.Context, q *sqlcdb.Queries, realm authn.Realm, id string) error {
	if err := q.CancelLegacyResetChallenges(ctx, sqlcdb.CancelLegacyResetChallengesParams{Realm: string(realm), SubjectID: id}); err != nil {
		return err
	}
	return q.DeleteOpenPasswordResets(ctx, sqlcdb.DeleteOpenPasswordResetsParams{Realm: string(realm), SubjectID: id})
}

func (s *ManagedAccounts) confirmImportedReset(ctx context.Context, email, token, hash string) (string, error) {
	email, ok := normalizeEmail(email)
	if !ok {
		return "", ErrResetInvalid
	}
	select {
	case s.permits <- struct{}{}:
		defer func() { <-s.permits }()
	case <-ctx.Done():
		return "", ctx.Err()
	}
	var id string
	rejected := true
	err := db.WithTx(ctx, s.pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		q := sqlcdb.New(tx)
		var err error
		id, err = q.FindActiveAccountByEmail(ctx, sqlcdb.FindActiveAccountByEmailParams{Realm: "staff", Email: email})
		if errors.Is(err, pgx.ErrNoRows) {
			return nil
		}
		if err != nil {
			return err
		}
		a, err := q.LockAccount(ctx, sqlcdb.LockAccountParams{Realm: "staff", SubjectID: id})
		if err != nil {
			return err
		}
		if !a.Active || a.Email != email {
			return nil
		}
		proofs, err := q.LockLegacyResetChallenges(ctx, id)
		if err != nil {
			return err
		}
		for _, proof := range proofs {
			cost, err := bcrypt.Cost([]byte(proof.CodeHash))
			if err != nil || cost > 16 {
				return ErrResetInvalid
			}
			verified := bcrypt.CompareHashAndPassword([]byte(proof.CodeHash), []byte(token)) == nil
			if err := q.FailLegacyResetChallenge(ctx, proof.ID); err != nil {
				return err
			}
			if err := outbox.Enqueue(ctx, tx, "identity", outbox.Event{Subject: "identity.challenge.changed", Payload: map[string]any{"challengeId": proof.ID, "realm": "staff", "changedBy": "service:identity"}}); err != nil {
				return err
			}
			if !verified {
				continue
			}
			now := s.now()
			if !proof.ExpiresAt.After(now) {
				return nil
			}
			if err := setPassword(ctx, q, authn.RealmStaff, id, hash, "", now); err != nil {
				return err
			}
			rejected = false
			return outbox.Enqueue(ctx, tx, "identity", outbox.Event{Subject: "identity.user.changed", Payload: map[string]any{"subjectId": id, "realm": "staff", "changedBy": "staff:" + id}})
		}
		return nil
	})
	if err != nil {
		return "", err
	}
	if rejected {
		return "", ErrResetInvalid
	}
	return id, nil
}

func (s *ManagedAccounts) PasswordMinimum(realm authn.Realm) int {
	if realm == authn.RealmCustomer {
		return 8
	}
	return s.minPassword
}
