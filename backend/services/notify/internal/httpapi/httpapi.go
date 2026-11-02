// Package httpapi exposes the notify use cases over HTTP, as described in api/openapi.yaml.
package httpapi

import (
	"encoding/base64"
	"errors"
	"net/http"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/authz"
	"platform.local/backend/pkg/catalog"
	"platform.local/backend/pkg/httpx"
	"platform.local/backend/pkg/problem"
	"platform.local/backend/services/notify/api"
	"platform.local/backend/services/notify/internal/app"
)

// Error codes returned as Problem detail.
const (
	CodeNotFound   = "message_not_found"
	CodeNotFailed  = "message_not_failed"
	CodeValidation = "validation_failed"
)

// Options configures the handlers.
type Options struct {
	Verifier *authn.Verifier
	// SendCallers are the service identities that may queue messages.
	SendCallers                  []string
	BodyLimit                    int64
	DefaultPageSize, MaxPageSize int32
}

type handler struct {
	svc  *app.Service
	opts Options
}

// Register adds the routes.
func Register(e *echo.Echo, svc *app.Service, opts Options) {
	h := &handler{svc: svc, opts: opts}
	e.GET("/v1/notify/openapi.yaml", func(c echo.Context) error { return c.Blob(http.StatusOK, "application/yaml", api.OpenAPI) })

	services := e.Group("/v1/notify", authn.Require(opts.Verifier, authn.RealmService), caller(opts.SendCallers))
	services.POST("/messages", h.queue)
	services.GET("/messages/:id", h.status)

	desk := e.Group("/v1/notify/desk", authn.Require(opts.Verifier, authn.RealmIT))
	desk.GET("/messages", h.list, authz.Require(catalog.ITAccess, "notifications", "read"))
	desk.GET("/summary", h.summary, authz.Require(catalog.ITAccess, "notifications", "read"))
	desk.GET("/messages/:id", h.detail, authz.Require(catalog.ITAccess, "notifications", "read"))
	desk.POST("/messages/:id/retry", h.retry, authz.Require(catalog.ITAccess, "notifications", "execute"))
	desk.POST("/test", h.test, authz.Require(catalog.ITAccess, "notifications", "execute"))
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
	case errors.Is(err, app.ErrNotFailed):
		return problem.New(http.StatusConflict, CodeNotFailed, "")
	}
	return err
}

type attachmentJSON struct {
	Filename    string `json:"filename" validate:"required,max=200"`
	ContentType string `json:"contentType" validate:"max=200"`
	// Content is the file, base64-encoded.
	Content string `json:"content" validate:"required"`
}

type queueJSON struct {
	Channel        string           `json:"channel" validate:"required,oneof=email whatsapp"`
	To             string           `json:"to" validate:"required,max=320"`
	Subject        string           `json:"subject" validate:"max=998"`
	Text           string           `json:"text"`
	HTML           string           `json:"html"`
	Attachments    []attachmentJSON `json:"attachments" validate:"max=10,dive"`
	IdempotencyKey string           `json:"idempotencyKey" validate:"required,max=200"`
	ActorID        string           `json:"actorId" validate:"max=64"`
}

func (h *handler) queue(c echo.Context) error {
	var in queueJSON
	if err := httpx.BindJSON(c, &in, h.opts.BodyLimit); err != nil {
		return err
	}
	input := app.Input{Channel: in.Channel, To: in.To, Subject: in.Subject, Text: in.Text, HTML: in.HTML,
		IdempotencyKey: in.IdempotencyKey, ActorID: in.ActorID}
	for i, a := range in.Attachments {
		content, err := base64.StdEncoding.DecodeString(a.Content)
		if err != nil {
			return problem.Validation(problem.FieldError{Field: "attachments[" + strconv.Itoa(i) + "].content", Code: "base64"})
		}
		input.Attachments = append(input.Attachments, app.Attachment{Filename: a.Filename, ContentType: a.ContentType, Content: content})
	}
	p, _ := authn.PrincipalFrom(c.Request().Context())
	msg, duplicate, err := h.svc.Queue(c.Request().Context(), p.Subject, input)
	if err != nil {
		return fail(err)
	}
	status := http.StatusAccepted
	if duplicate {
		status = http.StatusOK
	}
	return c.JSON(status, msg)
}

