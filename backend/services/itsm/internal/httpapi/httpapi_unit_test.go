package httpapi_test

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/authn/authntest"
	"platform.local/backend/pkg/config"
	"platform.local/backend/pkg/httpx"
	"platform.local/backend/pkg/logx"
	"platform.local/backend/services/itsm/internal/httpapi"
)

func TestRequestCallersAllowAllFourApps(t *testing.T) {
	logger := logx.New(io.Discard, logx.Options{})
	var cfg config.Common
	require.NoError(t, config.LoadFrom(&cfg, map[string]string{"SERVICE_NAME": "itsm", "APP_ENV": "test"}))
	e, err := httpx.New(cfg, logger, nil)
	require.NoError(t, err)

	signers := map[string]*authntest.Signer{
		"admin":   authntest.NewServiceSigner(t, "admin"),
		"web":     authntest.NewServiceSigner(t, "web"),
		"store":   authntest.NewServiceSigner(t, "store"),
		"it":      authntest.NewServiceSigner(t, "it"),
		"finance": authntest.NewServiceSigner(t, "finance"),
	}
	services := signers["admin"].Trust()
	for name, s := range signers {
		if name == "admin" {
			continue
		}
		k, ok := s.Public.Key(0)
		require.True(t, ok)
		require.NoError(t, signers["admin"].Public.AddKey(k))
	}
	identity := authntest.NewSigner(t, "identity-1")

	httpapi.Register(e, nil, httpapi.Options{
		Verifier:        authn.NewVerifier(time.Second, services, identity.Trust()),
		RequestCallers:  []string{"admin", "web", "store", "it"},
		JSONBodyLimit:   8192,
		DefaultPageSize: 25,
		MaxPageSize:     100,
	})

	// Empty JSON payload triggers validation (422) after passing authn + allowedCaller.
	invalidBody, _ := json.Marshal(map[string]any{})
	for _, caller := range []string{"admin", "web", "store", "it"} {
		token := signers[caller].Sign(t, authntest.Token{Subject: caller})
		req := httptest.NewRequest(http.MethodPost, "/v1/itsm/requests/tickets", bytes.NewReader(invalidBody))
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()
		e.ServeHTTP(rec, req)
		assert.Equal(t, http.StatusUnprocessableEntity, rec.Code, "caller %s should pass allowedCaller", caller)
	}

	unlistedToken := signers["finance"].Sign(t, authntest.Token{Subject: "finance"})
	req := httptest.NewRequest(http.MethodPost, "/v1/itsm/requests/tickets", bytes.NewReader(invalidBody))
	req.Header.Set("Authorization", "Bearer "+unlistedToken)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)
	assert.Equal(t, http.StatusForbidden, rec.Code, "unlisted caller must be forbidden")
}
