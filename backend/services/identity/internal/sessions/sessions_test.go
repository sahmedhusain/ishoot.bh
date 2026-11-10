package sessions_test
import (
	"context"
	"testing"
	"time"
	"github.com/stretchr/testify/require"
	"platform.local/backend/pkg/authn"
	"platform.local/backend/services/identity/internal/sessions"
)
type repositoryStub struct{}
func (repositoryStub) Create(context.Context, sessions.Family, string) error	{ return nil }
func (repositoryStub) Rotate(context.Context, authn.Realm, string, string, time.Time) (sessions.Family, error) {
	return sessions.Family{}, nil
}
func (repositoryStub) Revoke(context.Context, authn.Realm, string, time.Time) error	{ return nil }
func (repositoryStub) Active(context.Context, authn.Realm, string, time.Time) (sessions.Family, error) {
	return sessions.Family{}, nil
}
func TestPrepareUsesPerRealmLifetimes(t *testing.T) {
	lifetimes := sessions.Lifetimes{Customer: 7 * 24 * time.Hour, Staff: 12 * time.Hour, IT: 4 * time.Hour}
	service, err := sessions.NewWithLifetimes(repositoryStub{}, lifetimes)
	require.NoError(t, err)
	now := time.Date(2026, 11, 9, 12, 0, 0, 0, time.UTC)
	for realm, ttl := range map[authn.Realm]time.Duration{
		authn.RealmCustomer:	lifetimes.Customer,
		authn.RealmStaff:	lifetimes.Staff,
		authn.RealmIT:		lifetimes.IT,
	} {
		credential, err := service.Prepare(realm, "subject", now)
		require.NoError(t, err)
		require.True(t, credential.Family.ExpiresAt.Equal(now.Add(ttl)), "realm %s uses its configured lifetime", realm)
	}
}
