// Package httpapi exposes the hr use cases over HTTP.
package httpapi

import (
	"errors"
	"net/http"
	"os"

	"github.com/labstack/echo/v4"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/authz"
	"platform.local/backend/pkg/problem"
	"platform.local/backend/services/hr/api"
	"platform.local/backend/services/hr/internal/app"
	"platform.local/backend/services/hr/internal/postgres/sqlcdb"
)

type Options struct {
	Verifier *authn.Verifier
	Readers  []string
	Writers  []string
}

type handler struct {
	svc  *app.Service
	opts Options
}

func Register(e *echo.Echo, svc *app.Service, opts Options) {
	h := &handler{svc: svc, opts: opts}

	e.GET("/v1/hr/openapi.yaml", func(c echo.Context) error {
		return c.Blob(http.StatusOK, "application/yaml", api.OpenAPI)
	})

	auth := authn.Require(opts.Verifier, authn.RealmStaff, authn.RealmService, authn.RealmIT)
	g := e.Group("/v1/hr", auth, authz.ServiceCallers(opts.Readers, opts.Writers))

	// Departments
	g.GET("/departments", h.listDepartments)
	g.POST("/departments", h.createDepartment)

	// Employees
	g.GET("/employees", h.listEmployees)
	g.POST("/employees", h.createEmployee)
	g.GET("/employees/:id", h.getEmployee)
	g.POST("/employees/:id/offboard", h.offboardEmployee)
	g.DELETE("/employees/:id", h.deleteEmployee)

	// Leave
	g.GET("/leave", h.listLeave)
	g.POST("/leave", h.createLeave)
	g.PUT("/leave/:id/approve", h.approveLeave)

	// Payroll
	g.GET("/payroll", h.listPayroll)
	g.GET("/payroll/:id", h.getPayroll)
	g.POST("/payroll", h.createPayroll)
	g.PUT("/payroll/:id/process", h.processPayroll)
}

// Departments Handlers
func (h *handler) listDepartments(c echo.Context) error {
	departments, err := h.svc.ListDepartments(c.Request().Context())
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, departments)
}

func (h *handler) createDepartment(c echo.Context) error {
	var in sqlcdb.CreateDepartmentParams
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	created, err := h.svc.CreateDepartment(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, created)
}

// Employees Handlers
func (h *handler) listEmployees(c echo.Context) error {
	employees, err := h.svc.ListEmployees(c.Request().Context())
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, employees)
}

func (h *handler) getEmployee(c echo.Context) error {
	emp, err := h.svc.GetEmployee(c.Request().Context(), c.Param("id"))
	if err != nil {
		if errors.Is(err, app.ErrNotFound) {
			return problem.NotFound("")
		}
		return err
	}
	return c.JSON(http.StatusOK, emp)
}

func (h *handler) createEmployee(c echo.Context) error {
	var in sqlcdb.CreateEmployeeParams
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	if in.Status == "" {
		in.Status = "active"
	}
	created, err := h.svc.CreateEmployee(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, created)
}

func (h *handler) offboardEmployee(c echo.Context) error {
	updated, err := h.svc.OffboardEmployee(c.Request().Context(), c.Param("id"))
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, updated)
}

func (h *handler) deleteEmployee(c echo.Context) error {
	if err := h.svc.DeleteEmployee(c.Request().Context(), c.Param("id")); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}

// Leave Handlers
func (h *handler) listLeave(c echo.Context) error {
	var empID *string
	if eid := c.QueryParam("employeeId"); eid != "" {
		empID = &eid
	}
	leave, err := h.svc.ListLeaveRequests(c.Request().Context(), empID)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, leave)
}

func (h *handler) createLeave(c echo.Context) error {
	var in sqlcdb.CreateLeaveRequestParams
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	if in.Status == "" {
		in.Status = "pending"
	}
	created, err := h.svc.CreateLeaveRequest(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, created)
}

type approveLeaveBody struct {
	ApprovedBy string `json:"approvedBy"`
}

func (h *handler) approveLeave(c echo.Context) error {
	var body approveLeaveBody
	if err := c.Bind(&body); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	approved, err := h.svc.ApproveLeaveRequest(c.Request().Context(), c.Param("id"), body.ApprovedBy)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, approved)
}

// Payroll Handlers
func (h *handler) listPayroll(c echo.Context) error {
	runs, err := h.svc.ListPayrollRuns(c.Request().Context())
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, runs)
}

func (h *handler) getPayroll(c echo.Context) error {
	run, err := h.svc.GetPayrollRun(c.Request().Context(), c.Param("id"))
	if err != nil {
		if errors.Is(err, app.ErrNotFound) {
			return problem.NotFound("")
		}
		return err
	}
	return c.JSON(http.StatusOK, run)
}

type createPayrollInput struct {
	sqlcdb.CreatePayrollRunParams
	Items []sqlcdb.InsertPayrollItemParams `json:"items"`
}

func (h *handler) createPayroll(c echo.Context) error {
	var in createPayrollInput
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	if in.Status == "" {
		in.Status = "draft"
	}
	if in.Currency == "" {
		if def := os.Getenv("DEFAULT_CURRENCY"); def != "" {
			in.Currency = def
		} else {
			in.Currency = "USD"
		}
	}
	created, err := h.svc.CreatePayrollRun(c.Request().Context(), in.CreatePayrollRunParams, in.Items)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, created)
}

type processPayrollBody struct {
	ApprovedBy string `json:"approvedBy"`
}

func (h *handler) processPayroll(c echo.Context) error {
	var body processPayrollBody
	if err := c.Bind(&body); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	processed, err := h.svc.ProcessPayrollRun(c.Request().Context(), c.Param("id"), body.ApprovedBy)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, processed)
}
