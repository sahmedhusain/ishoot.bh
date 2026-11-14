package httpapi

import (
	"errors"
	"net/http"

	"github.com/labstack/echo/v4"
	"platform.local/backend/pkg/problem"
	"platform.local/backend/services/workflow/internal/app"
	"platform.local/backend/services/workflow/internal/postgres"
)

func relationFilterFromQuery(c echo.Context) postgres.RelationFilter {
	return postgres.RelationFilter{
		ClientID:     c.QueryParam("clientId"),
		DealID:       c.QueryParam("dealId"),
		ProjectID:    c.QueryParam("projectId"),
		DepartmentID: c.QueryParam("departmentId"),
		EmployeeID:   c.QueryParam("employeeId"),
		DocumentID:   c.QueryParam("documentId"),
		DocumentType: c.QueryParam("documentType"),
		EntityType:   c.QueryParam("entityType"),
		EntityID:     c.QueryParam("entityId"),
		MomID:        c.QueryParam("momId"),
		Status:       c.QueryParam("status"),
	}
}

func (h *handler) listContracts(c echo.Context) error {
	items, err := h.svc.ListContractsFiltered(c.Request().Context(), postgres.ContractFilter{
		ContactID:    c.QueryParam("contactId"),
		DealID:       c.QueryParam("dealId"),
		ProjectID:    c.QueryParam("projectId"),
		QuotationID:  c.QueryParam("quotationId"),
		InvoiceID:    c.QueryParam("invoiceId"),
		EmployeeID:   c.QueryParam("employeeId"),
		DepartmentID: c.QueryParam("departmentId"),
		Status:       c.QueryParam("status"),
	})
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, items)
}

func (h *handler) getContract(c echo.Context) error {
	item, err := h.svc.GetContractRelational(c.Request().Context(), c.Param("id"))
	if err != nil {
		if errors.Is(err, app.ErrNotFound) {
			return problem.NotFound("")
		}
		return err
	}
	return c.JSON(http.StatusOK, item)
}

func (h *handler) saveContract(c echo.Context) error {
	var in postgres.ContractRecord
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	if id := c.Param("id"); id != "" {
		in.ID = id
	}
	saved, err := h.svc.SaveContractRelational(c.Request().Context(), in)
	if err != nil {
		return err
	}
	code := http.StatusCreated
	if c.Param("id") != "" {
		code = http.StatusOK
	}
	return c.JSON(code, saved)
}

func (h *handler) deleteContract(c echo.Context) error {
	if err := h.svc.DeleteContractRelational(c.Request().Context(), c.Param("id")); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *handler) listApprovalsRelational(c echo.Context) error {
	items, err := h.svc.ListApprovalRequestsFiltered(c.Request().Context(), relationFilterFromQuery(c))
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, items)
}

func (h *handler) createApprovalRelational(c echo.Context) error {
	var in postgres.ApprovalRequestRelational
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	created, err := h.svc.CreateApprovalRequestRelational(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, created)
}

func (h *handler) listSignaturesRelational(c echo.Context) error {
	items, err := h.svc.ListSignatureRequestsFiltered(c.Request().Context(), relationFilterFromQuery(c))
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, items)
}

func (h *handler) createSignatureRelational(c echo.Context) error {
	var in postgres.SignatureRequestRelational
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	created, err := h.svc.CreateSignatureRequestRelational(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, created)
}

func (h *handler) listLettersRelational(c echo.Context) error {
	items, err := h.svc.ListOfficialLettersFiltered(c.Request().Context(), relationFilterFromQuery(c))
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, items)
}

func (h *handler) createLetterRelational(c echo.Context) error {
	var in postgres.OfficialLetterRelational
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	created, err := h.svc.CreateOfficialLetterRelational(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, created)
}

func (h *handler) listCalendarRelational(c echo.Context) error {
	items, err := h.svc.ListCalendarEventsFiltered(c.Request().Context(), relationFilterFromQuery(c))
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, items)
}

func (h *handler) createCalendarRelational(c echo.Context) error {
	var in postgres.CalendarEventRelational
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	created, err := h.svc.CreateCalendarEventRelational(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, created)
}
