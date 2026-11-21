package httpapi

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/labstack/echo/v4"
	"platform.local/backend/pkg/db"
	"platform.local/backend/pkg/problem"
	"platform.local/backend/services/hr/internal/postgres"
)

func (h *handler) extrasRoutes(g *echo.Group) {
	g.PUT("/departments/:id", h.updateDepartment)
	g.DELETE("/departments/:id", h.deleteDepartment)
	g.POST("/departments/assign-users", h.assignUsersToDepartment)
	g.PUT("/employees/:id", h.updateEmployee)
	g.GET("/employees/:id/profile", h.getEmployeeProfile)
	g.PUT("/employees/:id/profile", h.saveEmployeeProfile)

	g.GET("/leave-types", rawJSONHandler(h.svc.ListLeaveTypes))
	g.GET("/shift-types", rawJSONHandler(h.svc.ListShiftTypes))
	g.GET("/gosi/components", rawJSONHandler(h.svc.ListGosiComponents))
	g.GET("/gosi/records", rawJSONHandler(h.svc.ListEmployeeGosiRecords))
	g.GET("/gosi/settings", rawJSONHandler(h.svc.GetGosiSettings))
	g.GET("/salary-documents", rawJSONHandler(h.svc.ListSalaryDocuments))
	g.GET("/employee-supports", rawJSONHandler(h.svc.ListEmployeeSupports))
	g.GET("/payroll-items", rawJSONHandler(h.svc.ListAllPayrollItemsJSON))
	g.GET("/leave-adjustments", rawJSONHandler(h.svc.ListLeaveAdjustments))

	g.POST("/shift-types", func(c echo.Context) error {
		var in struct {
			ID             string  `json:"id"`
			Code           string  `json:"code"`
			NameEn         string  `json:"nameEn"`
			NameAr         string  `json:"nameAr"`
			AllowanceMode  string  `json:"allowanceMode"`
			AllowanceValue float64 `json:"allowanceValue"`
			IsActive       bool    `json:"isActive"`
		}
		if err := c.Bind(&in); err != nil {
			return problem.New(http.StatusBadRequest, "bad_request", err.Error())
		}
		raw, err := h.svc.SaveShiftType(c.Request().Context(), in.ID, in.Code, in.NameEn, in.NameAr, in.AllowanceMode, in.AllowanceValue, in.IsActive)
		if err != nil {
			return err
		}
		return c.JSONBlob(http.StatusOK, raw)
	})
	g.POST("/leave-types", func(c echo.Context) error {
		var in struct {
			ID                 string  `json:"id"`
			Code               string  `json:"code"`
			NameEn             string  `json:"nameEn"`
			NameAr             string  `json:"nameAr"`
			DaysAllowedPerYear float64 `json:"daysAllowedPerYear"`
			IsPaid             bool    `json:"isPaid"`
			PayPercent         int     `json:"payPercent"`
		}
		if err := c.Bind(&in); err != nil {
			return problem.New(http.StatusBadRequest, "bad_request", err.Error())
		}
		raw, err := h.svc.SaveLeaveType(c.Request().Context(), in.ID, in.Code, in.NameEn, in.NameAr, in.DaysAllowedPerYear, in.IsPaid, in.PayPercent)
		if err != nil {
			return err
		}
		return c.JSONBlob(http.StatusOK, raw)
	})
	g.DELETE("/attendance", func(c echo.Context) error {
		if err := h.svc.DeleteAttendanceByEmployeeDate(c.Request().Context(), c.QueryParam("employeeId"), c.QueryParam("date")); err != nil {
			return err
		}
		return c.NoContent(http.StatusNoContent)
	})

	db.RegisterTableRoutes(g, h.svc.Pool(), "hr", []string{
		"attendance_entry", "benefit_plan", "department", "employee", "employee_credential",
		"employee_gosi_record", "employee_handover", "employee_handover_case",
		"employee_recurring_pay", "employee_support", "employee_support_event",
		"gosi_component", "gosi_settings", "identity_user_ref", "leave_adjustment",
		"leave_balance", "leave_request", "leave_type", "payroll_item", "payroll_item_line",
		"payroll_run", "salary_document", "shift_type",
	})
}

func rawJSONHandler(fn func(ctx context.Context) (json.RawMessage, error)) echo.HandlerFunc {
	return func(c echo.Context) error {
		raw, err := fn(c.Request().Context())
		if err != nil {
			return err
		}
		return c.JSONBlob(http.StatusOK, raw)
	}
}

func (h *handler) updateDepartment(c echo.Context) error {
	var in postgres.UpdateDepartmentInput
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	dep, err := h.svc.UpdateDepartmentPartial(c.Request().Context(), c.Param("id"), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, dep)
}

func (h *handler) deleteDepartment(c echo.Context) error {
	if err := h.svc.DeleteDepartmentDirect(c.Request().Context(), c.Param("id")); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *handler) assignUsersToDepartment(c echo.Context) error {
	var in struct {
		UserIDs      []string `json:"userIds"`
		DepartmentID *string  `json:"departmentId"`
	}
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	if err := h.svc.AssignUsersToDepartment(c.Request().Context(), in.UserIDs, in.DepartmentID); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *handler) updateEmployee(c echo.Context) error {
	var in postgres.UpdateEmployeeInput
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	emp, err := h.svc.UpdateEmployeePartial(c.Request().Context(), c.Param("id"), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, emp)
}

func (h *handler) getEmployeeProfile(c echo.Context) error {
	prof, err := h.svc.GetEmployeeExtendedProfile(c.Request().Context(), c.Param("id"))
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, prof)
}

func (h *handler) saveEmployeeProfile(c echo.Context) error {
	var in postgres.EmployeeExtendedProfile
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	prof, err := h.svc.SaveEmployeeExtendedProfile(c.Request().Context(), c.Param("id"), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, prof)
}
