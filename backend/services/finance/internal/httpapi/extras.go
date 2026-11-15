package httpapi

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"platform.local/backend/pkg/db"
)

func (h *handler) extrasRoutes(g *echo.Group) {
	list := func(table, orderBy string) echo.HandlerFunc {
		return func(c echo.Context) error {
			raw, err := h.svc.ListFinanceTableJSON(c.Request().Context(), table, orderBy)
			if err != nil {
				return err
			}
			return c.JSONBlob(http.StatusOK, raw)
		}
	}
	g.GET("/expense-claims", list("expense_claim", "created_at DESC"))
	g.GET("/recurring-expenses", list("recurring_expense", "created_at DESC"))
	g.GET("/supplier-bills", list("supplier_bill", "created_at DESC"))
	g.GET("/tax-rates", list("tax_rate", "created_at DESC"))
	g.GET("/commission-rules", list("commission_rule", "created_at DESC"))
	g.GET("/commission-payouts", list("commission_payout", "created_at DESC"))
	g.GET("/commission-snapshots", list("commission_snapshot", "created_at DESC"))
	g.GET("/cashier-sessions", list("cashier_session", "opened_at DESC"))
	g.GET("/cash-drawers", list("cash_drawer", "name ASC"))
	g.GET("/journal-entries", list("journal_entry", "entry_date DESC"))
	g.GET("/journal-lines", list("journal_line", "id ASC"))
	g.GET("/payment-attempts", list("payment_attempt", "created_at DESC"))
	g.GET("/payment-collections", list("payment_collection", "created_at DESC"))
	g.GET("/payment-methods", list("payment_method_config", "provider ASC"))
	g.GET("/document-taxes", list("document_tax", "created_at DESC"))

	db.RegisterTableRoutes(g, h.svc.Pool(), "finance", []string{
		"agency_invoice", "bank_settlement", "cash_drawer", "cashier_session", "catalog_item_ref",
		"commission_payout", "commission_rule", "commission_snapshot", "contact_ref", "document_tax",
		"expense", "expense_category", "expense_claim", "invoice", "invoice_item", "invoice_line_item",
		"journal_entry", "journal_line", "payment", "payment_allocation", "payment_attempt",
		"payment_collection", "payment_method_config", "payment_webhook_event", "quotation_ref",
		"recurring_expense", "supplier_bill", "supplier_bill_line", "supplier_payment", "tax_rate",
	})
}
