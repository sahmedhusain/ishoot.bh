package httpapi

import (
	"context"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"
	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/db"
	"platform.local/backend/pkg/problem"
)

func RegisterAdminExtras(e *echo.Echo, verifier *authn.Verifier, pool *pgxpool.Pool) {
	if pool == nil {
		return
	}
	g := e.Group("/v1/identity/admin", authn.Require(verifier, authn.RealmService))

	queryJSON := func(sql string) echo.HandlerFunc {
		return func(c echo.Context) error {
			ctx, cancel := context.WithTimeout(c.Request().Context(), 10*time.Second)
			defer cancel()
			var raw []byte
			if err := pool.QueryRow(ctx, sql).Scan(&raw); err != nil {
				return err
			}
			if len(raw) == 0 {
				raw = []byte(`[]`)
			}
			return c.JSONBlob(http.StatusOK, raw)
		}
	}

	g.GET("/users", queryJSON(`SELECT COALESCE(json_agg(t ORDER BY created_at DESC), '[]'::json) FROM (SELECT id, email, full_name, role, is_active, department_id, manager_id, discount_limit_percent, last_login_at, created_at, updated_at FROM identity."user") t`))
	g.GET("/users/:id", func(c echo.Context) error {
		ctx, cancel := context.WithTimeout(c.Request().Context(), 10*time.Second)
		defer cancel()
		var raw []byte
		err := pool.QueryRow(ctx, `SELECT row_to_json(t) FROM (SELECT id, email, full_name, role, is_active, department_id, manager_id, discount_limit_percent, last_login_at, created_at, updated_at FROM identity."user" WHERE id = $1) t`, c.Param("id")).Scan(&raw)
		if err != nil {
			return problem.NotFound("")
		}
		return c.JSONBlob(http.StatusOK, raw)
	})
	g.PUT("/users/:id/discount-limit", func(c echo.Context) error {
		var in struct {
			DiscountLimitPercent *float64 `json:"discountLimitPercent"`
		}
		if err := c.Bind(&in); err != nil {
			return problem.New(http.StatusBadRequest, "bad_request", err.Error())
		}
		var out struct {
			ID                   string   `json:"id"`
			DiscountLimitPercent *float64 `json:"discount_limit_percent"`
		}
		err := pool.QueryRow(c.Request().Context(), `
			UPDATE identity."user"
			SET discount_limit_percent = $2, updated_at = now()
			WHERE id = $1
			RETURNING id, discount_limit_percent::float8
		`, c.Param("id"), in.DiscountLimitPercent).Scan(&out.ID, &out.DiscountLimitPercent)
		if err != nil {
			return err
		}
		return c.JSON(http.StatusOK, out)
	})

	g.GET("/roles", queryJSON(`SELECT COALESCE(json_agg(t ORDER BY name_en ASC), '[]'::json) FROM identity.role t`))
	g.GET("/permissions", queryJSON(`SELECT COALESCE(json_agg(t ORDER BY resource ASC, action ASC), '[]'::json) FROM identity.permission t`))
	g.GET("/role-data-scopes", queryJSON(`SELECT COALESCE(json_agg(t), '[]'::json) FROM identity.role_data_scope t`))
	g.GET("/branches", queryJSON(`SELECT COALESCE(json_agg(t ORDER BY name ASC), '[]'::json) FROM identity.branch t`))
	g.GET("/branch-grants", queryJSON(`SELECT COALESCE(json_agg(t), '[]'::json) FROM identity.branch_grant t`))
	g.GET("/sessions", queryJSON(`SELECT COALESCE(json_agg(t ORDER BY created_at DESC), '[]'::json) FROM identity.session t`))

	g.PUT("/permissions", func(c echo.Context) error {
		var in struct {
			Role     string `json:"role"`
			Resource string `json:"resource"`
			Action   string `json:"action"`
			Allowed  bool   `json:"allowed"`
		}
		if err := c.Bind(&in); err != nil {
			return problem.New(http.StatusBadRequest, "bad_request", err.Error())
		}
		ctx := c.Request().Context()
		tag, err := pool.Exec(ctx, `
			UPDATE identity.permission
			SET allowed = $4
			WHERE role = $1 AND resource = $2 AND action = $3
		`, in.Role, in.Resource, in.Action, in.Allowed)
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			if _, err := pool.Exec(ctx, `
				INSERT INTO identity.permission (id, role, resource, action, allowed, created_at)
				VALUES (gen_random_uuid()::text, $1, $2, $3, $4, now())
			`, in.Role, in.Resource, in.Action, in.Allowed); err != nil {
				return err
			}
		}
		return c.JSON(http.StatusOK, map[string]any{"ok": true})
	})

	g.PUT("/role-data-scopes", func(c echo.Context) error {
		var in struct {
			Role   string            `json:"role"`
			Scopes map[string]string `json:"scopes"`
		}
		if err := c.Bind(&in); err != nil {
			return problem.New(http.StatusBadRequest, "bad_request", err.Error())
		}
		for area, scope := range in.Scopes {
			if _, err := pool.Exec(c.Request().Context(), `
				INSERT INTO identity.role_data_scope (role, area, scope)
				VALUES ($1, $2, $3)
				ON CONFLICT (role, area) DO UPDATE SET scope = EXCLUDED.scope
			`, in.Role, area, scope); err != nil {
				return err
			}
		}
		return c.JSON(http.StatusOK, map[string]any{"ok": true})
	})

	g.POST("/branches", func(c echo.Context) error {
		var in struct {
			ID               string `json:"id"`
			Code             string `json:"code"`
			Name             string `json:"name"`
			TimeZone         string `json:"timeZone"`
			BusinessDayStart int    `json:"businessDayStart"`
		}
		if err := c.Bind(&in); err != nil {
			return problem.New(http.StatusBadRequest, "bad_request", err.Error())
		}
		var raw []byte
		err := pool.QueryRow(c.Request().Context(), `
			INSERT INTO identity.branch (id, code, name, time_zone, business_day_start, is_active, revision, created_at, updated_at)
			VALUES (COALESCE(NULLIF($1,''), gen_random_uuid()::text), $2, $3, $4, $5, true, 1, now(), now())
			ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code, name = EXCLUDED.name, time_zone = EXCLUDED.time_zone, business_day_start = EXCLUDED.business_day_start, revision = identity.branch.revision + 1, updated_at = now()
			RETURNING row_to_json(identity.branch.*)
		`, in.ID, in.Code, in.Name, in.TimeZone, in.BusinessDayStart).Scan(&raw)
		if err != nil {
			return err
		}
		return c.JSONBlob(http.StatusOK, raw)
	})

	g.PUT("/users/:id/fields", func(c echo.Context) error {
		var in struct {
			FullName              *string  `json:"fullName"`
			Email                 *string  `json:"email"`
			Role                  *string  `json:"role"`
			ManagerID             *string  `json:"managerId"`
			IsActive              *bool    `json:"isActive"`
			DiscountLimitPercent  *float64 `json:"discountLimitPercent"`
			CommissionRatePercent *float64 `json:"commissionRatePercent"`
			SignatureURL          *string  `json:"signatureUrl"`
		}
		if err := c.Bind(&in); err != nil {
			return problem.New(http.StatusBadRequest, "bad_request", err.Error())
		}
		var raw []byte
		err := pool.QueryRow(c.Request().Context(), `
			UPDATE identity."user"
			SET
				full_name = COALESCE($2, full_name),
				email = COALESCE($3, email),
				role = COALESCE($4, role),
				manager_id = COALESCE($5, manager_id),
				is_active = COALESCE($6, is_active),
				discount_limit_percent = COALESCE($7, discount_limit_percent),
				commission_rate_percent = COALESCE($8, commission_rate_percent),
				signature_url = COALESCE($9, signature_url),
				updated_at = now()
			WHERE id = $1
			RETURNING row_to_json(identity."user".*)
		`, c.Param("id"), in.FullName, in.Email, in.Role, in.ManagerID, in.IsActive, in.DiscountLimitPercent, in.CommissionRatePercent, in.SignatureURL).Scan(&raw)
		if err != nil {
			return err
		}
		return c.JSONBlob(http.StatusOK, raw)
	})

	db.RegisterTableRoutes(g, pool, "identity", []string{
		"account", "auth_challenge", "branch", "branch_grant", "customer_code", "customer_provider",
		"it_permission", "it_role", "legacy_reset_challenge", "mfa_recovery_code", "oauth_state",
		"password_reset", "permission", "profile_projection", "refresh_token", "role",
		"role_data_scope", "session", "session_family", "staff_access", "staff_permission",
		"staff_role", "staff_role_scope", "user",
	})
}
