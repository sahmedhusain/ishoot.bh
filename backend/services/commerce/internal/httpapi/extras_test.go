package httpapi

import (
	"os"
	"slices"
	"strings"
	"testing"

	"github.com/labstack/echo/v4"
	"platform.local/backend/services/commerce/migrations"
)

func TestExtrasRegistersLoyaltyAndWalletTableRoutes(t *testing.T) {
	e := echo.New()
	h := &handler{}
	g := e.Group("/v1/commerce")
	h.extrasRoutes(g)

	paths := make([]string, 0, len(e.Routes()))
	for _, r := range e.Routes() {
		paths = append(paths, r.Method+":"+r.Path)
	}
	if !slices.Contains(paths, "GET:/v1/commerce/regions") {
		t.Fatalf("missing GET:/v1/commerce/regions in %v", paths)
	}

	raw, err := os.ReadFile("extras.go")
	if err != nil {
		t.Fatalf("read extras.go: %v", err)
	}
	src := string(raw)
	for _, table := range []string{
		"customer_wallet_tx",
		"customer_points_tx",
		"gift_card",
		"order_return_request",
		"customer_wishlist",
		"store_settings",
		"store_region",
		"customer",
	} {
		if !strings.Contains(src, `"`+table+`"`) {
			t.Fatalf("extras.go missing RegisterTableRoutes entry %q", table)
		}
	}
}

func TestLoyaltyAndStoreSettingsMigrationsEmbedded(t *testing.T) {
	raw, err := migrations.FS.ReadFile("10006_loyalty_wallet_store.sql")
	if err != nil {
		t.Fatalf("read migration: %v", err)
	}
	sql := string(raw)
	for _, needle := range []string{
		"commerce.customer_wallet_tx",
		"commerce.customer_points_tx",
		"commerce.gift_card",
		"commerce.order_return_request",
		"commerce.customer_wishlist",
		"loyalty_points",
		"wallet_balance",
		"cookie_banner_enabled",
		"ssl_badge_enabled",
	} {
		if !strings.Contains(sql, needle) {
			t.Fatalf("migration missing %q", needle)
		}
	}

	raw10007, err := migrations.FS.ReadFile("10007_website_store_settings.sql")
	if err != nil {
		t.Fatalf("read 10007 migration: %v", err)
	}
	for _, needle := range []string{
		"announcement_en",
		"cr_number",
		"custom_categories_json",
		"show_category_bar",
		"show_deals_section",
		"show_gift_cards_section",
	} {
		if !strings.Contains(string(raw10007), needle) {
			t.Fatalf("10007 migration missing %q", needle)
		}
	}
}
