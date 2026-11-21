package httpapi
import (
	"errors"
	"net/http"
	"time"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/labstack/echo/v4"
	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/authz"
	"platform.local/backend/pkg/catalog"
	"platform.local/backend/pkg/httpx"
	"platform.local/backend/pkg/problem"
	"platform.local/backend/services/system/internal/app"
	"platform.local/backend/services/system/internal/postgres"
)
func (h *handler) operationsRoutes(e *echo.Echo) {
	desk := e.Group("/v1/system/desk", authn.Require(h.opts.Verifier, authn.RealmIT))
	desk.GET("/health", func(c echo.Context) error {
		filesAdminURL := "http://files:9090"
		if h.opts.FilesURL != "" && h.opts.FilesURL != "http://files:8080" {
			filesAdminURL = h.opts.FilesURL
		}
		endpoints := app.ServiceEndpoints{
			Gateway:         "http://gateway:9090",
			Identity:        "http://identity:9090",
			ITSM:            "http://itsm:9090",
			Files:           filesAdminURL,
			Notify:          "http://notify:9090",
			Realtime:        "http://realtime:9090",
			Audit:           "http://audit:9090",
			CMS:             "http://cms:9090",
			Commerce:        "http://commerce:9090",
			Delivery:        "http://delivery:9090",
			Finance:         "http://finance:9090",
			HR:              "http://hr:9090",
			Inventory:       "http://inventory:9090",
			Sales:           "http://sales:9090",
			Workflow:        "http://workflow:9090",
			Mailpit:         "http://mailpit:8025",
			WhatsAppSandbox: "http://whatsapp-sandbox:8080",
			SeaweedFS:       "http://seaweedfs:8333",
			NATS:            "http://nats:8222",
		}
		items, err := h.svc.SystemHealth(c.Request().Context(), endpoints)
		if err != nil {
			return err
		}
		return c.JSON(http.StatusOK, map[string]any{"items": items})
	}, authz.Require(catalog.ITAccess, "system_health", "read"))
	desk.GET("/config", func(c echo.Context) error {
		view, err := h.svc.RuntimeConfig(c.Request().Context())
		if err != nil {
			return err
		}
		return c.JSON(http.StatusOK, view)
	}, authz.Require(catalog.ITAccess, "runtime_config", "read"))
	desk.PUT("/config/debug-toggle", func(c echo.Context) error {
		var in struct {
			Service		string	`json:"service" validate:"required,max=64"`
			LogLevel	string	`json:"logLevel" validate:"required,oneof=debug info warn error"`
			TTLMinutes	int	`json:"ttlMinutes" validate:"min=1,max=1440"`
		}
		if err := httpx.BindJSON(c, &in, h.opts.JSONBodyLimit); err != nil {
			return err
		}
		actor, _ := authn.PrincipalFrom(c.Request().Context())
		if err := h.svc.SetDebugToggle(c.Request().Context(), in.Service, in.LogLevel, in.TTLMinutes, "it:"+actor.Subject); err != nil {
			return err
		}
		return c.NoContent(http.StatusNoContent)
	}, authz.Require(catalog.ITAccess, "runtime_config", "edit"))
	desk.DELETE("/config/debug-toggle/:service", func(c echo.Context) error {
		if err := h.svc.RemoveDebugToggle(c.Request().Context(), c.Param("service")); err != nil {
			return err
		}
		return c.NoContent(http.StatusNoContent)
	}, authz.Require(catalog.ITAccess, "runtime_config", "edit"))
	desk.GET("/database", func(c echo.Context) error {
		stats, err := h.svc.DatabaseStats(c.Request().Context())
		if err != nil {
			return err
		}
		return c.JSON(http.StatusOK, stats)
	}, authz.Require(catalog.ITAccess, "database", "read"))
	desk.POST("/database/query", func(c echo.Context) error {
		var in struct {
			SQL string `json:"sql" validate:"required,max=8000"`
		}
		if err := httpx.BindJSON(c, &in, h.opts.JSONBodyLimit); err != nil {
			return err
		}
		res, err := h.svc.RunReadOnlyQuery(c.Request().Context(), in.SQL)
		if err != nil {
			if errors.Is(err, postgres.ErrSQLValidation) {
				return problem.BadRequest(err.Error())
			}
			var pgErr *pgconn.PgError
			if errors.As(err, &pgErr) {
				return problem.BadRequest(pgErr.Message)
			}
			return err
		}
		return c.JSON(http.StatusOK, res)
	}, authz.Require(catalog.ITAccess, "database", "read"))
	desk.POST("/database/maintenance", func(c echo.Context) error {
		var in struct {
			Action string `json:"action" validate:"required,oneof=analyze purge_outbox"`
		}
		if err := httpx.BindJSON(c, &in, h.opts.JSONBodyLimit); err != nil {
			return err
		}
		res, err := h.svc.RunDatabaseMaintenance(c.Request().Context(), in.Action)
		if err != nil {
			if errors.Is(err, postgres.ErrSQLValidation) {
				return problem.BadRequest(err.Error())
			}
			return err
		}
		return c.JSON(http.StatusOK, res)
	}, authz.Require(catalog.ITAccess, "backups", "execute"))
	desk.GET("/backups", func(c echo.Context) error {
		rows, err := h.svc.ListBackups(c.Request().Context())
		if err != nil {
			return err
		}
		return c.JSON(http.StatusOK, map[string]any{"items": rows})
	}, authz.Require(catalog.ITAccess, "backups", "read"))
	desk.POST("/backups", func(c echo.Context) error {
		var in struct {
			Kind string `json:"kind" validate:"required,oneof=database bucket full"`
		}
		if err := httpx.BindJSON(c, &in, h.opts.JSONBodyLimit); err != nil {
			return err
		}
		actor, _ := authn.PrincipalFrom(c.Request().Context())
		row, err := h.svc.CreateBackup(c.Request().Context(), in.Kind, "it:"+actor.Subject)
		if err != nil {
			return err
		}
		return c.JSON(http.StatusCreated, row)
	}, authz.Require(catalog.ITAccess, "backups", "execute"))
	desk.POST("/backups/:id/verify", func(c echo.Context) error {
		if err := h.svc.VerifyBackup(c.Request().Context(), c.Param("id")); err != nil {
			return err
		}
		return c.NoContent(http.StatusNoContent)
	}, authz.Require(catalog.ITAccess, "backups", "execute"))
	desk.GET("/api-keys", func(c echo.Context) error {
		rows, err := h.svc.ListAPIKeys(c.Request().Context())
		if err != nil {
			return err
		}
		return c.JSON(http.StatusOK, map[string]any{"items": rows})
	}, authz.Require(catalog.ITAccess, "api_keys", "read"))
	desk.POST("/api-keys", func(c echo.Context) error {
		var in struct {
			Name		string		`json:"name" validate:"required,max=100"`
			Scopes		[]string	`json:"scopes" validate:"required,min=1,dive,required,max=100"`
			RateLimit	int32		`json:"rateLimit" validate:"min=1,max=10000"`
			ExpiresAt	*time.Time	`json:"expiresAt"`
		}
		if err := httpx.BindJSON(c, &in, h.opts.JSONBodyLimit); err != nil {
			return err
		}
		actor, _ := authn.PrincipalFrom(c.Request().Context())
		created, err := h.svc.CreateAPIKey(c.Request().Context(), in.Name, in.Scopes, in.RateLimit, in.ExpiresAt, "it:"+actor.Subject)
		if err != nil {
			return err
		}
		return c.JSON(http.StatusCreated, created)
	}, authz.Require(catalog.ITAccess, "api_keys", "create"))
	desk.DELETE("/api-keys/:id", func(c echo.Context) error {
		actor, _ := authn.PrincipalFrom(c.Request().Context())
		if err := h.svc.RevokeAPIKey(c.Request().Context(), c.Param("id"), "it:"+actor.Subject); err != nil {
			return err
		}
		return c.NoContent(http.StatusNoContent)
	}, authz.Require(catalog.ITAccess, "api_keys", "delete"))
}
