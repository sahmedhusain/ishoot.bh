// Package httpapi exposes the itsm use cases over HTTP, as described in api/openapi.yaml.
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
	"platform.local/backend/services/itsm/api"
	"platform.local/backend/services/itsm/internal/app"
	"platform.local/backend/services/itsm/internal/domain"
	"platform.local/backend/services/itsm/internal/postgres"
)

// Problem codes this service returns, besides the shared ones.
const (
	CodeNotFound   = "ticket_not_found"
	CodeTransition = "transition_not_allowed"
)

// Options configures the handlers.
type Options struct {
	JSONBodyLimit   int64
	DefaultPageSize int32
	MaxPageSize     int32
	RequestCallers  []string // service callers allowed to act for requesters
	Verifier        *authn.Verifier
}

type handler struct {
	svc  *app.Service
	opts Options
}

// Register adds the routes.
func Register(e *echo.Echo, svc *app.Service, opts Options) {
	h := &handler{svc: svc, opts: opts}
	e.GET("/v1/itsm/openapi.yaml", func(c echo.Context) error { return c.Blob(http.StatusOK, "application/yaml", api.OpenAPI) })

	requests := e.Group("/v1/itsm/requests", authn.Require(opts.Verifier, authn.RealmService), h.allowedCaller)
	requests.POST("/tickets", h.create)
	requests.GET("/tickets", h.listMine)
	requests.GET("/tickets/:id", h.getMine, knownTicket)
	requests.POST("/tickets/:id/comments", h.commentMine, knownTicket)
	requests.POST("/tickets/:id/transitions", h.transitionMine, knownTicket)

	desk := e.Group("/v1/itsm/desk", authn.Require(opts.Verifier, authn.RealmIT))
	read := authz.Require(catalog.ITAccess, "tickets", "read")
	edit := authz.Require(catalog.ITAccess, "tickets", "edit")
	desk.GET("/tickets", h.queue, read)
	desk.GET("/stats", h.stats, read)
	desk.GET("/tickets/:id", h.detail, read, knownTicket)
	desk.POST("/tickets/:id/transitions", h.transitionDesk, edit, knownTicket)
	desk.POST("/tickets/:id/comments", h.commentDesk, edit, knownTicket)
	desk.GET("/sla", h.listSLA, authz.Require(catalog.ITAccess, "ticket_settings", "read"))
	desk.PUT("/sla/:priority", h.updateSLA, authz.Require(catalog.ITAccess, "ticket_settings", "edit"))
}

// knownTicket answers 404 for a ticket ID that cannot exist, before it reaches the database.
func knownTicket(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		if _, err := uuid.Parse(c.Param("id")); err != nil {
			return problem.New(http.StatusNotFound, CodeNotFound, "")
		}
		return next(c)
	}
}

func (h *handler) allowedCaller(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		p, ok := authn.PrincipalFrom(c.Request().Context())
		if !ok || !slices.Contains(h.opts.RequestCallers, p.Subject) {
			return problem.Forbidden("")
		}
		return next(c)
	}
}

// --- JSON shapes -----------------------------------------------------------------------------------------------

type ticketJSON struct {
	ID              string     `json:"id"`
	Number          int64      `json:"number"`
	RequesterID     string     `json:"requesterId"`
	RequesterName   string     `json:"requesterName"`
	RequesterEmail  string     `json:"requesterEmail,omitempty"`
	Category        string     `json:"category"`
	Subcategory     string     `json:"subcategory"`
	Priority        string     `json:"priority"`
	Status          string     `json:"status"`
	Title           string     `json:"title"`
	Description     string     `json:"description"`
	AssetRef        *string    `json:"assetRef,omitempty"`
	AssigneeID      *string    `json:"assigneeId,omitempty"`
	AssigneeName    *string    `json:"assigneeName,omitempty"`
	RespondBy       time.Time  `json:"respondBy"`
	ResolveBy       time.Time  `json:"resolveBy"`
	FirstResponseAt *time.Time `json:"firstResponseAt,omitempty"`
	Breached        bool       `json:"breached"`
	ResolvedAt      *time.Time `json:"resolvedAt,omitempty"`
	ClosedAt        *time.Time `json:"closedAt,omitempty"`
	CreatedAt       time.Time  `json:"createdAt"`
	UpdatedAt       time.Time  `json:"updatedAt"`
}

