package httpapi_test

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/getkin/kin-openapi/openapi3"
	"github.com/getkin/kin-openapi/openapi3filter"
	"github.com/getkin/kin-openapi/routers/gorillamux"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/authn/authntest"
	"platform.local/backend/pkg/catalog"
	"platform.local/backend/pkg/config"
	"platform.local/backend/pkg/httpx"
	"platform.local/backend/pkg/logx"
	"platform.local/backend/pkg/migrate"
	"platform.local/backend/pkg/testkit"
	"platform.local/backend/services/identity/api"
	"platform.local/backend/services/identity/internal/app"
	"platform.local/backend/services/identity/internal/httpapi"
	"platform.local/backend/services/identity/internal/postgres"
	"platform.local/backend/services/identity/internal/sessions"
	"platform.local/backend/services/identity/migrations"
)

func TestStaffAccess(t *testing.T) {
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, testkit.Postgres(t))
	require.NoError(t, err)
	t.Cleanup(pool.Close)
	require.NoError(t, migrate.Run(ctx, pool, migrate.Options{Schema: "identity", Migrations: migrations.FS, Logger: slog.Default()}))
	exec := func(sql string) { t.Helper(); _, err := pool.Exec(ctx, sql); require.NoError(t, err) }
	exec(`INSERT INTO identity.account(realm,subject_id,email,password_hash,roles) VALUES
 ('staff','staff-user','private@example.test','private-password-hash',ARRAY['employee']),
 ('staff','other','other@example.test',NULL,ARRAY['employee']);
 INSERT INTO identity.staff_role(id,name_en,name_ar) VALUES('employee','Employee','موظف');
 INSERT INTO identity.staff_permission(id,role_id,resource,action,allowed) VALUES
 ('read','employee','invoices','read',true),('write','employee','invoices','write',true),
 ('create','employee','invoices','create',false),('orders','employee','orders','read',true);
 INSERT INTO identity.staff_role_scope(role_id,area,scope) VALUES('employee','claims','department');
 INSERT INTO identity.staff_access(subject_id,permission_overrides,updated_at) VALUES
 ('staff-user','{"invoices:read":false,"invoices:delete":true}',now());`)
	repo := postgres.New(pool)
	svc, err := sessions.New(repo, time.Hour)
	require.NoError(t, err)
	credential, err := svc.Start(ctx, authn.RealmStaff, "staff-user", time.Now())
	require.NoError(t, err)
	signer := authntest.NewSigner(t, "identity")
	token := func(roles ...string) string {
		return signer.Sign(t, authntest.Token{Realm: authn.RealmStaff, Subject: "staff-user", Roles: roles, SessionID: credential.Family.ID})
	}
	var cfg config.Common
	require.NoError(t, config.LoadFrom(&cfg, map[string]string{"SERVICE_NAME": "identity", "APP_ENV": "test"}))
	e, err := httpx.New(cfg, logx.New(io.Discard, logx.Options{}), nil)
	require.NoError(t, err)
	var dependencyErr error
	var duringLoad func()
	loads := 0
	modules := map[string]bool{}
	for _, module := range catalog.Modules {
		modules[module.Key] = module.Key != "store"
	}
	httpapi.RegisterStaffAccess(e, authn.NewVerifier(time.Second, signer.Trust()), app.NewStaffAccess(pool, func(context.Context) (map[string]bool, error) {
		loads++
		if duringLoad != nil {
			duringLoad()
		}
		return modules, dependencyErr
	}))
	doc, err := openapi3.NewLoader().LoadFromData(api.OpenAPI)
	require.NoError(t, err)
	require.NoError(t, doc.Validate(ctx))
	router, err := gorillamux.NewRouter(doc)
	require.NoError(t, err)
	call := func(bearer string) *httptest.ResponseRecorder {
		t.Helper()
		req := httptest.NewRequest(http.MethodGet, "http://localhost/v1/identity/staff/access", nil)
		if bearer != "" {
			req.Header.Set("Authorization", "Bearer "+bearer)
		}
		rec := httptest.NewRecorder()
		e.ServeHTTP(rec, req)
		route, params, err := router.FindRoute(req)
		require.NoError(t, err)
		input := &openapi3filter.ResponseValidationInput{RequestValidationInput: &openapi3filter.RequestValidationInput{Request: req, PathParams: params, Route: route}, Status: rec.Code, Header: rec.Header()}
		input.SetBodyBytes(rec.Body.Bytes())
		require.NoError(t, openapi3filter.ValidateResponse(ctx, input), rec.Body.String())
		require.Equal(t, "no-store", rec.Header().Get("Cache-Control"))
		return rec
	}
	require.Equal(t, 401, call("").Code)
	for _, realm := range []authn.Realm{authn.RealmIT, authn.RealmCustomer, authn.RealmService} {
		require.Equal(t, 401, call(signer.Sign(t, authntest.Token{Realm: realm, Subject: "staff-user", Roles: []string{"employee"}, SessionID: credential.Family.ID})).Code)
	}
	require.Equal(t, 401, call(token()).Code)
	require.Equal(t, 401, call(token("employee", "viewer")).Code)
	valid := token("employee")
	result := call(valid)
	require.Equal(t, 200, result.Code)
	for _, private := range []string{"private@example.test", "other@example.test", "private-password-hash", credential.Token} {
		require.NotContains(t, result.Body.String(), private)
	}
	var policy app.StaffAccessPolicy
	require.NoError(t, json.Unmarshal(result.Body.Bytes(), &policy))
	require.Equal(t, "staff-user", policy.SubjectID)
	require.Equal(t, "employee", policy.Role)
	require.False(t, policy.Permissions["invoices:read"])
	require.False(t, policy.Permissions["invoices:create"])
	require.True(t, policy.Permissions["invoices:edit"])
	require.True(t, policy.Permissions["invoices:delete"])
	require.False(t, policy.Permissions["orders:read"])
	require.False(t, policy.Permissions["it_support:read"], "a missing template grant must not be inferred")
	require.Equal(t, "department", policy.DataScopes["claims"])
	require.Equal(t, "own", policy.DataScopes["leave"])
	modules["invoicing"] = false
	require.NoError(t, json.Unmarshal(call(valid).Body.Bytes(), &policy))
	require.False(t, policy.Permissions["invoices:edit"])
	require.False(t, policy.Permissions["invoices:delete"])
	dependencyErr = errors.New("system unavailable")
	require.Equal(t, 503, call(valid).Code)
	dependencyErr = nil
	modules = nil
	require.Equal(t, 503, call(valid).Code)
	modules = map[string]bool{"invoicing": true}
	exec(`UPDATE identity.staff_access SET permission_overrides='{"invoices:read":"invalid"}'`)
	require.Equal(t, 503, call(valid).Code)
	exec(`UPDATE identity.staff_access SET permission_overrides='{}'`)
	for _, change := range []string{`active=false`, `roles=ARRAY['viewer']`} {
		exec(`UPDATE identity.account SET ` + change + ` WHERE subject_id='staff-user'`)
		require.Equal(t, 401, call(valid).Code)
		exec(`UPDATE identity.account SET active=true,roles=ARRAY['employee'] WHERE subject_id='staff-user'`)
	}
	for _, change := range []string{`revoked_at=now()`, `expires_at=now()-interval '1 hour'`} {
		exec(`UPDATE identity.session_family SET ` + change)
		require.Equal(t, 401, call(valid).Code)
		exec(`UPDATE identity.session_family SET revoked_at=NULL,expires_at=now()+interval '1 hour'`)
	}
	// Dependency reads neither hold account locks nor authorize state that changed during the request.
	duringLoad = func() {
		bounded, cancel := context.WithTimeout(ctx, 2*time.Second)
		defer cancel()
		_, err := pool.Exec(bounded, `UPDATE identity.account SET active=false WHERE subject_id='staff-user'`)
		require.NoError(t, err)
	}
	require.Equal(t, 401, call(valid).Code)
	duringLoad = nil
	exec(`UPDATE identity.account SET active=true,roles=ARRAY['super_admin'] WHERE subject_id='staff-user'`)
	dependencyErr = errors.New("system unavailable")
	before := loads
	result = call(token("super_admin"))
	require.Equal(t, 200, result.Code)
	require.Equal(t, before, loads, "Super Admin is independent of module switches")
	require.NoError(t, json.Unmarshal(result.Body.Bytes(), &policy))
	for key, allowed := range policy.Permissions {
		require.True(t, allowed, key)
	}
	for area, scope := range policy.DataScopes {
		require.Equal(t, "all", scope, area)
	}
	exec(`DELETE FROM identity.staff_access`)
	require.Equal(t, 401, call(token("super_admin")).Code)
	var events int
	require.NoError(t, pool.QueryRow(ctx, `SELECT count(*) FROM identity.outbox`).Scan(&events))
	require.Equal(t, 1, events, "policy reads emit no mutation events")
}
