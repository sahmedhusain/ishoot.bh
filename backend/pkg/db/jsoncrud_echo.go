package db

import (
	"io"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"
)

func RegisterTableRoutes(g *echo.Group, pool *pgxpool.Pool, schema string, tables []string, mw ...echo.MiddlewareFunc) {
	if pool == nil {
		return
	}
	allowed := make(map[string]bool, len(tables))
	for _, t := range tables {
		allowed[t] = true
	}
	g.GET("/tables/:table", func(c echo.Context) error {
		raw, err := ListJSONRows(c.Request().Context(), pool, schema, c.Param("table"), allowed, c.QueryParam("orderBy"))
		if err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, err.Error())
		}
		return c.JSONBlob(http.StatusOK, raw)
	}, mw...)
	g.POST("/tables/:table", func(c echo.Context) error {
		body, err := io.ReadAll(c.Request().Body)
		if err != nil {
			return err
		}
		raw, err := UpsertJSONRow(c.Request().Context(), pool, schema, c.Param("table"), allowed, body)
		if err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, err.Error())
		}
		return c.JSONBlob(http.StatusOK, raw)
	}, mw...)
	g.DELETE("/tables/:table/:id", func(c echo.Context) error {
		if err := DeleteJSONRow(c.Request().Context(), pool, schema, c.Param("table"), allowed, c.Param("id")); err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, err.Error())
		}
		return c.NoContent(http.StatusNoContent)
	}, mw...)
}