func toTicket(t postgres.Ticket, forIT bool) ticketJSON {
	out := ticketJSON{
		ID: t.ID, Number: t.Number, RequesterID: t.RequesterID, RequesterName: t.RequesterName, Category: t.Category,
		Subcategory: t.Subcategory, Priority: t.Priority, Status: t.Status, Title: t.Title, Description: t.Description,
		AssetRef: t.AssetRef, AssigneeName: t.AssigneeName, RespondBy: t.RespondBy, ResolveBy: t.ResolveBy,
		FirstResponseAt: t.FirstResponseAt, Breached: t.BreachedAt != nil, ResolvedAt: t.ResolvedAt, ClosedAt: t.ClosedAt,
		CreatedAt: t.CreatedAt, UpdatedAt: t.UpdatedAt,
	}
	if forIT {
		out.RequesterEmail, out.AssigneeID = t.RequesterEmail, t.AssigneeID
	}
	return out
}

type commentJSON struct {
	ID          string    `json:"id"`
	AuthorRealm string    `json:"authorRealm"`
	AuthorName  string    `json:"authorName"`
	Body        string    `json:"body"`
	Internal    bool      `json:"internal"`
	CreatedAt   time.Time `json:"createdAt"`
}

func toComment(c postgres.Comment) commentJSON {
	return commentJSON{ID: c.ID, AuthorRealm: c.AuthorRealm, AuthorName: c.AuthorName, Body: c.Body, Internal: c.Internal, CreatedAt: c.CreatedAt}
}

type eventJSON struct {
	Kind       string    `json:"kind"`
	ActorRealm string    `json:"actorRealm"`
	ActorID    string    `json:"actorId,omitempty"`
	FromStatus *string   `json:"fromStatus,omitempty"`
	ToStatus   *string   `json:"toStatus,omitempty"`
	CreatedAt  time.Time `json:"createdAt"`
}

type attachmentJSON struct {
	FileURL  string `json:"fileUrl" validate:"required,max=300"`
	FileName string `json:"fileName" validate:"required,max=200"`
	MIMEType string `json:"mimeType" validate:"required,max=100"`
	FileSize int64  `json:"fileSize" validate:"gt=0"`
}

func toDetail(d app.Detail, forIT bool) map[string]any {
	comments := make([]commentJSON, len(d.Comments))
	for i, c := range d.Comments {
		comments[i] = toComment(c)
	}
	events := make([]eventJSON, len(d.Events))
	for i, e := range d.Events {
		events[i] = eventJSON{Kind: e.Kind, ActorRealm: e.ActorRealm, FromStatus: e.FromStatus, ToStatus: e.ToStatus, CreatedAt: e.CreatedAt}
		if forIT {
			events[i].ActorID = e.ActorID
		}
	}
	attachments := make([]attachmentJSON, len(d.Attachments))
	for i, a := range d.Attachments {
		attachments[i] = attachmentJSON{FileURL: a.FileUrl, FileName: a.FileName, MIMEType: a.MimeType, FileSize: a.FileSize}
	}
	return map[string]any{"ticket": toTicket(d.Ticket, forIT), "comments": comments, "events": events, "attachments": attachments}
}

// --- paging ----------------------------------------------------------------------------------------------------

func (h *handler) page(c echo.Context) (*postgres.Cursor, int32, error) {
	size := h.opts.DefaultPageSize
	if raw := c.QueryParam("limit"); raw != "" {
		n, err := strconv.ParseInt(raw, 10, 32)
		if err != nil || n < 1 || n > int64(h.opts.MaxPageSize) {
			return nil, 0, problem.Validation(problem.FieldError{Field: "limit", Code: "range"})
		}
		size = int32(n)
	}
	raw := c.QueryParam("cursor")
	if raw == "" {
		return nil, size, nil
	}
	decoded, err := base64.RawURLEncoding.DecodeString(raw)
	at, id, ok := strings.Cut(string(decoded), "|")
	when, perr := time.Parse(time.RFC3339Nano, at)
	if err != nil || !ok || perr != nil || id == "" {
		return nil, 0, problem.Validation(problem.FieldError{Field: "cursor", Code: "invalid"})
	}
	return &postgres.Cursor{CreatedAt: when, ID: id}, size, nil
}

func pageJSON(rows []postgres.Ticket, size int32, forIT bool) map[string]any {
	items := make([]ticketJSON, len(rows))
	for i, t := range rows {
		items[i] = toTicket(t, forIT)
	}
	out := map[string]any{"items": items}
	if len(rows) == int(size) && size > 0 {
		last := rows[len(rows)-1]
		out["nextCursor"] = base64.RawURLEncoding.EncodeToString([]byte(last.CreatedAt.Format(time.RFC3339Nano) + "|" + last.ID))
	}
	return out
}

// --- requests (employees through the admin app) -----------------------------------------------------------------