func (h *handler) status(c echo.Context) error {
	p, _ := authn.PrincipalFrom(c.Request().Context())
	msg, err := h.svc.ForCaller(c.Request().Context(), p.Subject, c.Param("id"))
	if err != nil {
		return fail(err)
	}
	return c.JSON(http.StatusOK, msg)
}

func (h *handler) list(c echo.Context) error {
	q := app.ListQuery{Status: c.QueryParam("status"), Channel: c.QueryParam("channel"), Limit: h.opts.DefaultPageSize}
	var errs []problem.FieldError
	if q.Status != "" && !slices.Contains([]string{"queued", "sent", "failed"}, q.Status) {
		errs = append(errs, problem.FieldError{Field: "status", Code: "oneof"})
	}
	if q.Channel != "" && q.Channel != app.Email && q.Channel != app.WhatsApp {
		errs = append(errs, problem.FieldError{Field: "channel", Code: "oneof"})
	}
	if raw := c.QueryParam("limit"); raw != "" {
		n, err := strconv.ParseInt(raw, 10, 32)
		if err != nil || n < 1 || n > int64(h.opts.MaxPageSize) {
			errs = append(errs, problem.FieldError{Field: "limit", Code: "range"})
		}
		q.Limit = int32(n)
	}
	if raw := c.QueryParam("cursor"); raw != "" {
		b, err := base64.RawURLEncoding.DecodeString(raw)
		when, id, found := strings.Cut(string(b), "|")
		t, terr := time.Parse(time.RFC3339Nano, when)
		if _, uerr := uuid.Parse(id); err != nil || !found || terr != nil || uerr != nil {
			errs = append(errs, problem.FieldError{Field: "cursor", Code: "invalid"})
		}
		q.BeforeCreated, q.BeforeID = t, id
	}
	if len(errs) > 0 {
		return problem.Validation(errs...)
	}
	items, err := h.svc.List(c.Request().Context(), q)
	if err != nil {
		return err
	}
	out := map[string]any{"items": items}
	if len(items) == int(q.Limit) {
		last := items[len(items)-1]
		out["nextCursor"] = base64.RawURLEncoding.EncodeToString([]byte(last.CreatedAt.Format(time.RFC3339Nano) + "|" + last.ID))
	}
	return c.JSON(http.StatusOK, out)
}

func (h *handler) summary(c echo.Context) error {
	counts, err := h.svc.Counts(c.Request().Context())
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, map[string]any{"items": counts})
}

func (h *handler) detail(c echo.Context) error {
	msg, err := h.svc.Detail(c.Request().Context(), c.Param("id"))
	if err != nil {
		return fail(err)
	}
	return c.JSON(http.StatusOK, msg)
}

func (h *handler) retry(c echo.Context) error {
	p, _ := authn.PrincipalFrom(c.Request().Context())
	msg, err := h.svc.Retry(c.Request().Context(), c.Param("id"), string(authn.RealmIT)+":"+p.Subject)
	if err != nil {
		return fail(err)
	}
	return c.JSON(http.StatusOK, msg)
}

type testJSON struct {
	Channel string `json:"channel" validate:"required,oneof=email whatsapp"`
	To      string `json:"to" validate:"required,max=320"`
}

func (h *handler) test(c echo.Context) error {
	var in testJSON
	if err := httpx.BindJSON(c, &in, 4096); err != nil {
		return err
	}
	p, _ := authn.PrincipalFrom(c.Request().Context())
	msg, err := h.svc.SendTest(c.Request().Context(), in.Channel, in.To, p.Subject)
	if err != nil {
		return fail(err)
	}
	return c.JSON(http.StatusAccepted, msg)
}
