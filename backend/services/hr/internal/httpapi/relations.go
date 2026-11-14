package httpapi

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/labstack/echo/v4"
	"platform.local/backend/pkg/problem"
	"platform.local/backend/services/hr/internal/app"
	"platform.local/backend/services/hr/internal/postgres"
	"platform.local/backend/services/hr/internal/postgres/sqlcdb"
)

func (h *handler) getEmployeeRelations(c echo.Context) error {
	rel, err := h.svc.GetEmployeeRelations(c.Request().Context(), c.Param("id"))
	if err != nil {
		if errors.Is(err, app.ErrNotFound) {
			return problem.NotFound("")
		}
		return err
	}
	return c.JSON(http.StatusOK, rel)
}

type updateEmployeeBody struct {
	UserID       *string `json:"userId"`
	ManagerID    *string `json:"managerId"`
	DepartmentID *string `json:"departmentId"`
	Status       *string `json:"status"`
	JobTitleEn   *string `json:"jobTitleEn"`
	JobTitleAr   *string `json:"jobTitleAr"`
	Phone        *string `json:"phone"`
}

func (h *handler) updateEmployeeLinks(c echo.Context) error {
	var body updateEmployeeBody
	if err := c.Bind(&body); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	info, err := h.svc.UpdateEmployeeLinks(c.Request().Context(), c.Param("id"), postgres.EmployeeLinksPatch{
		UserID:       body.UserID,
		ManagerID:    body.ManagerID,
		DepartmentID: body.DepartmentID,
		Status:       body.Status,
		JobTitleEn:   body.JobTitleEn,
		JobTitleAr:   body.JobTitleAr,
		Phone:        body.Phone,
	})
	if err != nil {
		if errors.Is(err, app.ErrNotFound) {
			return problem.NotFound("")
		}
		return err
	}
	return c.JSON(http.StatusOK, info)
}

func (h *handler) listEmployeePayItems(c echo.Context) error {
	items, err := h.svc.ListEmployeePayItems(c.Request().Context(), c.Param("id"))
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, items)
}

func (h *handler) listCredentials(c echo.Context) error {
	rows, err := h.svc.ListCredentials(c.Request().Context(), c.QueryParam("employeeId"))
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, rows)
}

func (h *handler) saveCredential(c echo.Context) error {
	var in postgres.EmployeeCredential
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	if id := c.Param("id"); id != "" {
		in.ID = id
	}
	if in.EmployeeID == "" || in.Label == "" {
		return problem.New(http.StatusBadRequest, "bad_request", "employeeId and label are required")
	}
	saved, err := h.svc.SaveCredential(c.Request().Context(), in)
	if err != nil {
		return err
	}
	status := http.StatusCreated
	if c.Param("id") != "" {
		status = http.StatusOK
	}
	return c.JSON(status, saved)
}

func (h *handler) deleteCredential(c echo.Context) error {
	if err := h.svc.DeleteCredential(c.Request().Context(), c.Param("id")); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *handler) listHandovers(c echo.Context) error {
	rows, err := h.svc.ListHandovers(c.Request().Context(), c.QueryParam("employeeId"), c.QueryParam("delegateUserId"))
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, rows)
}

func (h *handler) saveHandover(c echo.Context) error {
	var in postgres.EmployeeHandover
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	if id := c.Param("id"); id != "" {
		in.ID = id
	}
	if in.EmployeeID == "" {
		return problem.New(http.StatusBadRequest, "bad_request", "employeeId is required")
	}
	saved, err := h.svc.SaveHandover(c.Request().Context(), in)
	if err != nil {
		return err
	}
	status := http.StatusCreated
	if c.Param("id") != "" {
		status = http.StatusOK
	}
	return c.JSON(status, saved)
}

func (h *handler) listRecurringPay(c echo.Context) error {
	rows, err := h.svc.ListRecurringPay(c.Request().Context(), c.QueryParam("employeeId"))
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, rows)
}

func (h *handler) saveRecurringPay(c echo.Context) error {
	var in postgres.EmployeeRecurringPay
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	if id := c.Param("id"); id != "" {
		in.ID = id
	}
	if in.EmployeeID == "" || in.Label == "" {
		return problem.New(http.StatusBadRequest, "bad_request", "employeeId and label are required")
	}
	saved, err := h.svc.SaveRecurringPay(c.Request().Context(), in)
	if err != nil {
		return err
	}
	status := http.StatusCreated
	if c.Param("id") != "" {
		status = http.StatusOK
	}
	return c.JSON(status, saved)
}

func (h *handler) deleteRecurringPay(c echo.Context) error {
	if err := h.svc.DeleteRecurringPay(c.Request().Context(), c.Param("id")); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *handler) listLeaveBalances(c echo.Context) error {
	var year int32
	if y := c.QueryParam("year"); y != "" {
		if parsed, err := strconv.Atoi(y); err == nil {
			year = int32(parsed)
		}
	}
	rows, err := h.svc.ListLeaveBalances(c.Request().Context(), c.QueryParam("employeeId"), year)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, rows)
}

func (h *handler) saveLeaveBalance(c echo.Context) error {
	var in postgres.LeaveBalance
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	if in.EmployeeID == "" {
		return problem.New(http.StatusBadRequest, "bad_request", "employeeId is required")
	}
	saved, err := h.svc.SaveLeaveBalance(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, saved)
}

func (h *handler) listAttendance(c echo.Context) error {
	if d := c.QueryParam("date"); d != "" {
		if t, err := time.Parse("2006-01-02", d); err == nil {
			rows, err := h.svc.ListAttendanceByDate(c.Request().Context(), pgtype.Date{Time: t, Valid: true})
			if err != nil {
				return err
			}
			return c.JSON(http.StatusOK, rows)
		}
	}
	empID := c.QueryParam("employeeId")
	if empID == "" {
		return c.JSON(http.StatusOK, []postgres.AttendanceEntry{})
	}
	rows, err := h.svc.ListAttendance(c.Request().Context(), empID)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, rows)
}

func (h *handler) recordAttendance(c echo.Context) error {
	var body struct {
		ID         string  `json:"id"`
		EmployeeID string  `json:"employeeId"`
		EntryDate  string  `json:"entryDate"`
		Status     string  `json:"status"`
		Notes      *string `json:"notes"`
	}
	if err := c.Bind(&body); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	if body.EmployeeID == "" {
		return problem.New(http.StatusBadRequest, "bad_request", "employeeId is required")
	}
	entryDate := time.Now().UTC()
	if body.EntryDate != "" {
		if t, err := time.Parse("2006-01-02", body.EntryDate); err == nil {
			entryDate = t
		}
	}
	if body.Status == "" {
		body.Status = "present"
	}
	row, err := h.svc.RecordAttendance(c.Request().Context(), sqlcdb.RecordAttendanceParams{
		ID:         body.ID,
		EmployeeID: body.EmployeeID,
		EntryDate:  pgtype.Date{Time: entryDate, Valid: true},
		Status:     body.Status,
		Notes:      body.Notes,
	})
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, row)
}

func (h *handler) listIdentityUsers(c echo.Context) error {
	rows, err := h.svc.ListIdentityUserRefs(c.Request().Context(), c.QueryParam("realm"))
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, rows)
}
