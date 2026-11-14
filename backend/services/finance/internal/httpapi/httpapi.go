package httpapi
import (
	"errors"
	"net/http"
	"github.com/labstack/echo/v4"
	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/authz"
	"platform.local/backend/pkg/problem"
	"platform.local/backend/services/finance/api"
	"platform.local/backend/services/finance/internal/app"
	"platform.local/backend/services/finance/internal/postgres/sqlcdb"
)
type Options struct {
	Verifier	*authn.Verifier
	Readers		[]string
	Writers		[]string
}
type handler struct {
	svc	*app.Service
	opts	Options
}
func Register(e *echo.Echo, svc *app.Service, opts Options) {
	h := &handler{svc: svc, opts: opts}
	e.GET("/v1/finance/openapi.yaml", func(c echo.Context) error {
		return c.Blob(http.StatusOK, "application/yaml", api.OpenAPI)
	})
	auth := authn.Require(opts.Verifier, authn.RealmService)
	g := e.Group("/v1/finance", auth, authz.ServiceCallers(opts.Readers, opts.Writers))
	g.GET("/invoices", h.listInvoices)
	g.POST("/invoices", h.createInvoice)
	g.POST("/invoices/from-quotation", h.createInvoiceFromQuotation)
	g.GET("/invoices/:id", h.getInvoice)
	g.PUT("/invoices/:id/status", h.updateInvoiceStatus)
	g.DELETE("/invoices/:id", h.deleteInvoice)
	g.GET("/payments", h.listPayments)
	g.GET("/payments/:id", h.getPayment)
	g.POST("/payments", h.recordPayment)
	g.DELETE("/payments/:id", h.deletePayment)
	g.GET("/expenses", h.listExpenses)
	g.POST("/expenses", h.createExpense)
	g.PUT("/expenses/:id/approve", h.approveExpense)
	g.GET("/expense-categories", h.listExpenseCategories)
	g.POST("/expense-categories", h.createExpenseCategory)
	g.PUT("/expense-categories/:id", h.updateExpenseCategory)
	g.DELETE("/expense-categories/:id", h.deleteExpenseCategory)
	g.GET("/settlements", h.listSettlements)
	g.POST("/settlements", h.createSettlement)
	g.GET("/catalog", h.listCatalogItems)
	g.GET("/contacts-ref", h.listContactsRef)
	g.GET("/quotations-ref", h.listQuotationsRef)
}
func (h *handler) listInvoices(c echo.Context) error {
	var contactID, quotationID *string
	if cid := c.QueryParam("contactId"); cid != "" {
		contactID = &cid
	}
	if qid := c.QueryParam("quotationId"); qid != "" {
		quotationID = &qid
	}
	invoices, err := h.svc.ListInvoicesFiltered(c.Request().Context(), contactID, quotationID)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, invoices)
}
func (h *handler) createInvoiceFromQuotation(c echo.Context) error {
	var in app.CreateInvoiceFromQuotationInput
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	created, err := h.svc.CreateInvoiceFromQuotation(c.Request().Context(), in)
	if err != nil {
		if errors.Is(err, app.ErrNotFound) {
			return problem.NotFound("quotation not found")
		}
		if errors.Is(err, app.ErrConflict) {
			return problem.New(http.StatusBadRequest, "bad_request", "quotationId is required")
		}
		return err
	}
	return c.JSON(http.StatusCreated, created)
}
func (h *handler) getInvoice(c echo.Context) error {
	inv, err := h.svc.GetInvoice(c.Request().Context(), c.Param("id"))
	if err != nil {
		if errors.Is(err, app.ErrNotFound) {
			return problem.NotFound("")
		}
		return err
	}
	return c.JSON(http.StatusOK, inv)
}
type createInvoiceInput struct {
	sqlcdb.CreateInvoiceParams
	Items	[]sqlcdb.InsertInvoiceItemParams	`json:"items"`
}
func (h *handler) createInvoice(c echo.Context) error {
	var in createInvoiceInput
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	created, err := h.svc.CreateInvoice(c.Request().Context(), in.CreateInvoiceParams, in.Items)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, created)
}
type statusBody struct {
	Status string `json:"status"`
}
func (h *handler) updateInvoiceStatus(c echo.Context) error {
	var body statusBody
	if err := c.Bind(&body); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	updated, err := h.svc.UpdateInvoiceStatus(c.Request().Context(), c.Param("id"), body.Status)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, updated)
}
func (h *handler) deleteInvoice(c echo.Context) error {
	if err := h.svc.DeleteInvoice(c.Request().Context(), c.Param("id")); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}