type newTicketRequest struct {
	RequesterID    string           `json:"requesterId" validate:"required,max=64"`
	RequesterName  string           `json:"requesterName" validate:"required,max=200"`
	RequesterEmail string           `json:"requesterEmail" validate:"required,email,max=254"`
	Category       string           `json:"category" validate:"required,max=40"`
	Subcategory    string           `json:"subcategory" validate:"required,max=40"`
	Priority       string           `json:"priority" validate:"max=20"`
	Title          string           `json:"title" validate:"required,max=200"`
	Description    string           `json:"description" validate:"required,max=10000"`
	AssetRef       string           `json:"assetRef" validate:"max=100"`
	Attachments    []attachmentJSON `json:"attachments" validate:"dive"`
}

func (h *handler) create(c echo.Context) error {
	var in newTicketRequest
	if err := httpx.BindJSON(c, &in, h.opts.JSONBodyLimit); err != nil {
		return err
	}
	n := domain.NewTicket{RequesterID: in.RequesterID, RequesterName: in.RequesterName, RequesterEmail: in.RequesterEmail,
		Category: in.Category, Subcategory: in.Subcategory, Priority: in.Priority, Title: in.Title, Description: in.Description,
		AssetRef: in.AssetRef}
	for _, a := range in.Attachments {
		n.Attachments = append(n.Attachments, domain.Attachment{FileURL: a.FileURL, FileName: a.FileName, MIMEType: a.MIMEType, Size: a.FileSize})
	}
	t, err := h.svc.Create(c.Request().Context(), n)
	if err != nil {
		return toProblem(err)
	}
	return c.JSON(http.StatusCreated, toTicket(t, false))
}

func requesterParam(c echo.Context) (string, error) {
	id := c.QueryParam("requesterId")
	if id == "" || len(id) > 64 {
		return "", problem.Validation(problem.FieldError{Field: "requesterId", Code: "required"})
	}
	return id, nil
}

func (h *handler) listMine(c echo.Context) error {
	requester, err := requesterParam(c)
	if err != nil {
		return err
	}
	cursor, size, err := h.page(c)
	if err != nil {
		return err
	}
	rows, err := h.svc.ListMine(c.Request().Context(), requester, c.QueryParam("status"), cursor, size)
	if err != nil {
		return toProblem(err)
	}
	return c.JSON(http.StatusOK, pageJSON(rows, size, false))
}

func (h *handler) getMine(c echo.Context) error {
	requester, err := requesterParam(c)
	if err != nil {
		return err
	}
	d, err := h.svc.GetMine(c.Request().Context(), c.Param("id"), requester)
	if err != nil {
		return toProblem(err)
	}
	return c.JSON(http.StatusOK, toDetail(d, false))
}

type requesterBody struct {
	RequesterID   string `json:"requesterId" validate:"required,max=64"`
	RequesterName string `json:"requesterName" validate:"required,max=200"`
	Body          string `json:"body" validate:"omitempty,max=10000"`
	Transition    string `json:"transition" validate:"omitempty,max=40"`
}

func (h *handler) commentMine(c echo.Context) error {
	var in requesterBody
	if err := httpx.BindJSON(c, &in, h.opts.JSONBodyLimit); err != nil {
		return err
	}
	comment, err := h.svc.CommentAsRequester(c.Request().Context(), c.Param("id"), app.Requester{ID: in.RequesterID, Name: in.RequesterName}, in.Body)
	if err != nil {
		return toProblem(err)
	}
	return c.JSON(http.StatusCreated, toComment(comment))
}

func (h *handler) transitionMine(c echo.Context) error {
	var in requesterBody
	if err := httpx.BindJSON(c, &in, h.opts.JSONBodyLimit); err != nil {
		return err
	}
	t, err := h.svc.TransitionAsRequester(c.Request().Context(), c.Param("id"), app.Requester{ID: in.RequesterID, Name: in.RequesterName}, in.Transition)
	if err != nil {
		return toProblem(err)
	}
	return c.JSON(http.StatusOK, toTicket(t, false))
}

// --- desk (IT staff) -------------------------------------------------------------------------------------------

func principal(c echo.Context) authn.Principal {
	p, _ := authn.PrincipalFrom(c.Request().Context())
	return p
}

func (h *handler) queue(c echo.Context) error {
	cursor, size, err := h.page(c)
	if err != nil {
		return err
	}
	q := c.QueryParams()
	rows, err := h.svc.Queue(c.Request().Context(), postgres.Filter{
		Status: q.Get("status"), AssigneeID: q.Get("assigneeId"), Priority: q.Get("priority"), OpenOnly: q.Get("open") == "true",
	}, cursor, size)
	if err != nil {
		return toProblem(err)
	}
	return c.JSON(http.StatusOK, pageJSON(rows, size, true))
}

