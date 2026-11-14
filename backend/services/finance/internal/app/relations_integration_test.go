package app_test

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"

	"platform.local/backend/pkg/migrate"
	"platform.local/backend/pkg/testkit"
	"platform.local/backend/services/finance/internal/app"
	"platform.local/backend/services/finance/internal/postgres"
	"platform.local/backend/services/finance/internal/postgres/sqlcdb"
	"platform.local/backend/services/finance/migrations"
)

func setupFinancePostgres(t *testing.T) (*app.Service, *pgxpool.Pool) {
	t.Helper()
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, testkit.Postgres(t))
	require.NoError(t, err)
	t.Cleanup(pool.Close)
	require.NoError(t, migrate.Run(ctx, pool, migrate.Options{
		Schema:     postgres.Schema,
		Migrations: migrations.FS,
		Logger:     slog.New(slog.NewTextHandler(io.Discard, nil)),
	}))
	return app.New(postgres.New(pool)), pool
}

func num(s string) pgtype.Numeric {
	var n pgtype.Numeric
	_ = n.Scan(s)
	return n
}

func TestFinanceRelationalFlowAndDomainSyncIntegration(t *testing.T) {
	ctx := context.Background()
	svc, pool := setupFinancePostgres(t)

	// 1. Sync contact, service, product, and accepted quotation via idempotent domain event handlers.
	evContact := "11111111-1111-4111-8111-111111111101"
	evService := "11111111-1111-4111-8111-111111111102"
	evProduct := "11111111-1111-4111-8111-111111111103"
	evQuote := "11111111-1111-4111-8111-111111111104"

	contactPayload := []byte(`{"id":"contact-1","firstName":"Ali","lastName":"Hassan","company":"Al Manar Films","email":"ali@manar.test","phone":"+97317000001"}`)
	require.NoError(t, svc.HandleDomainEvent(ctx, evContact, "sales.contact.upserted", contactPayload))
	require.NoError(t, svc.HandleDomainEvent(ctx, evContact, "sales.contact.upserted", contactPayload), "duplicate event id must be ignored idempotently")

	require.NoError(t, svc.HandleDomainEvent(ctx, evService, "system.service.upserted", []byte(`{
		"kind":"service","id":"svc-1","sku":"SRV-CAM","nameEn":"Cinema Camera Package","nameAr":"باقة الكاميرا السينمائية","unit":"day","unitPrice":250.000,"currency":"BHD","taxRate":10,"isActive":true
	}`)))
	require.NoError(t, svc.HandleDomainEvent(ctx, evProduct, "inventory.product.upserted", []byte(`{
		"kind":"product","id":"prod-1","variantId":"","sku":"PRD-SD","nameEn":"CFast Media Pack","nameAr":"ذاكرة تصوير","unit":"unit","unitPrice":50.000,"currency":"BHD","taxRate":10,"isActive":true
	}`)))

	quoteItems, err := json.Marshal([]app.QuotationSnapshotItem{
		{
			ID:            "qi-1",
			ItemKind:      "service",
			ServiceID:     strPtr("svc-1"),
			Sku:           strPtr("SRV-CAM"),
			Unit:          strPtr("day"),
			Description:   "Cinema Camera Package",
			DescriptionEn: "Cinema Camera Package",
			DescriptionAr: "باقة الكاميرا السينمائية",
			Quantity:      2,
			UnitPrice:     250,
			TaxRate:       10,
			Amount:        500,
			SortOrder:     0,
		},
		{
			ID:            "qi-2",
			ItemKind:      "product",
			ProductID:     strPtr("prod-1"),
			Sku:           strPtr("PRD-SD"),
			Unit:          strPtr("unit"),
			Description:   "CFast Media Pack",
			DescriptionEn: "CFast Media Pack",
			DescriptionAr: "ذاكرة تصوير",
			Quantity:      2,
			UnitPrice:     50,
			TaxRate:       10,
			Amount:        100,
			SortOrder:     1,
		},
	})
	require.NoError(t, err)

	quotePayload, err := json.Marshal(map[string]any{
		"id":              "quote-1",
		"quotationNumber": "QTE-2026-0001",
		"dealId":          "deal-1",
		"contactId":       "contact-1",
		"currency":        "BHD",
		"subtotal":        600.0,
		"discount":        0.0,
		"vatRate":         10.0,
		"vatAmount":       60.0,
		"total":           660.0,
		"status":          "accepted",
		"items":           json.RawMessage(quoteItems),
	})
	require.NoError(t, err)
	require.NoError(t, svc.HandleDomainEvent(ctx, evQuote, "sales.quotation.upserted", quotePayload))

	contacts, err := svc.ListContactsRef(ctx)
	require.NoError(t, err)
	require.Len(t, contacts, 1)
	catalog, err := svc.ListCatalogItems(ctx)
	require.NoError(t, err)
	require.Len(t, catalog, 2)
	quotes, err := svc.ListQuotationsRef(ctx)
	require.NoError(t, err)
	require.Len(t, quotes, 1)

	// Verify outbox inbox deduplication recorded exact 4 handled events.
	var handledCount int
	require.NoError(t, pool.QueryRow(ctx, `SELECT count(*) FROM finance.inbox`).Scan(&handledCount))
	require.Equal(t, 4, handledCount)

	// 2. Convert quotation -> invoice and assert catalog refs, contact ref, and quotation link are persisted.
	inv, err := svc.CreateInvoiceFromQuotation(ctx, app.CreateInvoiceFromQuotationInput{
		QuotationID:   "quote-1",
		InvoiceNumber: "INV-2026-0001",
	})
	require.NoError(t, err)
	require.Equal(t, "INV-2026-0001", inv.InvoiceNumber)
	require.NotNil(t, inv.QuotationID)
	require.Equal(t, "quote-1", *inv.QuotationID)
	require.NotNil(t, inv.ContactID)
	require.Equal(t, "contact-1", *inv.ContactID)
	require.Len(t, inv.Items, 2)
	require.Equal(t, "service", inv.Items[0].ItemKind)
	require.Equal(t, "product", inv.Items[1].ItemKind)

	// Outbox emits finance.invoice.created
	var outboxCount int
	require.NoError(t, pool.QueryRow(ctx, `SELECT count(*) FROM finance.outbox WHERE subject = 'finance.invoice.created'`).Scan(&outboxCount))
	require.Equal(t, 1, outboxCount)

	// 3. Record partial payment via allocation & check invoice balance recalculation.
	today := pgtype.Date{Time: time.Now().UTC(), Valid: true}
	p1, err := svc.RecordPaymentWithAllocations(ctx, sqlcdb.CreatePaymentParams{
		PaymentNumber: "PAY-2026-0001",
		InvoiceID:     &inv.ID,
		ContactID:     strPtr("contact-1"),
		Amount:        num("300.000"),
		Currency:      "BHD",
		PaymentMethod: "bank_transfer",
		PaymentDate:   today,
		Status:        "completed",
	}, nil)
	require.NoError(t, err)
	require.Len(t, p1.Allocations, 1)

	gotInv, err := svc.GetInvoice(ctx, inv.ID)
	require.NoError(t, err)
	require.Equal(t, "partially_paid", gotInv.Status)
	paidVal, _ := gotInv.AmountPaid.Float64Value()
	dueVal, _ := gotInv.BalanceDue.Float64Value()
	require.InDelta(t, 300.0, paidVal.Float64, 0.001)
	require.InDelta(t, 360.0, dueVal.Float64, 0.001)

	// 4. Record second payment clearing remaining balance & link settlement to payment.
	p2, err := svc.RecordPaymentWithAllocations(ctx, sqlcdb.CreatePaymentParams{
		PaymentNumber: "PAY-2026-0002",
		InvoiceID:     &inv.ID,
		ContactID:     strPtr("contact-1"),
		Amount:        num("360.000"),
		Currency:      "BHD",
		PaymentMethod: "card",
		PaymentDate:   today,
		Status:        "completed",
	}, nil)
	require.NoError(t, err)

	gotInv, err = svc.GetInvoice(ctx, inv.ID)
	require.NoError(t, err)
	require.Equal(t, "paid", gotInv.Status)
	dueVal, _ = gotInv.BalanceDue.Float64Value()
	require.InDelta(t, 0.0, dueVal.Float64, 0.001)

	settlement, err := svc.CreateBankSettlement(ctx, sqlcdb.CreateBankSettlementParams{
		SettlementNumber: "STL-2026-0001",
		BankAccount:      "NBB-001",
		Amount:           num("300.000"),
		Currency:         "BHD",
		SettledAt:        time.Now().UTC(),
		Status:           "settled",
		PaymentID:        &p1.Payment.ID,
	})
	require.NoError(t, err)
	gotP1, err := svc.GetPayment(ctx, p1.Payment.ID)
	require.NoError(t, err)
	require.NotNil(t, gotP1.BankSettlementID)
	require.Equal(t, settlement.ID, *gotP1.BankSettlementID)

	// 5. Delete second payment and verify balance/status revert cleanly.
	require.NoError(t, svc.DeletePayment(ctx, p2.Payment.ID))
	gotInv, err = svc.GetInvoice(ctx, inv.ID)
	require.NoError(t, err)
	require.Equal(t, "partially_paid", gotInv.Status)
	dueVal, _ = gotInv.BalanceDue.Float64Value()
	require.InDelta(t, 360.0, dueVal.Float64, 0.001)
}

func strPtr(s string) *string { return &s }
