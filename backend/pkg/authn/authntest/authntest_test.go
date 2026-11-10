package authntest_test

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/authn/authntest"
)

func TestNewSigner(t *testing.T) {
	signer := authntest.NewSigner(t, "key-1")
	require.NotNil(t, signer)
	require.Equal(t, "key-1", signer.KeyID)
	require.Equal(t, authntest.Issuer, signer.Issuer)
	require.NotNil(t, signer.Public)

	trust := signer.Trust()
	require.Equal(t, authntest.Issuer, trust.Issuer)
	require.ElementsMatch(t, authn.UserRealms, trust.Realms)
}

func TestNewServiceSigner(t *testing.T) {
	signer := authntest.NewServiceSigner(t, "audit")
	require.NotNil(t, signer)
	require.Equal(t, "audit:1", signer.KeyID)
	require.Equal(t, authn.ServiceIssuerPrefix+"audit", signer.Issuer)
	require.NotNil(t, signer.Public)

	trust := signer.Trust()
	require.Equal(t, authn.ServiceIssuerPrefix, trust.Issuer)
	require.Equal(t, []authn.Realm{authn.RealmService}, trust.Realms)
}

func TestSignToken(t *testing.T) {
	signer := authntest.NewSigner(t, "key-1")
	tokenStr := signer.Sign(t, authntest.Token{
		Subject:   "user-100",
		Realm:     authn.RealmStaff,
		Roles:     []string{"admin"},
		ExpiresIn: 10 * time.Minute,
	})
	require.NotEmpty(t, tokenStr)

	verifier := authn.NewVerifier(time.Second, signer.Trust())
	principal, err := verifier.Verify(context.Background(), tokenStr, authn.RealmStaff)
	require.NoError(t, err)
	require.Equal(t, "user-100", principal.Subject)
	require.True(t, principal.HasRole("admin"))
}

func TestSignServiceToken(t *testing.T) {
	signer := authntest.NewServiceSigner(t, "audit")
	tokenStr := signer.Sign(t, authntest.Token{
		Subject: "audit",
	})
	require.NotEmpty(t, tokenStr)

	verifier := authn.NewVerifier(time.Second, signer.Trust())
	principal, err := verifier.Verify(context.Background(), tokenStr, authn.RealmService)
	require.NoError(t, err)
	require.Equal(t, "audit", principal.Subject)
	require.Equal(t, authn.RealmService, principal.Realm)
}