func (h *handler) listPayments(c echo.Context) error {
	var invoiceID, contactID *string
	if iid := c.QueryParam("invoiceId"); iid != "" {
		invoiceID = &iid
	}
	if cid := c.QueryParam("contactId"); cid != "" {
		contactID = &cid
	}
	payments, err := h.svc.ListPaymentsFiltered(c.Request().Context(), invoiceID, contactID)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, payments)
}
func (h *handler) getPayment(c echo.Context) error {
	payment, err := h.svc.GetPaymentDetails(c.Request().Context(), c.Param("id"))
	if err != nil {
		if errors.Is(err, app.ErrNotFound) {
			return problem.NotFound("")
		}
		return err
	}
	return c.JSON(http.StatusOK, payment)
}
type recordPaymentInput struct {
	sqlcdb.CreatePaymentParams
	Allocations []app.AllocationInput `json:"allocations"`
}
func (h *handler) recordPayment(c echo.Context) error {
	var in recordPaymentInput
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	payment, err := h.svc.RecordPaymentWithAllocations(c.Request().Context(), in.CreatePaymentParams, in.Allocations)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, payment)
}
func (h *handler) deletePayment(c echo.Context) error {
	if err := h.svc.DeletePayment(c.Request().Context(), c.Param("id")); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}
func (h *handler) listExpenses(c echo.Context) error {
	expenses, err := h.svc.ListExpenses(c.Request().Context())
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, expenses)
}
func (h *handler) createExpense(c echo.Context) error {
	var in sqlcdb.CreateExpenseParams
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	expense, err := h.svc.CreateExpense(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, expense)
}
type approveBody struct {
	ApprovedBy string `json:"approvedBy"`
}
func (h *handler) approveExpense(c echo.Context) error {
	var body approveBody
	if err := c.Bind(&body); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	expense, err := h.svc.ApproveExpense(c.Request().Context(), c.Param("id"), body.ApprovedBy)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, expense)
}
func (h *handler) listExpenseCategories(c echo.Context) error {
	cats, err := h.svc.ListExpenseCategories(c.Request().Context())
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, cats)
}
func (h *handler) createExpenseCategory(c echo.Context) error {
	var in sqlcdb.CreateExpenseCategoryParams
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	cat, err := h.svc.CreateExpenseCategory(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, cat)
}
func (h *handler) updateExpenseCategory(c echo.Context) error {
	var in sqlcdb.UpdateExpenseCategoryParams
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	in.ID = c.Param("id")
	cat, err := h.svc.UpdateExpenseCategory(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, cat)
}
func (h *handler) deleteExpenseCategory(c echo.Context) error {
	if err := h.svc.DeleteExpenseCategory(c.Request().Context(), c.Param("id")); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}
func (h *handler) listSettlements(c echo.Context) error {
	settlements, err := h.svc.ListBankSettlements(c.Request().Context())
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, settlements)
}
func (h *handler) createSettlement(c echo.Context) error {
	var in sqlcdb.CreateBankSettlementParams
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	created, err := h.svc.CreateBankSettlement(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, created)
}
func (h *handler) listCatalogItems(c echo.Context) error {
	items, err := h.svc.ListCatalogItems(c.Request().Context())
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, items)
}
func (h *handler) listContactsRef(c echo.Context) error {
	items, err := h.svc.ListContactsRef(c.Request().Context())
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, items)
}
func (h *handler) listQuotationsRef(c echo.Context) error {
	items, err := h.svc.ListQuotationsRef(c.Request().Context())
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, items)
}
