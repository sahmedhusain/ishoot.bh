package postgres

import (
	"context"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"platform.local/backend/pkg/authn"
)

// BootstrapAccount describes an environment-configured first user whose
// credentials live outside SQL seeds and are materialized lazily on first auth.
type BootstrapAccount struct {
	Realm        authn.Realm
	SubjectID    string
	Username     string
	Email        string
	PasswordHash string
	DisplayName  string
	Roles        []string
}

// PasswordVerifier checks plaintext passwords against encoded password hashes.
type PasswordVerifier interface {
	Verify(password, encoded string) (bool, error)
}

// QueryRunner abstracts pgxpool.Pool and pgx.Tx for helper queries.
type QueryRunner interface {
	Query(context.Context, string, ...any) (pgx.Rows, error)
}

// WithBootstrap configures environment-sourced fallback accounts for lazy materialization.
func (p *Repository) WithBootstrap(items ...BootstrapAccount) *Repository {
	out := make([]BootstrapAccount, 0, len(items))
	for _, item := range items {
		item.Username = strings.ToUpper(strings.TrimSpace(item.Username))
		item.Email = strings.ToLower(strings.TrimSpace(item.Email))
		item.SubjectID = strings.TrimSpace(item.SubjectID)
		item.DisplayName = strings.TrimSpace(item.DisplayName)
		if item.SubjectID == "" || item.Username == "" || item.Email == "" || item.PasswordHash == "" {
			continue
		}
		out = append(out, item)
	}
	p.bootstrap = out
	return p
}

func materializeBootstrapAccount(ctx context.Context, exec func(string, ...any) error, item BootstrapAccount, now time.Time) error {
	if err := exec(`
		INSERT INTO identity.account (realm, subject_id, email, username, password_hash, roles, active, mfa_enabled, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6::text[], true, false, $7, $7)
		ON CONFLICT DO NOTHING
	`, string(item.Realm), item.SubjectID, item.Email, item.Username, item.PasswordHash, item.Roles, now); err != nil {
		return err
	}
	if item.Realm == authn.RealmStaff {
		name := item.DisplayName
		if name == "" {
			name = "Super Admin"
		}
		if err := exec(`
			INSERT INTO identity.staff_access (realm, subject_id, display_name, updated_at)
			VALUES ('staff', $1, $2, $3)
			ON CONFLICT (realm, subject_id) DO NOTHING
		`, item.SubjectID, name, now); err != nil {
			return err
		}
	}
	return nil
}

func (p *Repository) ensureBootstrapByIdentifier(ctx context.Context, realm authn.Realm, identifier string) (bool, error) {
	trimmed := strings.TrimSpace(identifier)
	if trimmed == "" || len(p.bootstrap) == 0 {
		return false, nil
	}
	for _, item := range p.bootstrap {
		if item.Realm == realm && strings.EqualFold(item.Username, trimmed) {
			if err := materializeBootstrapAccount(ctx, func(sql string, args ...any) error {
				_, err := p.pool.Exec(ctx, sql, args...)
				return err
			}, item, time.Now().UTC()); err != nil {
				return false, err
			}
			return true, nil
		}
	}
	return false, nil
}

func (p *Repository) ensureBootstrapBySubject(ctx context.Context, realm authn.Realm, subject string) (bool, error) {
	trimmed := strings.TrimSpace(subject)
	if trimmed == "" || len(p.bootstrap) == 0 {
		return false, nil
	}
	for _, item := range p.bootstrap {
		if item.Realm == realm && item.SubjectID == trimmed {
			if err := materializeBootstrapAccount(ctx, func(sql string, args ...any) error {
				_, err := p.pool.Exec(ctx, sql, args...)
				return err
			}, item, time.Now().UTC()); err != nil {
				return false, err
			}
			return true, nil
		}
	}
	return false, nil
}

// EnsureBootstrapForReset materializes an environment bootstrap account inside a transaction
// when both username and email match for the target realm.
func EnsureBootstrapForReset(ctx context.Context, tx pgx.Tx, items []BootstrapAccount, realm authn.Realm, username, email string, now time.Time) error {
	u := strings.TrimSpace(username)
	e := strings.ToLower(strings.TrimSpace(email))
	if u == "" || e == "" || len(items) == 0 {
		return nil
	}
	for _, item := range items {
		if item.Realm == realm && strings.EqualFold(item.Username, u) && strings.EqualFold(item.Email, e) {
			return materializeBootstrapAccount(ctx, func(sql string, args ...any) error {
				_, err := tx.Exec(ctx, sql, args...)
				return err
			}, item, now)
		}
	}
	return nil
}

// CounterpartHashes returns password hashes of active/inactive counterpart realm accounts
// sharing the same email or username between staff (admin) and it realms.
func CounterpartHashes(ctx context.Context, db QueryRunner, items []BootstrapAccount, realm authn.Realm, email string, username *string) ([]string, error) {
	if realm != authn.RealmStaff && realm != authn.RealmIT {
		return nil, nil
	}
	otherRealm := authn.RealmIT
	if realm == authn.RealmIT {
		otherRealm = authn.RealmStaff
	}
	var uname any
	uStr := ""
	if username != nil {
		uStr = strings.TrimSpace(*username)
		if uStr != "" {
			uname = uStr
		}
	}
	rows, err := db.Query(ctx, `
		SELECT password_hash
		FROM identity.account
		WHERE realm = $1
		  AND password_hash IS NOT NULL
		  AND (
		    lower(email) = lower($2)
		    OR ($3::text IS NOT NULL AND username IS NOT NULL AND lower(username) = lower($3::text))
		  )
	`, string(otherRealm), strings.ToLower(strings.TrimSpace(email)), uname)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var hashes []string
	for rows.Next() {
		var h string
		if err := rows.Scan(&h); err != nil {
			return nil, err
		}
		if h != "" {
			hashes = append(hashes, h)
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	for _, item := range items {
		if item.Realm != otherRealm || item.PasswordHash == "" {
			continue
		}
		if strings.EqualFold(item.Email, email) || (uStr != "" && strings.EqualFold(item.Username, uStr)) {
			hashes = append(hashes, item.PasswordHash)
		}
	}
	return hashes, nil
}

// CounterpartPasswordHashes implements accounts.CounterpartHashReader for Repository.
func (p *Repository) CounterpartPasswordHashes(ctx context.Context, realm authn.Realm, email string, username *string) ([]string, error) {
	return CounterpartHashes(ctx, p.pool, p.bootstrap, realm, email, username)
}

// MatchesOtherRealmPassword reports whether plain matches any password hash on the counterpart realm
// (staff vs it) for the same email or username.
func MatchesOtherRealmPassword(ctx context.Context, db QueryRunner, items []BootstrapAccount, verifier PasswordVerifier, realm authn.Realm, email string, username *string, plain string) (bool, error) {
	if verifier == nil || plain == "" || (realm != authn.RealmStaff && realm != authn.RealmIT) {
		return false, nil
	}
	hashes, err := CounterpartHashes(ctx, db, items, realm, email, username)
	if err != nil {
		return false, err
	}
	for _, h := range hashes {
		if _, err := verifier.Verify(plain, h); err == nil {
			return true, nil
		}
	}
	return false, nil
}
