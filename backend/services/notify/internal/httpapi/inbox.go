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
	"platform.local/backend/services/notify/internal/app"
)

// CodeNotificationNotFound answers for a notification that is not the person's (or does not exist).
const CodeNotificationNotFound = "notification_not_found"

func failInbox(err error) error {
	if errors.Is(err, app.ErrNotFound) {
		return problem.New(http.StatusNotFound, CodeNotificationNotFound, "")
	}
	return fail(err)
}

// registerInbox adds the in-app inbox (ADR 0012): the apps' back ends act for their signed-in people with service
// tokens and name them (and the categories they may see) in the query; IT staff use their own tokens under /me.
func registerInbox(e *echo.Echo, services *echo.Group, h *handler) {
	inbox := caller(h.opts.InboxCallers)
	services.POST("/inbox", h.deliverInApp, inbox)
	services.GET("/inbox", h.inbox(serviceOwner), inbox)
	services.GET("/inbox/summary", h.inboxSummary(serviceOwner), inbox)
	services.POST("/inbox/actions", h.inboxAction(serviceOwner), inbox)
	services.GET("/inbox/:id", h.inboxItem(serviceOwner), inbox)
	services.GET("/preferences", h.preferences(serviceOwner), inbox)
	services.PUT("/preferences", h.savePreferences(serviceOwner), inbox)
	services.GET("/mutes", h.mutes(serviceOwner), inbox)
	services.PUT("/mutes", h.mute(serviceOwner), inbox)
	services.DELETE("/mutes", h.unmute(serviceOwner), inbox)

	me := e.Group("/v1/notify/me", authn.Require(h.opts.Verifier, authn.RealmIT))
	me.GET("/inbox", h.inbox(itOwner))
	me.GET("/inbox/summary", h.inboxSummary(itOwner))
	me.POST("/inbox/actions", h.inboxAction(itOwner))
	me.GET("/inbox/:id", h.inboxItem(itOwner))
	me.GET("/preferences", h.preferences(itOwner))
	me.PUT("/preferences", h.savePreferences(itOwner))
	me.GET("/mutes", h.mutes(itOwner))
	me.PUT("/mutes", h.mute(itOwner))
	me.DELETE("/mutes", h.unmute(itOwner))
}

type ownerFunc func(c echo.Context) (app.Owner, error)

// serviceOwner reads whose inbox from the query: realm, userId and the categories the app allows them (all of the
// realm's when omitted).
func serviceOwner(c echo.Context) (app.Owner, error) {
	o := app.Owner{Realm: c.QueryParam("realm"), UserID: c.QueryParam("userId")}
	var errs []problem.FieldError
	if !slices.Contains(catalog.Notifications.Realms, o.Realm) {
		errs = append(errs, problem.FieldError{Field: "realm", Code: "oneof"})
	}
	if o.UserID == "" {
		errs = append(errs, problem.FieldError{Field: "userId", Code: "required"})
	}
	if raw := strings.TrimSpace(c.QueryParam("categories")); raw != "" {
		for _, key := range strings.Split(raw, ",") {
			category, ok := catalog.Notifications.Category(strings.TrimSpace(key))
			if !ok || !category.InRealm(o.Realm) {
				errs = append(errs, problem.FieldError{Field: "categories", Code: "oneof"})
				break
			}
			o.Categories = append(o.Categories, category.Key)
		}
	} else {
		for _, category := range catalog.Notifications.Categories {
			if category.InRealm(o.Realm) {
				o.Categories = append(o.Categories, category.Key)
			}
		}
	}
	if len(errs) > 0 {
		return o, problem.Validation(errs...)
	}
	return o, nil
}

// itOwner is the signed-in IT account, with the categories their roles allow.
func itOwner(c echo.Context) (app.Owner, error) {
	p, ok := authn.PrincipalFrom(c.Request().Context())
	if !ok {
		return app.Owner{}, problem.Unauthenticated("")
	}
	o := app.Owner{Realm: string(authn.RealmIT), UserID: p.Subject}
	allows := func(resource, action string) bool { return authz.Allowed(catalog.ITAccess, p, resource, action) }
	for _, category := range catalog.Notifications.Categories {
		if category.AllowedFor(o.Realm, allows) {
			o.Categories = append(o.Categories, category.Key)
		}
	}
	return o, nil
}

