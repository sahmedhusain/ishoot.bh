package httpapi_test

import (
	"crypto/ed25519"
	"crypto/rand"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/authn/authntest"
	"platform.local/backend/pkg/config"
	"platform.local/backend/pkg/httpx"
	"platform.local/backend/pkg/logx"
	"platform.local/backend/services/identity/internal/accounts"
	"platform.local/backend/services/identity/internal/httpapi"
	"platform.local/backend/services/identity/internal/tokens"
)

func TestManagedAccountsStaffCoexistence(t *testing.T) {
	var cfg config.Common
	require.NoError(t, config.LoadFrom(&cfg, map[string]string{"SERVICE_NAME": "identity", "APP_ENV": "test"}))
	e, err := httpx.New(cfg, logx.New(io.Discard, logx.Options{}), nil)
	require.NoError(t, err)

	_, priv, err := ed25519.GenerateKey(rand.Reader)
	require.NoError(t, err)
	issuer, err := tokens.New("https://identity.example", "active", priv, time.Minute)
	require.NoError(t, err)

	caller := authntest.NewServiceSigner(t, "admin")
	storeCaller := authntest.NewServiceSigner(t, "store")
	storeKey, found := storeCaller.Public.Key(0)
	require.True(t, found)
	require.NoError(t, caller.Public.AddKey(storeKey))
	svcVerifier := authn.NewVerifier(time.Second, caller.Trust())

	callers := map[authn.Realm][]string{
		authn.RealmStaff:    {"admin"},
		authn.RealmCustomer: {"store"},
		authn.RealmIT:       {"it"},
	}
	httpapi.Register(e, svcVerifier, nil, issuer, &accounts.Service{}, 1<<20, callers)
	httpapi.RegisterManagedAccounts(e, svcVerifier, nil, callers, 1<<20)
	httpapi.RegisterDeskStaffService(e, svcVerifier, nil)
	httpapi.RegisterStaffAccessService(e, svcVerifier, nil)

	adminTok := caller.Sign(t, authntest.Token{Subject: "admin"})
	storeTok := storeCaller.Sign(t, authntest.Token{Subject: "store"})

	// Static staff/customer session AND managed-account routes must coexist without Echo shadowing
	for _, tc := range []struct {
		method string
		path   string
		tok    string
		body   string
	}{
		{http.MethodPost, "/v1/identity/staff/sessions/login", adminTok, "{}"},
		{http.MethodPost, "/v1/identity/staff/sessions/refresh", adminTok, "{}"},
		{http.MethodPost, "/v1/identity/staff/sessions/logout", adminTok, "{}"},
		{http.MethodPost, "/v1/identity/customer/sessions/login", storeTok, "{}"},
		{http.MethodPost, "/v1/identity/customer/sessions/refresh", storeTok, "{}"},
		{http.MethodPost, "/v1/identity/customer/sessions/logout", storeTok, "{}"},
		{http.MethodPut, "/v1/identity/staff/accounts/u1", adminTok, "{}"},
		{http.MethodPut, "/v1/identity/staff/accounts/u1/password", adminTok, "{}"},
		{http.MethodPost, "/v1/identity/staff/password-resets", adminTok, "{}"},
		{http.MethodPost, "/v1/identity/staff/password-resets/confirm", adminTok, "{}"},
	} {
		req := httptest.NewRequest(tc.method, tc.path, strings.NewReader(tc.body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+tc.tok)
		rec := httptest.NewRecorder()
		e.ServeHTTP(rec, req)
		require.NotEqualf(t, http.StatusNotFound, rec.Code, "route shadowed: %s %s body=%s", tc.method, tc.path, rec.Body.String())
		require.Equalf(t, http.StatusUnprocessableEntity, rec.Code, "expected validation 422 on empty JSON: %s %s body=%s", tc.method, tc.path, rec.Body.String())
	}

	// Non-admin caller must receive 403 on DELETE /v1/identity/staff/accounts/u1/mfa (not 404)
	delReq := httptest.NewRequest(http.MethodDelete, "/v1/identity/staff/accounts/u1/mfa", nil)
	delReq.Header.Set("Authorization", "Bearer "+storeTok)
	delRec := httptest.NewRecorder()
	e.ServeHTTP(delRec, delReq)
	require.Equal(t, http.StatusForbidden, delRec.Code, delRec.Body.String())
}
