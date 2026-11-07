package httpapi_test

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/getkin/kin-openapi/openapi3"
	"github.com/getkin/kin-openapi/openapi3filter"
	"github.com/getkin/kin-openapi/routers/gorillamux"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/santhosh-tekuri/jsonschema/v6"
	"github.com/stretchr/testify/require"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/authn/authntest"
	"platform.local/backend/pkg/config"
	"platform.local/backend/pkg/httpx"
	"platform.local/backend/pkg/logx"
	"platform.local/backend/pkg/migrate"
	"platform.local/backend/pkg/testkit"
	"platform.local/backend/services/identity/api"
	"platform.local/backend/services/identity/internal/accounts"
	"platform.local/backend/services/identity/internal/app"
	"platform.local/backend/services/identity/internal/httpapi"
	"platform.local/backend/services/identity/internal/postgres"
	"platform.local/backend/services/identity/internal/sessions"
	"platform.local/backend/services/identity/migrations"
)

func TestDeskSessions(t *testing.T) {
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, testkit.Postgres(t))
	require.NoError(t, err)
	t.Cleanup(pool.Close)
	require.NoError(t, migrate.Run(ctx, pool, migrate.Options{Schema: "identity", Migrations: migrations.FS, Logger: slog.Default()}))
	_, err = pool.Exec(ctx, `INSERT INTO identity.account(realm,subject_id,email,roles,mfa_enabled,mfa_secret_encrypted) VALUES
      ('it','operator','operator@example.test',ARRAY['it_admin'],true,'test-encrypted'),
      ('staff','staff-user','staff@example.test',ARRAY['viewer'],false,NULL),
      ('customer','customer-user','customer@example.test',ARRAY[]::text[],false,NULL)`)
	require.NoError(t, err)
	repo := postgres.New(pool)
	service, err := sessions.New(repo, time.Hour)
	require.NoError(t, err)
	actor, err := service.Start(ctx, authn.RealmIT, "operator", time.Now())
	require.NoError(t, err)
	target, err := service.Start(ctx, authn.RealmStaff, "staff-user", time.Now())
	require.NoError(t, err)
	_, err = service.Start(ctx, authn.RealmCustomer, "customer-user", time.Now())
	require.NoError(t, err)
	orphan, err := service.Start(ctx, authn.RealmStaff, "orphan", time.Now())
	require.NoError(t, err)
	signer := authntest.NewSigner(t, "identity")
	tokenFor := func(role string) string {
		return signer.Sign(t, authntest.Token{Realm: authn.RealmIT, Subject: "operator", Roles: []string{role}, SessionID: actor.Family.ID})
	}
	token := tokenFor("it_admin")
	var cfg config.Common
	require.NoError(t, config.LoadFrom(&cfg, map[string]string{"SERVICE_NAME": "identity", "APP_ENV": "test"}))
	e, err := httpx.New(cfg, logx.New(io.Discard, logx.Options{}), nil)
	require.NoError(t, err)
	httpapi.RegisterDeskSessions(e, authn.NewVerifier(time.Second, signer.Trust()), app.NewDeskSessions(pool))
	spec, err := openapi3.NewLoader().LoadFromData(api.OpenAPI)
	require.NoError(t, err)
	require.NoError(t, spec.Validate(ctx))
	router, err := gorillamux.NewRouter(spec)
	require.NoError(t, err)
	rawCall := func(method, path, bearer string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(method, "http://localhost"+path, nil)
		if bearer != "" {
			req.Header.Set("Authorization", "Bearer "+bearer)
		}
		rec := httptest.NewRecorder()
		e.ServeHTTP(rec, req)
		return rec
	}
	call := func(method, path, bearer string) *httptest.ResponseRecorder {
		rec := rawCall(method, path, bearer)
		req := httptest.NewRequest(method, "http://localhost"+path, nil)
		route, params, err := router.FindRoute(req)
		require.NoError(t, err)
		input := &openapi3filter.ResponseValidationInput{RequestValidationInput: &openapi3filter.RequestValidationInput{Request: req, PathParams: params, Route: route}, Status: rec.Code, Header: rec.Header()}
		input.SetBodyBytes(rec.Body.Bytes())
		require.NoError(t, openapi3filter.ValidateResponse(ctx, input), rec.Body.String())
		require.Equal(t, "no-store", rec.Header().Get("Cache-Control"))
		return rec
	}
	const path = "/v1/identity/desk/sessions"
	require.Equal(t, 401, call(http.MethodGet, path, " ").Code)
	for _, realm := range []authn.Realm{authn.RealmStaff, authn.RealmCustomer, authn.RealmService} {
		wrong := signer.Sign(t, authntest.Token{Realm: realm, Roles: []string{"it_admin"}})
		require.Equal(t, 401, call(http.MethodGet, path, wrong).Code)
		require.Equal(t, 401, call(http.MethodDelete, path+"/"+target.Family.ID, wrong).Code)
	}
	for _, query := range []string{"?realm=service", "?limit=0", "?limit=201", "?limit=2147483648", "?limit=no", "?cursor=no", "?subjectId=" + strings.Repeat("x", 201)} {
		require.Equal(t, 422, call(http.MethodGet, path+query, token).Code, query)
	}
	require.Equal(t, 422, call(http.MethodDelete, path+"/invalid", token).Code)
	require.Equal(t, 404, call(http.MethodDelete, path+"/"+uuid.NewString(), token).Code)
	listed := call(http.MethodGet, path, token)
	require.Equal(t, 200, listed.Code)
	for _, secret := range []string{actor.Token, target.Token, target.Digest(), "test-encrypted"} {
		require.NotContains(t, listed.Body.String(), secret)
	}
	var page app.DeskSessionPage
	require.NoError(t, json.Unmarshal(listed.Body.Bytes(), &page))
	require.Len(t, page.Items, 4)
	seen := map[string]bool{}
	cursor := ""
	for range 4 {
		suffix := "?limit=1"
		if cursor != "" {
			suffix += "&cursor=" + cursor
		}
		rec := call(http.MethodGet, path+suffix, token)
		require.Equal(t, 200, rec.Code)
		require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &page))
		require.Len(t, page.Items, 1)
		require.False(t, seen[page.Items[0].ID])
		seen[page.Items[0].ID] = true
		cursor = page.NextCursor
	}
	require.Empty(t, cursor)
	filtered := call(http.MethodGet, path+"?realm=staff&subjectId=staff-user", token)
	require.NoError(t, json.Unmarshal(filtered.Body.Bytes(), &page))
	require.Len(t, page.Items, 1)
	require.Equal(t, target.Family.ID, page.Items[0].ID)
	require.Equal(t, 204, call(http.MethodDelete, path+"/"+target.Family.ID, token).Code)
	require.Equal(t, 204, call(http.MethodDelete, path+"/"+target.Family.ID, token).Code)
	_, _, err = repo.ActiveSession(ctx, authn.RealmStaff, target.Family.ID, time.Now())
	require.ErrorIs(t, err, accounts.ErrInvalid)
	_, err = service.Refresh(ctx, authn.RealmStaff, target.Token, time.Now())
	require.ErrorIs(t, err, sessions.ErrInvalid)
	var count int
	var event map[string]any
	require.NoError(t, pool.QueryRow(ctx, `SELECT count(*) FROM identity.outbox WHERE subject='identity.session.revoked' AND payload->>'sessionId'=$1`, target.Family.ID).Scan(&count))
	require.Equal(t, 1, count)
	require.NoError(t, pool.QueryRow(ctx, `SELECT payload FROM identity.outbox WHERE subject='identity.session.revoked' AND payload->>'sessionId'=$1`, target.Family.ID).Scan(&event))
	require.Equal(t, map[string]any{"subjectId": "staff-user", "realm": "staff", "changedBy": "it:operator", "sessionId": target.Family.ID, "reason": "it_revocation"}, event)
	raw, err := os.ReadFile("../../../../contracts/events/identity.session.revoked.v1.json")
	require.NoError(t, err)
	var schemaDoc any
	require.NoError(t, json.Unmarshal(raw, &schemaDoc))
	compiler := jsonschema.NewCompiler()
	require.NoError(t, compiler.AddResource("https://platform.local/event.json", schemaDoc))
	schema, err := compiler.Compile("https://platform.local/event.json")
	require.NoError(t, err)
	require.NoError(t, schema.Validate(event))
	_, err = pool.Exec(ctx, `ALTER TABLE identity.outbox ADD CONSTRAINT reject_revoke CHECK(subject<>'identity.session.revoked') NOT VALID`)
	require.NoError(t, err)
	require.Equal(t, 500, call(http.MethodDelete, path+"/"+orphan.Family.ID, token).Code)
	_, err = service.Active(ctx, authn.RealmStaff, orphan.Family.ID, time.Now())
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `ALTER TABLE identity.outbox DROP CONSTRAINT reject_revoke`)
	require.NoError(t, err)
	for _, change := range []string{`mfa_enabled=false`, `active=false`, `roles=ARRAY['it_support']`} {
		_, err = pool.Exec(ctx, `UPDATE identity.account SET `+change+` WHERE realm='it' AND subject_id='operator'`)
		require.NoError(t, err)
		require.Equal(t, 401, call(http.MethodGet, path, token).Code)
		require.Equal(t, 401, call(http.MethodDelete, path+"/"+orphan.Family.ID, token).Code)
		_, err = pool.Exec(ctx, `UPDATE identity.account SET mfa_enabled=true,active=true,roles=ARRAY['it_admin'] WHERE realm='it' AND subject_id='operator'`)
		require.NoError(t, err)
	}
	for _, change := range []string{`revoked_at=now()`, `expires_at=now()-interval '1 hour'`} {
		_, err = pool.Exec(ctx, `UPDATE identity.session_family SET `+change+` WHERE id=$1`, actor.Family.ID)
		require.NoError(t, err)
		require.Equal(t, 401, call(http.MethodGet, path, token).Code)
		require.Equal(t, 401, call(http.MethodDelete, path+"/"+orphan.Family.ID, token).Code)
		_, err = pool.Exec(ctx, `UPDATE identity.session_family SET revoked_at=NULL,expires_at=now()+interval '1 hour' WHERE id=$1`, actor.Family.ID)
		require.NoError(t, err)
	}
	for _, role := range []string{"it_engineer", "it_auditor"} {
		_, err = pool.Exec(ctx, `UPDATE identity.account SET roles=ARRAY[$1] WHERE realm='it' AND subject_id='operator'`, role)
		require.NoError(t, err)
		reader := tokenFor(role)
		require.Equal(t, 200, call(http.MethodGet, path, reader).Code)
		require.Equal(t, 403, call(http.MethodDelete, path+"/"+orphan.Family.ID, reader).Code)
	}
	_, err = pool.Exec(ctx, `UPDATE identity.account SET roles=ARRAY['it_support'] WHERE realm='it' AND subject_id='operator'`)
	require.NoError(t, err)
	require.Equal(t, 204, call(http.MethodDelete, path+"/"+orphan.Family.ID, tokenFor("it_support")).Code)
	_, err = pool.Exec(ctx, `UPDATE identity.account SET roles=ARRAY['it_admin'] WHERE realm='it' AND subject_id='operator'`)
	require.NoError(t, err)
	// Two operators revoking each other must serialize, never deadlock or use already revoked access.
	credentials := make([]sessions.Credential, 2)
	bearers := make([]string, 2)
	for i, id := range []string{"operator-a", "operator-b"} {
		_, err = pool.Exec(ctx, `INSERT INTO identity.account(realm,subject_id,email,roles,mfa_enabled,mfa_secret_encrypted) VALUES ('it',$1,$2,ARRAY['it_support'],true,'test-encrypted')`, id, id+"@example.test")
		require.NoError(t, err)
		credentials[i], err = service.Start(ctx, authn.RealmIT, id, time.Now())
		require.NoError(t, err)
		bearers[i] = signer.Sign(t, authntest.Token{Realm: authn.RealmIT, Subject: id, SessionID: credentials[i].Family.ID, Roles: []string{"it_support"}})
	}
	statuses := make([]int, 2)
	var wg sync.WaitGroup
	for i := range 2 {
		wg.Go(func() { statuses[i] = rawCall(http.MethodDelete, path+"/"+credentials[1-i].Family.ID, bearers[i]).Code })
	}
	wg.Wait()
	require.ElementsMatch(t, []int{204, 401}, statuses)
	require.Equal(t, 204, call(http.MethodDelete, path+"/"+actor.Family.ID, token).Code)
	require.Equal(t, 401, call(http.MethodGet, path, token).Code)
	_, err = service.Refresh(ctx, authn.RealmIT, actor.Token, time.Now())
	require.ErrorIs(t, err, sessions.ErrInvalid)
}
