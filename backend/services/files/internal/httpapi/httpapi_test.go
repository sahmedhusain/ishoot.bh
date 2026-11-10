package httpapi_test
import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strconv"
	"strings"
	"testing"
	"time"
	"github.com/getkin/kin-openapi/openapi3"
	"github.com/getkin/kin-openapi/openapi3filter"
	"github.com/getkin/kin-openapi/routers"
	"github.com/getkin/kin-openapi/routers/gorillamux"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/authn/authntest"
	"platform.local/backend/pkg/config"
	"platform.local/backend/pkg/db"
	"platform.local/backend/pkg/httpx"
	"platform.local/backend/pkg/logx"
	"platform.local/backend/pkg/migrate"
	"platform.local/backend/pkg/objectstore"
	"platform.local/backend/pkg/testkit"
	"platform.local/backend/services/files/api"
	"platform.local/backend/services/files/internal/app"
	"platform.local/backend/services/files/internal/httpapi"
	"platform.local/backend/services/files/internal/postgres"
	"platform.local/backend/services/files/migrations"
)
var pdf = []byte("%PDF-1.7 integration test document")
type env struct {
	t	*testing.T
	handler	http.Handler
	token	string
	router	routers.Router
	svc	*app.Service
}
func setup(t *testing.T) *env {
	t.Helper()
	ctx := context.Background()
	s3 := testkit.S3(t)
	logger := logx.New(io.Discard, logx.Options{})
	pool, err := db.Open(ctx, db.Config{
		URL:	testkit.Postgres(t), MaxConns: 4, MaxConnLifetime: time.Minute, MaxConnIdleTime: time.Minute,
		HealthCheckPeriod:	time.Minute, StatementTimeout: 10 * time.Second,
	}, logger.Logger)
	require.NoError(t, err)
	t.Cleanup(pool.Close)
	require.NoError(t, migrate.Run(ctx, pool, migrate.Options{Schema: "files", Migrations: migrations.FS, WithRiver: true, Logger: logger.Logger}))
	store := objectstore.New(objectstore.Config{Endpoint: s3.Endpoint, Region: "us-east-1", AccessKeyID: s3.AccessKeyID,
		SecretAccessKey:	s3.SecretAccessKey, UsePathStyle: true, Timeout: 10 * time.Second})
	require.Eventually(t, func() bool {
		return store.EnsureBucket(ctx, "public-assets") == nil && store.EnsureBucket(ctx, "private-assets") == nil
	}, 30*time.Second, 500*time.Millisecond)
	svc := app.New(postgres.New(pool), store, app.Options{
		PublicBucket:	"public-assets", PrivateBucket: "private-assets", MaxFileSize: 1 << 20,
		UploadTTL:	time.Hour, LookupLimit: 10, CleanupBatch: 10,
	})
	var cfg config.Common
	require.NoError(t, config.LoadFrom(&cfg, map[string]string{"SERVICE_NAME": "files", "APP_ENV": "test", "HTTP_BODY_LIMIT": "2M"}))
	e, err := httpx.New(cfg, logger, nil)
	require.NoError(t, err)
	caller := authntest.NewServiceSigner(t, "admin")
	httpapi.Register(e.Group("/v1/files", authn.Require(authn.NewVerifier(time.Second, caller.Trust()), authn.RealmService)), svc, 4096)
	doc, err := openapi3.NewLoader().LoadFromData(api.OpenAPI)
	require.NoError(t, err)
	require.NoError(t, doc.Validate(ctx))
	router, err := gorillamux.NewRouter(doc)
	require.NoError(t, err)
	return &env{t: t, handler: e, token: caller.Sign(t, authntest.Token{Subject: "admin"}), router: router, svc: svc}
}
func (e *env) call(method, path string, query url.Values, body []byte, contentType string) *httptest.ResponseRecorder {
	e.t.Helper()
	target := path
	if len(query) > 0 {
		target += "?" + query.Encode()
	}
	req := httptest.NewRequest(method, target, bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+e.token)
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	rec := httptest.NewRecorder()
	e.handler.ServeHTTP(rec, req)
	route, params, err := e.router.FindRoute(httptest.NewRequest(method, "http://localhost"+target, nil))
	require.NoError(e.t, err, "%s %s is not in the OpenAPI document", method, path)
	opts := &openapi3filter.Options{IncludeResponseStatus: true}
	if !strings.Contains(rec.Header().Get("Content-Type"), "json") {
		opts.ExcludeResponseBody = true
	}
	input := &openapi3filter.ResponseValidationInput{
		RequestValidationInput: &openapi3filter.RequestValidationInput{Request: req, PathParams: params, Route: route,
			Options:	&openapi3filter.Options{AuthenticationFunc: openapi3filter.NoopAuthenticationFunc}},
		Status:	rec.Code, Header: rec.Header(),
		Options:	opts,
	}
	input.SetBodyBytes(rec.Body.Bytes())
	require.NoError(e.t, openapi3filter.ValidateResponse(context.Background(), input), "response breaks the contract: %s", rec.Body)
	return rec
}
func (e *env) json(method, path string, payload any) *httptest.ResponseRecorder {
	body, err := json.Marshal(payload)
	require.NoError(e.t, err)
	return e.call(method, path, nil, body, "application/json")
}
func decode[T any](t *testing.T, rec *httptest.ResponseRecorder) T {
	var v T
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &v))
	return v
}
type problemBody struct {
	Code string `json:"code"`
}
func checkUploadFlow(t *testing.T, e *env) {
	rec := e.json(http.MethodPost, "/v1/files/uploads", map[string]any{
		"ownerId":	"user-1", "folder": "general", "fileName": "contract.pdf", "mimeType": "application/pdf", "fileSize": len(pdf),
	})
	require.Equal(t, http.StatusCreated, rec.Code, rec.Body.String())
	file := decode[httpapi.File](t, rec)
	rec = e.json(http.MethodPost, "/v1/files/uploads/verify", map[string]any{"fileUrl": file.FileURL, "ownerId": "user-1"})
	assert.Equal(t, http.StatusUnprocessableEntity, rec.Code, "nothing has arrived yet")
	assert.Equal(t, httpapi.CodeContentMismatch, decode[problemBody](t, rec).Code)
	rec = e.call(http.MethodPut, "/v1/files/uploads/content", url.Values{"fileUrl": {file.FileURL}, "ownerId": {"user-1"}}, pdf, "application/octet-stream")
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	rec = e.json(http.MethodPost, "/v1/files/uploads/claim", map[string]any{"fileUrl": file.FileURL, "ownerId": "someone-else"})
	assert.Equal(t, http.StatusForbidden, rec.Code)
	rec = e.json(http.MethodPost, "/v1/files/uploads/claim", map[string]any{"fileUrl": file.FileURL, "ownerId": "user-1", "requirePrivate": true})
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	assert.NotNil(t, decode[httpapi.File](t, rec).ClaimedAt)
	rec = e.json(http.MethodPost, "/v1/files/uploads/claim", map[string]any{"fileUrl": file.FileURL, "ownerId": "user-1"})
	assert.Equal(t, http.StatusConflict, rec.Code)
	rec = e.call(http.MethodGet, "/v1/files/content", url.Values{"fileUrl": {file.FileURL}}, nil, "")
	require.Equal(t, http.StatusOK, rec.Code)
	assert.Equal(t, pdf, rec.Body.Bytes())
	assert.Equal(t, "application/pdf", rec.Header().Get("Content-Type"))
	assert.Equal(t, strconv.Itoa(len(pdf)), rec.Header().Get("Content-Length"))
	assert.Equal(t, "false", rec.Header().Get("X-File-Public"))
	rec = e.call(http.MethodGet, "/v1/files/records", url.Values{"fileUrl": {file.FileURL, "/api/files/general/none.pdf"}}, nil, "")
	require.Equal(t, http.StatusOK, rec.Code)
	assert.Len(t, decode[struct{ Items []httpapi.File }](t, rec).Items, 1)
}
func checkStoreAndDelete(t *testing.T, e *env) {
	target := url.Values{"fileUrl": {"/api/files/general/inquiry_abc.pdf"}, "fileName": {"brief.pdf"}}
	rec := e.call(http.MethodPut, "/v1/files/content", target, pdf, "application/octet-stream")
	require.Equal(t, http.StatusCreated, rec.Code, rec.Body.String())
	assert.Equal(t, "brief.pdf", decode[httpapi.File](t, rec).FileName)
	rec = e.call(http.MethodPut, "/v1/files/content", target, pdf, "application/octet-stream")
	assert.Equal(t, http.StatusConflict, rec.Code)
	rec = e.call(http.MethodPut, "/v1/files/content", url.Values{"fileUrl": {"/api/files/general/x.png"}}, pdf, "application/octet-stream")
	assert.Equal(t, http.StatusUnprocessableEntity, rec.Code, "bytes must match the address's type")
	rec = e.call(http.MethodPut, "/v1/files/content", url.Values{"folder": {"general"}, "namePrefix": {"customer"}}, pdf, "application/octet-stream")
	require.Equal(t, http.StatusCreated, rec.Code, rec.Body.String())
	assert.Contains(t, decode[httpapi.File](t, rec).FileURL, "/api/files/general/customer_")
	rec = e.call(http.MethodPut, "/v1/files/content", url.Values{"fileUrl": {"/api/files/general/a.pdf"}, "folder": {"general"}}, pdf, "application/octet-stream")
	assert.Equal(t, http.StatusUnprocessableEntity, rec.Code, "either an address or a folder")
	rec = e.call(http.MethodDelete, "/v1/files/content", url.Values{"fileUrl": {"/api/files/general/inquiry_abc.pdf"}}, nil, "")
	assert.Equal(t, http.StatusNoContent, rec.Code)
	rec = e.call(http.MethodGet, "/v1/files/content", url.Values{"fileUrl": {"/api/files/general/inquiry_abc.pdf"}}, nil, "")
	assert.Equal(t, http.StatusNotFound, rec.Code)
}
func checkValidationAndAuth(t *testing.T, e *env) {
	rec := e.json(http.MethodPost, "/v1/files/uploads", map[string]any{
		"ownerId":	"u", "folder": "general", "fileName": "x.html", "mimeType": "text/html", "fileSize": 10,
	})
	assert.Equal(t, http.StatusUnsupportedMediaType, rec.Code)
	rec = e.json(http.MethodPost, "/v1/files/uploads", map[string]any{
		"ownerId":	"u", "folder": "general", "fileName": "big.pdf", "mimeType": "application/pdf", "fileSize": 2 << 20,
	})
	assert.Equal(t, http.StatusRequestEntityTooLarge, rec.Code)
	assert.Contains(t, rec.Body.String(), `"maxFileSize":1048576`)
	rec = e.json(http.MethodPost, "/v1/files/uploads", map[string]any{"ownerId": "u"})
	assert.Equal(t, http.StatusUnprocessableEntity, rec.Code)
	req := httptest.NewRequest(http.MethodGet, "/v1/files/records?fileUrl=x", nil)
	out := httptest.NewRecorder()
	e.handler.ServeHTTP(out, req)
	assert.Equal(t, http.StatusUnauthorized, out.Code, "no token")
	staff := authntest.NewSigner(t, "identity-1")
	req.Header.Set("Authorization", "Bearer "+staff.Sign(t, authntest.Token{}))
	out = httptest.NewRecorder()
	e.handler.ServeHTTP(out, req)
	assert.Equal(t, http.StatusUnauthorized, out.Code, "user tokens are not accepted")
}
func checkCleanupRemovesExpiredUploads(t *testing.T, e *env) {
	rec := e.json(http.MethodPost, "/v1/files/uploads", map[string]any{
		"ownerId":	"u", "folder": "general", "fileName": "a.pdf", "mimeType": "application/pdf", "fileSize": len(pdf),
	})
	require.Equal(t, http.StatusCreated, rec.Code)
	n, err := e.svc.CleanupExpired(context.Background())
	require.NoError(t, err)
	assert.Zero(t, n, "the upload has not expired yet")
}
func TestAPI(t *testing.T) {
	e := setup(t)
	for name, check := range map[string]func(*testing.T, *env){
		"upload flow":		checkUploadFlow,
		"store and delete":	checkStoreAndDelete,
		"validation and auth":	checkValidationAndAuth,
		"cleanup":		checkCleanupRemovesExpiredUploads,
	} {
		t.Run(name, func(t *testing.T) {
			e.t = t
			check(t, e)
		})
	}
}
