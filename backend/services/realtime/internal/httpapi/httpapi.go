package httpapi
import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"slices"
	"strings"
	"time"
	"github.com/labstack/echo/v4"
	"github.com/prometheus/client_golang/prometheus"
	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/authz"
	"platform.local/backend/pkg/catalog"
	"platform.local/backend/pkg/httpx"
	"platform.local/backend/pkg/live"
	"platform.local/backend/pkg/problem"
	"platform.local/backend/services/realtime/api"
	"platform.local/backend/services/realtime/internal/app"
	"platform.local/backend/services/realtime/internal/hub"
)
const (
	CodeValidation		= "validation_failed"
	CodeNotFound		= "not_found"
	CodeTooManyStreams	= "too_many_streams"
)
type Options struct {
	Verifier	*authn.Verifier
	Callers		[]string
	Heartbeat	time.Duration
	MaxStreamAge	time.Duration
	Retry		time.Duration
	Buffer		int
	MaxTopics	int
	MaxPresenceIDs	int
	MaxSyncWindows	int
	Logger		*slog.Logger
	Registerer	prometheus.Registerer
}
type handler struct {
	svc	*app.Service
	hub	*hub.Hub
	opts	Options
	streams	prometheus.Gauge
}
func Register(e *echo.Echo, svc *app.Service, h *hub.Hub, opts Options) error {
	streams := prometheus.NewGauge(prometheus.GaugeOpts{Name: "realtime_open_streams", Help: "Open live streams on this replica."})
	if opts.Registerer != nil {
		if err := opts.Registerer.Register(streams); err != nil {
			return err
		}
	}
	hd := &handler{svc: svc, hub: h, opts: opts, streams: streams}
	e.GET("/v1/realtime/openapi.yaml", func(c echo.Context) error { return c.Blob(http.StatusOK, "application/yaml", api.OpenAPI) })
	services := e.Group("/v1/realtime", authn.Require(opts.Verifier, authn.RealmService), caller(opts.Callers))
	services.GET("/stream", hd.serviceStream)
	services.POST("/publish", hd.publish)
	services.GET("/presence", hd.presence(serviceRealm))
	services.GET("/status", hd.status(serviceUser))
	services.PUT("/status", hd.setStatus(serviceUser))
	services.DELETE("/status", hd.clearStatus(serviceUser))
	services.POST("/activity", hd.activity(serviceUser))
	services.PUT("/windows", hd.replaceWindow)
	services.DELETE("/windows", hd.removeWindow)
	services.POST("/windows/sync", hd.syncWindows)
	me := e.Group("/v1/realtime/me", authn.Require(opts.Verifier, authn.RealmIT))
	me.GET("/stream", hd.itStream)
	me.GET("/presence", hd.presence(itRealm))
	me.GET("/status", hd.status(itUser))
	me.PUT("/status", hd.setStatus(itUser))
	me.DELETE("/status", hd.clearStatus(itUser))
	me.POST("/activity", hd.activity(itUser))
	return nil
}
func caller(allowed []string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			p, ok := authn.PrincipalFrom(c.Request().Context())
			if !ok || !slices.Contains(allowed, p.Subject) {
				return problem.Forbidden("")
			}
			return next(c)
		}
	}
}
func fail(err error) error {
	switch {
	case errors.Is(err, app.ErrValidation):
		return problem.New(http.StatusUnprocessableEntity, CodeValidation, strings.TrimPrefix(err.Error(), app.ErrValidation.Error()+": "))
	case errors.Is(err, app.ErrNotFound):
		return problem.New(http.StatusNotFound, CodeNotFound, "")
	}
	return err
}
type user struct{ realm, id string }
type userFunc func(c echo.Context) (user, error)
func serviceUser(c echo.Context) (user, error) {
	u := user{realm: c.QueryParam("realm"), id: c.QueryParam("userId")}
	if !live.ValidRealm(u.realm) || !live.ValidID(u.id) {
		return u, problem.Validation(problem.FieldError{Field: "userId", Code: "invalid"})
	}
	return u, nil
}
func itUser(c echo.Context) (user, error) {
	p, ok := authn.PrincipalFrom(c.Request().Context())
	if !ok || !live.ValidID(p.Subject) {
		return user{}, problem.Unauthenticated("")
	}
	return user{realm: string(authn.RealmIT), id: p.Subject}, nil
}
type realmFunc func(c echo.Context) (string, error)
func serviceRealm(c echo.Context) (string, error) {
	realm := c.QueryParam("realm")
	if !live.ValidRealm(realm) {
		return "", problem.Validation(problem.FieldError{Field: "realm", Code: "oneof"})
	}
	return realm, nil
}
func itRealm(echo.Context) (string, error)	{ return string(authn.RealmIT), nil }
func splitList(raw string) []string {
	var out []string
	for _, part := range strings.Split(raw, ",") {
		if part = strings.TrimSpace(part); part != "" {
			out = append(out, part)
		}
	}
	return out
}
func (h *handler) serviceStream(c echo.Context) error {
	u, err := serviceUser(c)
	if err != nil {
		return err
	}
	topics := splitList(c.QueryParam("topics"))
	if len(topics) > h.opts.MaxTopics {
		return problem.Validation(problem.FieldError{Field: "topics", Code: "max"})
	}
	for _, t := range topics {
		if !live.ValidTopic(t) {
			return problem.Validation(problem.FieldError{Field: "topics", Code: "invalid"})
		}
	}
	session := c.QueryParam("session")
	if session != "" && !live.ValidID(session) {
		return problem.Validation(problem.FieldError{Field: "session", Code: "invalid"})
	}
	return h.stream(c, u, session, topics)
}
func itTopics(p authn.Principal) []string {
	var topics []string
	if authz.Allowed(catalog.ITAccess, p, "tickets", "read") {
		topics = append(topics, "it.tickets")
	}
	if authz.Allowed(catalog.ITAccess, p, "system_health", "read") {
		topics = append(topics, "it.platform")
	}
	return topics
}
func (h *handler) itStream(c echo.Context) error {
	u, err := itUser(c)
	if err != nil {
		return err
	}
	p, _ := authn.PrincipalFrom(c.Request().Context())
	session := ""
	if live.ValidID(p.SessionID) {
		session = p.SessionID
	}
	return h.stream(c, u, session, itTopics(p))
}
type publishJSON struct {
	Topics	[]string	`json:"topics" validate:"max=50"`
	Users	[]struct {
		Realm	string	`json:"realm" validate:"required"`
		ID	string	`json:"id" validate:"required,max=128"`
	}	`json:"users" validate:"max=500,dive"`
	Type	string		`json:"type" validate:"required,max=100"`
	Data	json.RawMessage	`json:"data"`
}
func (h *handler) publish(c echo.Context) error {
	var in publishJSON
	if err := httpx.BindJSON(c, &in, 64<<10); err != nil {
		return err
	}
	users := make([]live.Target, 0, len(in.Users))
	for _, u := range in.Users {
		users = append(users, live.Target{Realm: u.Realm, ID: u.ID})
	}
	ev := live.Event{Type: in.Type, Data: in.Data}
	if len(ev.Data) > 0 && ev.Data[0] != '{' {
		return problem.Validation(problem.FieldError{Field: "data", Code: "object"})
	}
	if err := h.svc.Publish(c.Request().Context(), in.Topics, users, ev); err != nil {
		return fail(err)
	}
	return c.NoContent(http.StatusAccepted)
}
func (h *handler) presence(realmOf realmFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		realm, err := realmOf(c)
		if err != nil {
			return err
		}
		ids := splitList(c.QueryParam("ids"))
		if len(ids) > h.opts.MaxPresenceIDs {
			return problem.Validation(problem.FieldError{Field: "ids", Code: "max"})
		}
		items, err := h.svc.Presence(c.Request().Context(), realm, ids)
		if err != nil {
			return fail(err)
		}
		return c.JSON(http.StatusOK, map[string]any{"items": items})
	}
}
func (h *handler) status(who userFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		u, err := who(c)
		if err != nil {
			return err
		}
		mine, err := h.svc.Mine(c.Request().Context(), u.realm, u.id)
		if err != nil {
			return fail(err)
		}
		return c.JSON(http.StatusOK, mine)
	}
}
type statusJSON struct {
	Status		string		`json:"status" validate:"required,max=64"`
	Message		*string		`json:"message" validate:"omitempty,max=1000"`
	ExpiresAt	*time.Time	`json:"expiresAt"`
}
func (h *handler) setStatus(who userFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		u, err := who(c)
		if err != nil {
			return err
		}
		var in statusJSON
		if err := httpx.BindJSON(c, &in, 4096); err != nil {
			return err
		}
		mine, err := h.svc.SetStatus(c.Request().Context(), u.realm, u.id, app.Chosen{Status: in.Status, Message: in.Message, ExpiresAt: in.ExpiresAt})
		if err != nil {
			return fail(err)
		}
		return c.JSON(http.StatusOK, mine)
	}
}
func (h *handler) clearStatus(who userFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		u, err := who(c)
		if err != nil {
			return err
		}
		mine, err := h.svc.ClearStatus(c.Request().Context(), u.realm, u.id)
		if err != nil {
			return fail(err)
		}
		return c.JSON(http.StatusOK, mine)
	}
}
type activityJSON struct {
	State string `json:"state" validate:"required,oneof=active idle"`
}
func (h *handler) activity(who userFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		u, err := who(c)
		if err != nil {
			return err
		}
		var in activityJSON
		if err := httpx.BindJSON(c, &in, 1024); err != nil {
			return err
		}
		if err := h.svc.SetActivity(c.Request().Context(), u.realm, u.id, in.State == "idle"); err != nil {
			return fail(err)
		}
		return c.NoContent(http.StatusNoContent)
	}
}
type windowJSON struct {
	SourceID	string		`json:"sourceId" validate:"required,max=100"`
	Kind		string		`json:"kind" validate:"required,max=32"`
	StartsAt	time.Time	`json:"startsAt" validate:"required"`
	EndsAt		time.Time	`json:"endsAt" validate:"required"`
	UserIDs		[]string	`json:"userIds" validate:"max=500"`
}
type replaceWindowJSON struct {
	Realm	string	`json:"realm" validate:"required"`
	Source	string	`json:"source" validate:"required,max=32"`
	windowJSON
}
func (w windowJSON) input() app.WindowInput {
	return app.WindowInput{SourceID: w.SourceID, Kind: w.Kind, StartsAt: w.StartsAt, EndsAt: w.EndsAt, UserIDs: w.UserIDs}
}
func (h *handler) replaceWindow(c echo.Context) error {
	var in replaceWindowJSON
	if err := httpx.BindJSON(c, &in, 64<<10); err != nil {
		return err
	}
	if err := h.svc.ReplaceWindow(c.Request().Context(), in.Realm, in.Source, in.input()); err != nil {
		return fail(err)
	}
	return c.NoContent(http.StatusNoContent)
}
func (h *handler) removeWindow(c echo.Context) error {
	if err := h.svc.RemoveWindow(c.Request().Context(), c.QueryParam("realm"), c.QueryParam("source"), c.QueryParam("sourceId")); err != nil {
		return fail(err)
	}
	return c.NoContent(http.StatusNoContent)
}
type syncJSON struct {
	Realm	string		`json:"realm" validate:"required"`
	Source	string		`json:"source" validate:"required,max=32"`
	From	time.Time	`json:"from" validate:"required"`
	Until	time.Time	`json:"until" validate:"required"`
	Windows	[]windowJSON	`json:"windows" validate:"dive"`
}
func (h *handler) syncWindows(c echo.Context) error {
	var in syncJSON
	if err := httpx.BindJSON(c, &in, 8<<20); err != nil {
		return err
	}
	windows := make([]app.WindowInput, 0, len(in.Windows))
	for _, w := range in.Windows {
		windows = append(windows, w.input())
	}
	stored, err := h.svc.SyncWindows(c.Request().Context(), in.Realm, in.Source, in.From, in.Until, windows, h.opts.MaxSyncWindows)
	if err != nil {
		return fail(err)
	}
	return c.JSON(http.StatusOK, map[string]int{"stored": stored})
}
