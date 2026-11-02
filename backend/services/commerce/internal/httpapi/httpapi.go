// Package httpapi exposes the commerce use cases over HTTP.
package httpapi

import (
	"errors"
	"net/http"

	"github.com/labstack/echo/v4"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/problem"
	"platform.local/backend/services/commerce/api"
	"platform.local/backend/services/commerce/internal/app"
	"platform.local/backend/services/commerce/internal/postgres/sqlcdb"
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

	e.GET("/v1/commerce/openapi.yaml", func(c echo.Context) error {
		return c.Blob(http.StatusOK, "application/yaml", api.OpenAPI)
	})

	auth := authn.Require(opts.Verifier, authn.RealmStaff, authn.RealmService, authn.RealmCustomer, authn.RealmIT)
	g := e.Group("/v1/commerce", auth)

	// Customers
	g.GET("/customers", h.listCustomers)
	g.POST("/customers", h.createCustomer)
	g.GET("/customers/:id", h.getCustomer)
	g.GET("/customers/:id/addresses", h.listCustomerAddresses)
	g.POST("/customers/:id/addresses", h.createCustomerAddress)

	// Settings & Coupons
	g.GET("/settings", h.getStoreSettings)
	g.PUT("/settings", h.upsertStoreSettings)
	g.GET("/coupons", h.listCoupons)
	g.POST("/coupons", h.createCoupon)
	g.GET("/coupons/:code", h.getCoupon)

	// Orders
	g.GET("/orders", h.listOrders)
	g.POST("/orders", h.placeOrder)
	g.GET("/orders/:id", h.getOrder)
	g.POST("/orders/:id/pay", h.recordOrderPayment)
	g.PUT("/orders/:id/status", h.updateOrderStatus)
	g.GET("/orders/:id/lines", h.listOrderLines)
	g.GET("/orders/:id/events", h.listOrderEvents)

	// Retail POS
	g.GET("/retail/registers", h.listRetailRegisters)
	g.POST("/retail/registers", h.createRetailRegister)
	g.GET("/retail/shifts", h.listRetailShifts)
	g.POST("/retail/shifts", h.createRetailShift)
	g.POST("/retail/shifts/:id/close", h.closeRetailShift)
}

func (h *handler) listCustomers(c echo.Context) error {
	customers, err := h.svc.ListCustomers(c.Request().Context())
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, customers)
}

func (h *handler) getCustomer(c echo.Context) error {
	cust, err := h.svc.GetCustomer(c.Request().Context(), c.Param("id"))
	if err != nil {
		if errors.Is(err, app.ErrNotFound) {
			return problem.NotFound("")
		}
		return err
	}
	return c.JSON(http.StatusOK, cust)
}

func (h *handler) createCustomer(c echo.Context) error {
	var in sqlcdb.CreateCustomerParams
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	res, err := h.svc.CreateCustomer(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, res)
}

func (h *handler) listCustomerAddresses(c echo.Context) error {
	addresses, err := h.svc.ListCustomerAddresses(c.Request().Context(), c.Param("id"))
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, addresses)
}

func (h *handler) createCustomerAddress(c echo.Context) error {
	var in sqlcdb.CreateCustomerAddressParams
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	in.CustomerID = c.Param("id")
	res, err := h.svc.CreateCustomerAddress(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, res)
}

func (h *handler) getStoreSettings(c echo.Context) error {
	settings, err := h.svc.GetStoreSettings(c.Request().Context())
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, settings)
}

func (h *handler) upsertStoreSettings(c echo.Context) error {
	var in sqlcdb.UpsertStoreSettingsParams
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	res, err := h.svc.UpsertStoreSettings(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, res)
}

func (h *handler) listCoupons(c echo.Context) error {
	coupons, err := h.svc.ListCoupons(c.Request().Context())
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, coupons)
}

func (h *handler) getCoupon(c echo.Context) error {
	coupon, err := h.svc.GetCoupon(c.Request().Context(), c.Param("code"))
	if err != nil {
		if errors.Is(err, app.ErrNotFound) {
			return problem.NotFound("")
		}
		return err
	}
	return c.JSON(http.StatusOK, coupon)
}

func (h *handler) createCoupon(c echo.Context) error {
	var in sqlcdb.CreateCouponParams
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	res, err := h.svc.CreateCoupon(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, res)
}

func (h *handler) listOrders(c echo.Context) error {
	orders, err := h.svc.ListOrders(c.Request().Context())
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, orders)
}

func (h *handler) getOrder(c echo.Context) error {
	order, err := h.svc.GetOrder(c.Request().Context(), c.Param("id"))
	if err != nil {
		if errors.Is(err, app.ErrNotFound) {
			return problem.NotFound("")
		}
		return err
	}
	return c.JSON(http.StatusOK, order)
}

type placeOrderInput struct {
	Order sqlcdb.CreateOrderParams     `json:"order"`
	Lines []sqlcdb.CreateOrderLineParams `json:"lines"`
}

func (h *handler) placeOrder(c echo.Context) error {
	var in placeOrderInput
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	res, err := h.svc.PlaceOrder(c.Request().Context(), in.Order, in.Lines)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, res)
}

func (h *handler) recordOrderPayment(c echo.Context) error {
	var in sqlcdb.UpdateOrderPaymentStatusParams
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	in.ID = c.Param("id")
	res, err := h.svc.RecordOrderPayment(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, res)
}

func (h *handler) updateOrderStatus(c echo.Context) error {
	var in sqlcdb.UpdateOrderStatusParams
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	in.ID = c.Param("id")
	res, err := h.svc.UpdateOrderStatus(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, res)
}

func (h *handler) listOrderLines(c echo.Context) error {
	lines, err := h.svc.ListOrderLines(c.Request().Context(), c.Param("id"))
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, lines)
}

func (h *handler) listOrderEvents(c echo.Context) error {
	events, err := h.svc.ListOrderEvents(c.Request().Context(), c.Param("id"))
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, events)
}

func (h *handler) listRetailRegisters(c echo.Context) error {
	regs, err := h.svc.ListRetailRegisters(c.Request().Context())
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, regs)
}

func (h *handler) createRetailRegister(c echo.Context) error {
	var in sqlcdb.CreateRetailRegisterParams
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	res, err := h.svc.CreateRetailRegister(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, res)
}

func (h *handler) listRetailShifts(c echo.Context) error {
	shifts, err := h.svc.ListRetailShifts(c.Request().Context())
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, shifts)
}

func (h *handler) createRetailShift(c echo.Context) error {
	var in sqlcdb.CreateRetailShiftParams
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	res, err := h.svc.CreateRetailShift(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, res)
}

func (h *handler) closeRetailShift(c echo.Context) error {
	var in sqlcdb.CloseRetailShiftParams
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	in.ID = c.Param("id")
	res, err := h.svc.CloseRetailShift(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, res)
}