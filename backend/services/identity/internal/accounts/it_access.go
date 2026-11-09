package accounts

import (
	"context"
	"errors"
	"slices"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/authz"
	"platform.local/backend/pkg/catalog"
	"platform.local/backend/services/identity/internal/postgres/sqlcdb"
)

var ErrForbidden = errors.New("IT permission required")

// CheckITAccess locks the actor before their session, so a concurrent role change or revocation cannot authorize
// account administration with stale access. Call inside the transaction performing the action.
func CheckITAccess(ctx context.Context, q *sqlcdb.Queries, p authn.Principal, resource, action string, now time.Time) error {
	if p.Realm != authn.RealmIT || !authz.Allowed(catalog.ITAccess, p, resource, action) {
		return ErrForbidden
	}
	return CheckUserSession(ctx, q, p, now)
}

// CheckUserSession locks the live account and its session inside the transaction using the policy.
func CheckUserSession(ctx context.Context, q *sqlcdb.Queries, p authn.Principal, now time.Time) error {
	if !slices.Contains(authn.UserRealms, p.Realm) {
		return ErrInvalid
	}
	if _, err := uuid.Parse(p.SessionID); err != nil {
		return ErrInvalid
	}
	account, err := q.LockAccount(ctx, sqlcdb.LockAccountParams{Realm: string(p.Realm), SubjectID: p.Subject})
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrInvalid
	}
	if err != nil {
		return err
	}
	if !account.Active || (p.Realm == authn.RealmIT && !account.MfaEnabled) || !slices.Equal(account.Roles, p.Roles) {
		return ErrInvalid
	}
	session, err := q.LockSessionFamily(ctx, p.SessionID)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrInvalid
	}
	if err != nil {
		return err
	}
	if current := time.Now(); current.After(now) {
		now = current
	}
	if session.Realm != string(p.Realm) || session.SubjectID != p.Subject || session.RevokedAt != nil || !session.ExpiresAt.After(now) {
		return ErrInvalid
	}
	return nil
}