type statsJSON struct {
	Open       int64            `json:"open"`
	Breached   int64            `json:"breached"`
	Unassigned int64            `json:"unassigned"`
	ByStatus   map[string]int64 `json:"byStatus"`
	ByPriority map[string]int64 `json:"byPriority"`
}

func (h *handler) stats(c echo.Context) error {
	st, err := h.svc.Stats(c.Request().Context())
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, statsJSON{Open: st.Open, Breached: st.Breached, Unassigned: st.Unassigned, ByStatus: st.ByStatus, ByPriority: st.ByPriority})
}

func (h *handler) detail(c echo.Context) error {
	d, err := h.svc.Detail(c.Request().Context(), c.Param("id"))
	if err != nil {
		return toProblem(err)
	}
	return c.JSON(http.StatusOK, toDetail(d, true))
}

type deskTransition struct {
	Transition   string `json:"transition" validate:"required,max=40"`
	AssigneeID   string `json:"assigneeId" validate:"max=64"`
	AssigneeName string `json:"assigneeName" validate:"max=200"`
}

func (h *handler) transitionDesk(c echo.Context) error {
	var in deskTransition
	if err := httpx.BindJSON(c, &in, h.opts.JSONBodyLimit); err != nil {
		return err
	}
	p := principal(c)
	if in.Transition == domain.TransitionAssign && !authz.Allowed(catalog.ITAccess, p, "tickets", "assign") {
		return problem.Forbidden("")
	}
	t, err := h.svc.TransitionAsIT(c.Request().Context(), c.Param("id"), p, in.Transition, in.AssigneeID, in.AssigneeName)
	if err != nil {
		return toProblem(err)
	}
	return c.JSON(http.StatusOK, toTicket(t, true))
}

type deskComment struct {
	Body     string `json:"body" validate:"required,max=10000"`
	Internal bool   `json:"internal"`
}

func (h *handler) commentDesk(c echo.Context) error {
	var in deskComment
	if err := httpx.BindJSON(c, &in, h.opts.JSONBodyLimit); err != nil {
		return err
	}
	comment, err := h.svc.CommentAsIT(c.Request().Context(), c.Param("id"), principal(c), in.Body, in.Internal)
	if err != nil {
		return toProblem(err)
	}
	return c.JSON(http.StatusCreated, toComment(comment))
}

type slaJSON struct {
	Priority        string    `json:"priority"`
	ResponseMinutes int32     `json:"responseMinutes"`
	ResolveMinutes  int32     `json:"resolveMinutes"`
	UpdatedBy       *string   `json:"updatedBy,omitempty"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

func (h *handler) listSLA(c echo.Context) error {
	rows, err := h.svc.SLA(c.Request().Context())
	if err != nil {
		return err
	}
	items := make([]slaJSON, len(rows))
	for i, r := range rows {
		items[i] = slaJSON{Priority: r.Priority, ResponseMinutes: r.ResponseMinutes, ResolveMinutes: r.ResolveMinutes, UpdatedBy: r.UpdatedBy, UpdatedAt: r.UpdatedAt}
	}
	return c.JSON(http.StatusOK, map[string]any{"items": items})
}

type slaUpdate struct {
	ResponseMinutes int32 `json:"responseMinutes" validate:"gt=0"`
	ResolveMinutes  int32 `json:"resolveMinutes" validate:"gt=0"`
}

func (h *handler) updateSLA(c echo.Context) error {
	var in slaUpdate
	if err := httpx.BindJSON(c, &in, h.opts.JSONBodyLimit); err != nil {
		return err
	}
	err := h.svc.UpdateSLA(c.Request().Context(), principal(c), domain.Policy{Priority: c.Param("priority"), ResponseMinutes: in.ResponseMinutes, ResolveMinutes: in.ResolveMinutes})
	if err != nil {
		return toProblem(err)
	}
	return c.NoContent(http.StatusNoContent)
}

// toProblem maps domain errors; anything else stays an internal error (logged, never shown).
func toProblem(err error) error {
	var ve *domain.ValidationError
	switch {
	case errors.As(err, &ve):
		return problem.Validation(problem.FieldError{Field: ve.Field, Code: ve.Code})
	case errors.Is(err, domain.ErrNotFound):
		return problem.New(http.StatusNotFound, CodeNotFound, "")
	case errors.Is(err, domain.ErrTransition):
		return problem.New(http.StatusConflict, CodeTransition, "")
	case errors.Is(err, domain.ErrForbidden):
		return problem.Forbidden("")
	}
	return err
}
