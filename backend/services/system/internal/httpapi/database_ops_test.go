package httpapi_test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/authn/authntest"
	"platform.local/backend/pkg/config"
	"platform.local/backend/pkg/db"
	"platform.local/backend/pkg/httpx"
	"platform.local/backend/pkg/logx"
	"platform.local/backend/pkg/migrate"
	"platform.local/backend/pkg/secrets"
	"platform.local/backend/pkg/testkit"
	"platform.local/backend/services/system/internal/app"
	"platform.local/backend/services/system/internal/httpapi"
	"platform.local/backend/services/system/internal/postgres"
	"platform.local/backend/services/system/migrations"
)

func TestDeskDatabaseQueryAndMaintenance(t *testing.T) {
	ctx := context.Background()
	logger := logx.New(io.Discard, logx.Options{})
	pool, err := db.Open(ctx, db.Config{
		URL:               testkit.Postgres(t),
		MaxConns:          4,
		MaxConnLifetime:   time.Minute,
		MaxConnIdleTime:   time.Minute,
		HealthCheckPeriod: time.Minute,
		StatementTimeout:  10 * time.Second,
	}, logger.Logger)
	require.NoError(t, err)
	t.Cleanup(pool.Close)
	require.NoError(t, migrate.Run(ctx, pool, migrate.Options{Schema: "system", Migrations: migrations.FS, Logger: logger.Logger}))

	var cfg config.Common
	require.NoError(t, config.LoadFrom(&cfg, map[string]string{"SERVICE_NAME": "system", "APP_ENV": "test"}))
	e, err := httpx.New(cfg, logger, nil)
	require.NoError(t, err)

	adminSvc, identity := authntest.NewServiceSigner(t, "admin"), authntest.NewSigner(t, "identity-1")
	ring, err := secrets.NewKeyring(secrets.Config{
		Keys:         []string{"primary:MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIzNDU2Nzg5MDE="},
		PrimaryKeyID: "primary",
	})
	require.NoError(t, err)

	httpapi.Register(e, app.New(postgres.New(pool), ring), httpapi.Options{
		Verifier:      authn.NewVerifier(time.Second, adminSvc.Trust(), identity.Trust()),
		JSONBodyLimit: 16384,
	})

	itAdminToken := identity.Sign(t, authntest.Token{Subject: "it-1", Realm: authn.RealmIT, Roles: []string{"it_admin"}})
	itSupportToken := identity.Sign(t, authntest.Token{Subject: "it-2", Realm: authn.RealmIT, Roles: []string{"it_support"}})

	post := func(token, path string, payload any) *httptest.ResponseRecorder {
		body, _ := json.Marshal(payload)
		req := httptest.NewRequest(http.MethodPost, path, bytes.NewReader(body))
		if token != "" {
			req.Header.Set("Authorization", "Bearer "+token)
		}
		req.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()
		e.ServeHTTP(rec, req)
		return rec
	}

	// Valid read-only SELECT (including quoted keyword literal)
	okRec := post(itAdminToken, "/v1/system/desk/database/query", map[string]string{
		"sql": "SELECT 1 AS num, 'delete' AS safe_literal;",
	})
	require.Equal(t, http.StatusOK, okRec.Code, okRec.Body.String())
	var qRes postgres.DatabaseQueryResult
	require.NoError(t, json.Unmarshal(okRec.Body.Bytes(), &qRes))
	assert.Equal(t, []string{"num", "safe_literal"}, qRes.Columns)
	require.Len(t, qRes.Rows, 1)
	assert.Equal(t, float64(1), qRes.Rows[0][0])
	assert.Equal(t, "delete", qRes.Rows[0][1])

	// Reject mutating / multi-statement SQL with 400
	for _, badSQL := range []string{
		"DELETE FROM system.outbox",
		"DROP TABLE system.company",
		"SELECT 1; SELECT 2",
		"WITH d AS (DELETE FROM system.outbox RETURNING id) SELECT * FROM d",
	} {
		badRec := post(itAdminToken, "/v1/system/desk/database/query", map[string]string{"sql": badSQL})
		assert.Equal(t, http.StatusBadRequest, badRec.Code, "expected 400 for %s: %s", badSQL, badRec.Body.String())
	}

	// Enforce RBAC for it_support on backups:execute maintenance endpoint
	forbidRec := post(itSupportToken, "/v1/system/desk/database/maintenance", map[string]string{"action": "analyze"})
	assert.Equal(t, http.StatusForbidden, forbidRec.Code)

	// ANALYZE succeeds for it_admin
	analyzeRec := post(itAdminToken, "/v1/system/desk/database/maintenance", map[string]string{"action": "analyze"})
	require.Equal(t, http.StatusOK, analyzeRec.Code, analyzeRec.Body.String())

	// Seed an old published outbox row (> 7 days) and verify purge_outbox deletes it
	_, err = pool.Exec(ctx, `
		INSERT INTO system.outbox (id, subject, payload, created_at, published_at)
		VALUES ($1, 'system.company.updated', '{}'::jsonb, now() - interval '10 days', now() - interval '9 days')
	`, uuid.NewString())
	require.NoError(t, err)

	purgeRec := post(itAdminToken, "/v1/system/desk/database/maintenance", map[string]string{"action": "purge_outbox"})
	require.Equal(t, http.StatusOK, purgeRec.Code, purgeRec.Body.String())
	var mRes postgres.DatabaseMaintenanceResult
	require.NoError(t, json.Unmarshal(purgeRec.Body.Bytes(), &mRes))
	assert.Equal(t, "purge_outbox", mRes.Action)
	assert.GreaterOrEqual(t, mRes.AffectedRows, int64(1))
}
