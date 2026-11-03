// Package httpapi exposes the sales use cases over HTTP.
package httpapi

import (
	"errors"
	"net/http"

	"github.com/labstack/echo/v4"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/problem"
	"platform.local/backend/services/sales/api"
	"platform.local/backend/services/sales/internal/app"
	"platform.local/backend/services/sales/internal/postgres/sqlcdb"
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

	e.GET("/v1/sales/openapi.yaml", func(c echo.Context) error {
		return c.Blob(http.StatusOK, "application/yaml", api.OpenAPI)
	})

	// Public inquiry creation
	e.POST("/v1/sales/inquiries", h.createInquiry)

	// Protected routes
	auth := authn.Require(opts.Verifier, authn.RealmStaff, authn.RealmService, authn.RealmIT)
	g := e.Group("/v1/sales", auth)

	// Contacts
	g.GET("/contacts", h.listContacts)
	g.POST("/contacts", h.createContact)
	g.GET("/contacts/:id", h.getContact)
	g.PUT("/contacts/:id", h.updateContact)
	g.DELETE("/contacts/:id", h.deleteContact)

	// Deals
	g.GET("/deals", h.listDeals)
	g.POST("/deals", h.createDeal)
	g.GET("/deals/:id", h.getDeal)
	g.PUT("/deals/:id", h.updateDeal)
	g.PUT("/deals/:id/stage", h.updateDealStage)
	g.DELETE("/deals/:id", h.deleteDeal)

	// Inquiries
	g.GET("/inquiries", h.listInquiries)
	g.GET("/inquiries/:id", h.getInquiry)
	g.PUT("/inquiries/:id/status", h.updateInquiryStatus)
	g.DELETE("/inquiries/:id", h.deleteInquiry)

	// Quotations
	g.GET("/quotations", h.listQuotations)
	g.POST("/quotations", h.createQuotation)
	g.GET("/quotations/:id", h.getQuotation)
	g.PUT("/quotations/:id/status", h.updateQuotationStatus)
	g.DELETE("/quotations/:id", h.deleteQuotation)

	// Campaigns
	g.GET("/campaigns", h.listCampaigns)
	g.POST("/campaigns", h.createCampaign)
	g.GET("/campaigns/:id", h.getCampaign)
	g.PUT("/campaigns/:id", h.updateCampaign)
	g.DELETE("/campaigns/:id", h.deleteCampaign)
}

// Contacts Handlers
func (h *handler) listContacts(c echo.Context) error {
	contacts, err := h.svc.ListContacts(c.Request().Context())
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, contacts)
}

func (h *handler) getContact(c echo.Context) error {
	contact, err := h.svc.GetContact(c.Request().Context(), c.Param("id"))
	if err != nil {
		if errors.Is(err, app.ErrNotFound) {
			return problem.NotFound("")
		}
		return err
	}
	return c.JSON(http.StatusOK, contact)
}

func (h *handler) createContact(c echo.Context) error {
	var in sqlcdb.CreateContactParams
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	if in.Tags == nil {
		in.Tags = []string{}
	}
	created, err := h.svc.CreateContact(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, created)
}

func (h *handler) updateContact(c echo.Context) error {
	var in sqlcdb.UpdateContactParams
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	in.ID = c.Param("id")
	if in.Tags == nil {
		in.Tags = []string{}
	}
	updated, err := h.svc.UpdateContact(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, updated)
}

func (h *handler) deleteContact(c echo.Context) error {
	if err := h.svc.DeleteContact(c.Request().Context(), c.Param("id")); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}

// Deals Handlers
func (h *handler) listDeals(c echo.Context) error {
	var contactID *string
	if cid := c.QueryParam("contactId"); cid != "" {
		contactID = &cid
	}
	deals, err := h.svc.ListDeals(c.Request().Context(), contactID)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, deals)
}

func (h *handler) getDeal(c echo.Context) error {
	deal, err := h.svc.GetDeal(c.Request().Context(), c.Param("id"))
	if err != nil {
		if errors.Is(err, app.ErrNotFound) {
			return problem.NotFound("")
		}
		return err
	}
	return c.JSON(http.StatusOK, deal)
}

func (h *handler) createDeal(c echo.Context) error {
	var in sqlcdb.CreateDealParams
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	created, err := h.svc.CreateDeal(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, created)
}

