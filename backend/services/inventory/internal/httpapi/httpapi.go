package httpapi
import (
	"errors"
	"net/http"
	"strconv"
	"github.com/labstack/echo/v4"
	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/authz"
	"platform.local/backend/pkg/problem"
	"platform.local/backend/services/inventory/api"
	"platform.local/backend/services/inventory/internal/app"
	"platform.local/backend/services/inventory/internal/postgres/sqlcdb"
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
	e.GET("/v1/inventory/openapi.yaml", func(c echo.Context) error {
		return c.Blob(http.StatusOK, "application/yaml", api.OpenAPI)
	})
	auth := authn.Require(opts.Verifier, authn.RealmService)
	g := e.Group("/v1/inventory", auth, authz.ServiceCallers(opts.Readers, opts.Writers))
	g.GET("/warehouses", h.listWarehouses)
	g.POST("/warehouses", h.createWarehouse)
	g.GET("/warehouses/:id", h.getWarehouse)
	g.GET("/warehouses/:id/locations", h.listLocations)
	g.POST("/warehouses/:id/locations", h.createLocation)
	g.GET("/categories", h.listCategories)
	g.POST("/categories", h.createCategory)
	g.GET("/products", h.listProducts)
	g.POST("/products", h.createProduct)
	g.GET("/products/:id", h.getProduct)
	g.PUT("/products/:id", h.updateProduct)
	g.GET("/products/:id/variants", h.listVariants)
	g.POST("/products/:id/variants", h.createVariant)
	g.GET("/stock/levels", h.listStockLevels)
	g.POST("/stock/adjust", h.adjustStock)
	g.GET("/stock/movements", h.listMovements)
	g.GET("/counts", h.listStockCounts)
	g.POST("/counts", h.createStockCount)
	g.GET("/counts/:id", h.getStockCount)
	g.GET("/counts/:id/lines", h.listStockCountLines)
	g.POST("/counts/:id/lines", h.createStockCountLine)

	adminInv := e.Group("/v1/admin/inventory", auth, authz.ServiceCallers(opts.Readers, opts.Writers))
	adminInv.GET("/warehouses", h.listWarehouses)
	adminInv.POST("/warehouses", h.createWarehouse)
	adminInv.GET("/warehouses/:id", h.getWarehouse)
	adminInv.GET("/warehouses/:id/locations", h.listLocations)
	adminInv.POST("/warehouses/:id/locations", h.createLocation)
	adminInv.GET("/stock/levels", h.listStockLevels)
	adminInv.POST("/stock/adjust", h.adjustStock)
	adminInv.GET("/stock/movements", h.listMovements)
	adminInv.GET("/counts", h.listStockCounts)
	adminInv.POST("/counts", h.createStockCount)
	adminInv.GET("/counts/:id", h.getStockCount)
	adminInv.GET("/counts/:id/lines", h.listStockCountLines)
	adminInv.POST("/counts/:id/lines", h.createStockCountLine)

	adminProd := e.Group("/v1/admin/products", auth, authz.ServiceCallers(opts.Readers, opts.Writers))
	adminProd.GET("", h.listProducts)
	adminProd.POST("", h.createProduct)
	adminProd.GET("/:id", h.getProduct)
	adminProd.PUT("/:id", h.updateProduct)
	adminProd.GET("/:id/variants", h.listVariants)
	adminProd.POST("/:id/variants", h.createVariant)
	adminProd.GET("/categories", h.listCategories)
	adminProd.POST("/categories", h.createCategory)
}
func (h *handler) listWarehouses(c echo.Context) error {
	whs, err := h.svc.ListWarehouses(c.Request().Context())
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, whs)
}
func (h *handler) getWarehouse(c echo.Context) error {
	wh, err := h.svc.GetWarehouse(c.Request().Context(), c.Param("id"))
	if err != nil {
		if errors.Is(err, app.ErrNotFound) {
			return problem.NotFound("")
		}
		return err
	}
	return c.JSON(http.StatusOK, wh)
}
func (h *handler) createWarehouse(c echo.Context) error {
	var in sqlcdb.CreateWarehouseParams
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	res, err := h.svc.CreateWarehouse(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, res)
}
func (h *handler) listLocations(c echo.Context) error {
	locs, err := h.svc.ListLocations(c.Request().Context(), c.Param("id"))
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, locs)
}
func (h *handler) createLocation(c echo.Context) error {
	var in sqlcdb.CreateLocationParams
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	in.WarehouseID = c.Param("id")
	res, err := h.svc.CreateLocation(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, res)
}
func (h *handler) listCategories(c echo.Context) error {
	cats, err := h.svc.ListCategories(c.Request().Context())
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, cats)
}
func (h *handler) createCategory(c echo.Context) error {
	var in sqlcdb.CreateCategoryParams
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	res, err := h.svc.CreateCategory(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, res)
}
func (h *handler) listProducts(c echo.Context) error {
	prods, err := h.svc.ListProducts(c.Request().Context())
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, prods)
}
func (h *handler) getProduct(c echo.Context) error {
	prod, err := h.svc.GetProduct(c.Request().Context(), c.Param("id"))
	if err != nil {
		if errors.Is(err, app.ErrNotFound) {
			return problem.NotFound("")
		}
		return err
	}
	return c.JSON(http.StatusOK, prod)
}
func (h *handler) createProduct(c echo.Context) error {
	var in sqlcdb.CreateProductParams
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	res, err := h.svc.CreateProduct(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, res)
}
func (h *handler) updateProduct(c echo.Context) error {
	var in sqlcdb.UpdateProductParams
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	in.ID = c.Param("id")
	res, err := h.svc.UpdateProduct(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, res)
}
func (h *handler) listVariants(c echo.Context) error {
	vars, err := h.svc.ListVariants(c.Request().Context(), c.Param("id"))
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, vars)
}
func (h *handler) createVariant(c echo.Context) error {
	var in sqlcdb.CreateProductVariantParams
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	in.ProductID = c.Param("id")
	res, err := h.svc.CreateVariant(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, res)
}
func (h *handler) listStockLevels(c echo.Context) error {
	prodID := c.QueryParam("productId")
	levels, err := h.svc.ListStockLevels(c.Request().Context(), prodID)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, levels)
}
type adjustStockInput struct {
	Movement	sqlcdb.CreateStockMovementParams	`json:"movement"`
	Level		sqlcdb.UpsertStockLevelParams		`json:"level"`
}
func (h *handler) adjustStock(c echo.Context) error {
	var in adjustStockInput
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	res, err := h.svc.AdjustStock(c.Request().Context(), in.Movement, in.Level)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, res)
}
func (h *handler) listMovements(c echo.Context) error {
	prodID := c.QueryParam("productId")
	limitStr := c.QueryParam("limit")
	limit := 50
	if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
		limit = l
	}
	movements, err := h.svc.ListStockMovements(c.Request().Context(), prodID, int32(limit))
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, movements)
}
func (h *handler) listStockCounts(c echo.Context) error {
	counts, err := h.svc.ListStockCounts(c.Request().Context())
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, counts)
}
func (h *handler) getStockCount(c echo.Context) error {
	sc, err := h.svc.GetStockCount(c.Request().Context(), c.Param("id"))
	if err != nil {
		if errors.Is(err, app.ErrNotFound) {
			return problem.NotFound("")
		}
		return err
	}
	return c.JSON(http.StatusOK, sc)
}
func (h *handler) createStockCount(c echo.Context) error {
	var in sqlcdb.CreateStockCountParams
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	res, err := h.svc.CreateStockCount(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, res)
}
func (h *handler) listStockCountLines(c echo.Context) error {
	lines, err := h.svc.ListStockCountLines(c.Request().Context(), c.Param("id"))
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, lines)
}
func (h *handler) createStockCountLine(c echo.Context) error {
	var in sqlcdb.CreateStockCountLineParams
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	in.CountID = c.Param("id")
	res, err := h.svc.CreateStockCountLine(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, res)
}