type notificationJSON struct {
	ID            string            `json:"id" validate:"omitempty,uuid"`
	Realm         string            `json:"realm" validate:"required"`
	Recipient     string            `json:"recipient" validate:"required,max=128"`
	Category      string            `json:"category" validate:"max=64"`
	Priority      string            `json:"priority" validate:"max=16"`
	Title         string            `json:"title" validate:"required"`
	Body          string            `json:"body"`
	MessageKey    string            `json:"messageKey" validate:"max=200"`
	MessageParams map[string]string `json:"messageParams"`
	ActionURL     string            `json:"actionUrl" validate:"max=1000"`
	EntityType    string            `json:"entityType" validate:"max=100"`
	EntityID      string            `json:"entityId" validate:"max=100"`
	ActorID       string            `json:"actorId" validate:"max=64"`
	DedupeKey     string            `json:"dedupeKey" validate:"max=200"`
	DeliverAt     *time.Time        `json:"deliverAt"`
	CreatedAt     *time.Time        `json:"createdAt"`
	ReadAt        *time.Time        `json:"readAt"`
	ArchivedAt    *time.Time        `json:"archivedAt"`
}

type deliverJSON struct {
	Items []notificationJSON `json:"items" validate:"required,min=1,max=500,dive"`
}

func (h *handler) deliverInApp(c echo.Context) error {
	var in deliverJSON
	if err := httpx.BindJSON(c, &in, h.opts.InboxBodyLimit); err != nil {
		return err
	}
	items := make([]app.NewNotification, 0, len(in.Items))
	for _, n := range in.Items {
		items = append(items, app.NewNotification{ID: n.ID, Realm: n.Realm, Recipient: n.Recipient, Category: n.Category,
			Priority: n.Priority, Title: n.Title, Body: n.Body, MessageKey: n.MessageKey, MessageParams: n.MessageParams,
			ActionURL: n.ActionURL, EntityType: n.EntityType, EntityID: n.EntityID, ActorID: n.ActorID, DedupeKey: n.DedupeKey,
			DeliverAt: n.DeliverAt, CreatedAt: n.CreatedAt, ReadAt: n.ReadAt, ArchivedAt: n.ArchivedAt})
	}
	p, _ := authn.PrincipalFrom(c.Request().Context())
	result, err := h.svc.DeliverInApp(c.Request().Context(), p.Subject, items)
	if err != nil {
		return failInbox(err)
	}
	return c.JSON(http.StatusOK, result)
}

func (h *handler) inbox(owner ownerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		o, err := owner(c)
		if err != nil {
			return err
		}
		q := app.InboxQuery{Filter: c.QueryParam("filter"), Category: c.QueryParam("category"), Limit: h.opts.DefaultPageSize}
		var errs []problem.FieldError
		if q.Filter != "" && !slices.Contains(app.Filters, q.Filter) {
			errs = append(errs, problem.FieldError{Field: "filter", Code: "oneof"})
		}
		if q.Category != "" && !slices.Contains(o.Categories, q.Category) {
			errs = append(errs, problem.FieldError{Field: "category", Code: "oneof"})
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
			q.BeforeAt, q.BeforeID = t, id
		}
		if len(errs) > 0 {
			return problem.Validation(errs...)
		}
		page, err := h.svc.Inbox(c.Request().Context(), o, q)
		if err != nil {
			return failInbox(err)
		}
		out := map[string]any{"items": page.Items, "unread": page.Unread}
		if len(page.Items) == int(q.Limit) {
			last := page.Items[len(page.Items)-1]
			out["nextCursor"] = base64.RawURLEncoding.EncodeToString([]byte(last.CreatedAt.Format(time.RFC3339Nano) + "|" + last.ID))
		}
		return c.JSON(http.StatusOK, out)
	}
}

func (h *handler) inboxSummary(owner ownerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		o, err := owner(c)
		if err != nil {
			return err
		}
		summary, err := h.svc.Summary(c.Request().Context(), o)
		if err != nil {
			return failInbox(err)
		}
		return c.JSON(http.StatusOK, summary)
	}
}

func (h *handler) inboxItem(owner ownerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		o, err := owner(c)
		if err != nil {
			return err
		}
		item, err := h.svc.Notification(c.Request().Context(), o, c.Param("id"))
		if err != nil {
			return failInbox(err)
		}
		return c.JSON(http.StatusOK, item)
	}
}