func (h *handler) updateDeal(c echo.Context) error {
	var in sqlcdb.UpdateDealParams
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	in.ID = c.Param("id")
	updated, err := h.svc.UpdateDeal(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, updated)
}

type stageBody struct {
	Stage  string `json:"stage"`
	Status string `json:"status"`
}

func (h *handler) updateDealStage(c echo.Context) error {
	var body stageBody
	if err := c.Bind(&body); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	updated, err := h.svc.UpdateDealStage(c.Request().Context(), c.Param("id"), body.Stage, body.Status)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, updated)
}

func (h *handler) deleteDeal(c echo.Context) error {
	if err := h.svc.DeleteDeal(c.Request().Context(), c.Param("id")); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}

// Inquiries Handlers
func (h *handler) listInquiries(c echo.Context) error {
	inquiries, err := h.svc.ListInquiries(c.Request().Context())
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, inquiries)
}

func (h *handler) getInquiry(c echo.Context) error {
	inquiry, err := h.svc.GetInquiry(c.Request().Context(), c.Param("id"))
	if err != nil {
		if errors.Is(err, app.ErrNotFound) {
			return problem.NotFound("")
		}
		return err
	}
	return c.JSON(http.StatusOK, inquiry)
}

func (h *handler) createInquiry(c echo.Context) error {
	var in sqlcdb.CreateInquiryParams
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	if in.InquiryType == "" {
		in.InquiryType = "general"
	}
	if in.Status == "" {
		in.Status = "new"
	}
	if in.Priority == "" {
		in.Priority = "normal"
	}
	created, err := h.svc.CreateInquiry(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, created)
}

type statusBody struct {
	Status string `json:"status"`
}

func (h *handler) updateInquiryStatus(c echo.Context) error {
	var body statusBody
	if err := c.Bind(&body); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	updated, err := h.svc.UpdateInquiryStatus(c.Request().Context(), c.Param("id"), body.Status)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, updated)
}

func (h *handler) deleteInquiry(c echo.Context) error {
	if err := h.svc.DeleteInquiry(c.Request().Context(), c.Param("id")); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}

// Quotations Handlers
func (h *handler) listQuotations(c echo.Context) error {
	quotations, err := h.svc.ListQuotations(c.Request().Context())
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, quotations)
}

func (h *handler) getQuotation(c echo.Context) error {
	quotation, err := h.svc.GetQuotation(c.Request().Context(), c.Param("id"))
	if err != nil {
		if errors.Is(err, app.ErrNotFound) {
			return problem.NotFound("")
		}
		return err
	}
	return c.JSON(http.StatusOK, quotation)
}

type createQuotationInput struct {
	sqlcdb.CreateQuotationParams
	Items []sqlcdb.InsertQuotationItemParams `json:"items"`
}

func (h *handler) createQuotation(c echo.Context) error {
	var in createQuotationInput
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	created, err := h.svc.CreateQuotation(c.Request().Context(), in.CreateQuotationParams, in.Items)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, created)
}

func (h *handler) updateQuotationStatus(c echo.Context) error {
	var body statusBody
	if err := c.Bind(&body); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	updated, err := h.svc.UpdateQuotationStatus(c.Request().Context(), c.Param("id"), body.Status)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, updated)
}

func (h *handler) deleteQuotation(c echo.Context) error {
	if err := h.svc.DeleteQuotation(c.Request().Context(), c.Param("id")); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}

// Campaigns Handlers
func (h *handler) listCampaigns(c echo.Context) error {
	campaigns, err := h.svc.ListCampaigns(c.Request().Context())
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, campaigns)
}

func (h *handler) getCampaign(c echo.Context) error {
	campaign, err := h.svc.GetCampaign(c.Request().Context(), c.Param("id"))
	if err != nil {
		if errors.Is(err, app.ErrNotFound) {
			return problem.NotFound("")
		}
		return err
	}
	return c.JSON(http.StatusOK, campaign)
}

func (h *handler) createCampaign(c echo.Context) error {
	var in sqlcdb.CreateCampaignParams
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	created, err := h.svc.CreateCampaign(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, created)
}

func (h *handler) updateCampaign(c echo.Context) error {
	var in sqlcdb.UpdateCampaignParams
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	in.ID = c.Param("id")
	updated, err := h.svc.UpdateCampaign(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, updated)
}

func (h *handler) deleteCampaign(c echo.Context) error {
	if err := h.svc.DeleteCampaign(c.Request().Context(), c.Param("id")); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}
