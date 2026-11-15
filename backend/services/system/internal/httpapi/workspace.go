package httpapi

import (
	"encoding/json"
	"net/http"

	"github.com/labstack/echo/v4"
	"platform.local/backend/pkg/httpx"
	"platform.local/backend/pkg/problem"
)

func (h *handler) workspaceRoutes(services *echo.Group) {
	services.GET("/workspace/prefs/:userId", h.getWorkspacePrefs, caller(h.opts.ReadCallers))
	services.PUT("/workspace/prefs/:userId", h.putWorkspacePrefs, caller(h.opts.CompanyWriters))
	services.DELETE("/workspace/prefs/:userId/layout", h.resetWorkspaceLayout, caller(h.opts.CompanyWriters))
	services.GET("/workspace/folders", h.listWorkspaceLayouts, caller(h.opts.ReadCallers))
}

func (h *handler) getWorkspacePrefs(c echo.Context) error {
	userID := c.Param("userId")
	if userID == "" {
		return problem.Validation(problem.FieldError{Field: "userId", Code: "required"})
	}
	prefs, err := h.svc.GetWorkspacePrefs(c.Request().Context(), userID)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, prefs)
}

func (h *handler) putWorkspacePrefs(c echo.Context) error {
	userID := c.Param("userId")
	if userID == "" {
		return problem.Validation(problem.FieldError{Field: "userId", Code: "required"})
	}
	var in struct {
		Widgets      *json.RawMessage `json:"widgets"`
		Scratchpad   *json.RawMessage `json:"scratchpad"`
		SidebarPrefs *json.RawMessage `json:"sidebarPrefs"`
	}
	if err := httpx.BindJSON(c, &in, h.opts.JSONBodyLimit); err != nil {
		return err
	}
	prefs, err := h.svc.UpsertWorkspacePrefs(c.Request().Context(), userID, in.Widgets, in.Scratchpad, in.SidebarPrefs)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, prefs)
}

func (h *handler) resetWorkspaceLayout(c echo.Context) error {
	userID := c.Param("userId")
	if userID == "" {
		return problem.Validation(problem.FieldError{Field: "userId", Code: "required"})
	}
	var in struct {
		Widgets json.RawMessage `json:"widgets"`
	}
	_ = httpx.BindJSON(c, &in, h.opts.JSONBodyLimit)
	if err := h.svc.ResetWorkspaceLayout(c.Request().Context(), userID, in.Widgets); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *handler) listWorkspaceLayouts(c echo.Context) error {
	rows, err := h.svc.ListWorkspaceLayouts(c.Request().Context())
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, map[string]any{"items": rows})
}