type actionJSON struct {
	Action   string   `json:"action" validate:"required"`
	IDs      []string `json:"ids" validate:"max=500"`
	All      bool     `json:"all"`
	Filter   string   `json:"filter"`
	Category string   `json:"category" validate:"max=64"`
}

func (h *handler) inboxAction(owner ownerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		o, err := owner(c)
		if err != nil {
			return err
		}
		var in actionJSON
		if err := httpx.BindJSON(c, &in, 64<<10); err != nil {
			return err
		}
		if in.Category != "" && !slices.Contains(o.Categories, in.Category) {
			return problem.Validation(problem.FieldError{Field: "category", Code: "oneof"})
		}
		changed, unread, err := h.svc.Act(c.Request().Context(), o,
			app.InboxAction{Action: in.Action, IDs: in.IDs, All: in.All, Filter: in.Filter, Category: in.Category})
		if err != nil {
			return failInbox(err)
		}
		return c.JSON(http.StatusOK, map[string]int64{"changed": changed, "unread": unread})
	}
}

func (h *handler) preferences(owner ownerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		o, err := owner(c)
		if err != nil {
			return err
		}
		p, err := h.svc.Preferences(c.Request().Context(), o)
		if err != nil {
			return failInbox(err)
		}
		return c.JSON(http.StatusOK, p)
	}
}

type categorySettingJSON struct {
	Category string `json:"category" validate:"required,max=64"`
	Muted    bool   `json:"muted"`
	Sound    bool   `json:"sound"`
	// Mandatory is read-only; it is accepted so a client can send back what it read.
	Mandatory bool `json:"mandatory"`
}

type preferencesJSON struct {
	MutedUntil     *time.Time            `json:"mutedUntil"`
	SoundEnabled   bool                  `json:"soundEnabled"`
	Sound          string                `json:"sound" validate:"required,max=32"`
	Volume         int                   `json:"volume" validate:"gte=0,lte=100"`
	PopupsEnabled  bool                  `json:"popupsEnabled"`
	DesktopEnabled bool                  `json:"desktopEnabled"`
	Categories     []categorySettingJSON `json:"categories" validate:"max=64,dive"`
}

func (h *handler) savePreferences(owner ownerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		o, err := owner(c)
		if err != nil {
			return err
		}
		var in preferencesJSON
		if err := httpx.BindJSON(c, &in, 64<<10); err != nil {
			return err
		}
		p := app.Preferences{MutedUntil: in.MutedUntil, SoundEnabled: in.SoundEnabled, Sound: in.Sound, Volume: in.Volume,
			PopupsEnabled: in.PopupsEnabled, DesktopEnabled: in.DesktopEnabled}
		for _, cs := range in.Categories {
			p.Categories = append(p.Categories, app.CategorySetting{Category: cs.Category, Muted: cs.Muted, Sound: cs.Sound})
		}
		saved, err := h.svc.SavePreferences(c.Request().Context(), o, p)
		if err != nil {
			return failInbox(err)
		}
		return c.JSON(http.StatusOK, saved)
	}
}

func (h *handler) mutes(owner ownerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		o, err := owner(c)
		if err != nil {
			return err
		}
		items, err := h.svc.Mutes(c.Request().Context(), o)
		if err != nil {
			return failInbox(err)
		}
		return c.JSON(http.StatusOK, map[string]any{"items": items})
	}
}

type muteJSON struct {
	EntityType string     `json:"entityType" validate:"required,max=100"`
	EntityID   string     `json:"entityId" validate:"required,max=100"`
	Until      *time.Time `json:"until"`
}

func (h *handler) mute(owner ownerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		o, err := owner(c)
		if err != nil {
			return err
		}
		var in muteJSON
		if err := httpx.BindJSON(c, &in, 4096); err != nil {
			return err
		}
		if err := h.svc.Mute(c.Request().Context(), o, in.EntityType, in.EntityID, in.Until); err != nil {
			return failInbox(err)
		}
		return c.NoContent(http.StatusNoContent)
	}
}

func (h *handler) unmute(owner ownerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		o, err := owner(c)
		if err != nil {
			return err
		}
		if err := h.svc.Unmute(c.Request().Context(), o, c.QueryParam("entityType"), c.QueryParam("entityId")); err != nil {
			return failInbox(err)
		}
		return c.NoContent(http.StatusNoContent)
	}
}
