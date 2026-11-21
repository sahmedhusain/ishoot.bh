package httpapi

import (
	"io"
	"net/http"

	"github.com/labstack/echo/v4"
	"platform.local/backend/pkg/db"
)

func (h *handler) extrasRoutes(services *echo.Group) {
	list := func(table, orderBy string) echo.HandlerFunc {
		return func(c echo.Context) error {
			raw, err := h.svc.ListSystemTableJSON(c.Request().Context(), table, orderBy)
			if err != nil {
				return err
			}
			return c.JSONBlob(http.StatusOK, raw)
		}
	}
	read := caller(h.opts.ReadCallers)
	services.GET("/report-schedules", list("report_schedule", "created_at DESC"), read)
	services.GET("/company-documents", list("company_document", "created_at DESC"), read)
	services.GET("/service-settings", list("service_settings", "updated_at DESC"), read)
	services.GET("/revalidation-jobs", list("revalidation_job", "created_at DESC"), read)
	services.GET("/announcements", list("announcement", "created_at DESC"), read)
	services.GET("/announcement-receipts", list("announcement_receipt", "announcement_id ASC"), read)
	services.GET("/broadcasts", list("broadcast", "created_at DESC"), read)
	services.GET("/broadcast-recipients", list("broadcast_recipient", "id ASC"), read)
	services.GET("/communication-settings", list("communication_settings", "updated_at DESC"), read)
	services.GET("/email-jobs", list("email_job", "created_at DESC"), read)
	services.GET("/communication-threads", list("communication_thread", "created_at DESC"), read)
	services.GET("/communication-messages", list("communication_message", "created_at DESC"), read)
	services.GET("/document-templates", list("document_template", "created_at DESC"), read)
	services.GET("/generated-documents", list("generated_document", "created_at DESC"), read)
	services.GET("/backup-records", list("backup_record", "created_at DESC"), read)
	services.GET("/canned-replies", list("canned_reply", "sort_order ASC"), read)
	services.GET("/hr-policies", list("hr_policy", "id ASC"), read)
	services.PUT("/hr-policies", func(c echo.Context) error {
		body, err := io.ReadAll(c.Request().Body)
		if err != nil {
			return err
		}
		raw, err := h.svc.SaveHrPolicy(c.Request().Context(), body)
		if err != nil {
			return err
		}
		return c.JSONBlob(http.StatusOK, raw)
	}, caller(h.opts.CompanyWriters))
	services.GET("/public-holidays", list("public_holiday", "date ASC"), read)
	services.POST("/public-holidays", func(c echo.Context) error {
		var in struct {
			ID     string `json:"id"`
			Date   string `json:"date"`
			NameEn string `json:"nameEn"`
			NameAr string `json:"nameAr"`
		}
		if err := c.Bind(&in); err != nil {
			return err
		}
		raw, err := h.svc.SavePublicHoliday(c.Request().Context(), in.ID, in.Date, in.NameEn, in.NameAr)
		if err != nil {
			return err
		}
		return c.JSONBlob(http.StatusOK, raw)
	}, caller(h.opts.CompanyWriters))
	services.DELETE("/public-holidays/:id", func(c echo.Context) error {
		if err := h.svc.DeletePublicHoliday(c.Request().Context(), c.Param("id")); err != nil {
			return err
		}
		return c.NoContent(http.StatusNoContent)
	}, caller(h.opts.CompanyWriters))
	services.GET("/final-settlements", list("final_settlement", "last_working_day DESC"), read)
	db.RegisterTableRoutes(services, h.svc.Pool(), "system", []string{
		"abuse_window", "account_change_request", "accounting_account", "accounting_period",
		"activity_log", "announcement", "announcement_receipt", "api_key", "approval_policy",
		"approval_policy_step", "backup_record", "broadcast", "broadcast_recipient",
		"calendar_feed_token", "canned_reply", "client_contact_person", "client_logo",
		"client_signature", "communication_message", "communication_settings", "communication_thread",
		"company", "company_asset", "company_document", "company_setting", "dashboard_layout",
		"debug_toggle", "document_fx", "document_sequence", "document_template", "email_job",
		"employment_record", "exchange_rate_snapshot", "feature_toggle", "final_settlement",
		"final_settlement_line", "generated_document", "hero_banner", "hr_policy",
		"integration_setting", "label_print_job", "legal_matter", "legal_matter_event",
		"media_contact", "media_coverage", "message_attachment", "module_setting",
		"number_reservation", "package_content", "payslip", "profile_change_request",
		"project", "public_holiday", "reference_sequence", "report_schedule",
		"request_assignment", "request_comment", "request_event", "revalidation_job",
		"serial_generation", "service", "service_settings", "signature_change",
		"signature_policy", "site_setting", "studio_equipment", "tag", "wishlist_item",
	}, read)
}
