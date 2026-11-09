package app_test

import (
	"context"
	"fmt"
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

func financeNumber(t *testing.T, value string) pgtype.Numeric {
	t.Helper()
	var number pgtype.Numeric
	require.NoError(t, number.Scan(value))
	return number
}

func TestInvoiceIssueAndPaymentAllocationTransitions(t *testing.T) {
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, testkit.Postgres(t))
	require.NoError(t, err)
	t.Cleanup(pool.Close)
	require.NoError(t, migrate.Run(ctx, pool, migrate.Options{
		Schema: postgres.Schema, Migrations: migrations.FS, Logger: slog.New(slog.NewTextHandler(io.Discard, nil)),
	}))
	svc := app.New(postgres.New(pool))
	now := time.Now().UTC()
	invoice, err := svc.CreateInvoice(ctx, sqlcdb.CreateInvoiceParams{
		ID: "invoice-1", InvoiceNumber: "INV-1", Status: "draft", IssueDate: pgtype.Date{Time: now, Valid: true},
		DueDate:  pgtype.Date{Time: now.AddDate(0, 0, 30), Valid: true},
		Subtotal: financeNumber(t, "100"), Discount: financeNumber(t, "0"), VatRate: financeNumber(t, "0"),
		VatAmount: financeNumber(t, "0"), Total: financeNumber(t, "100"), AmountPaid: financeNumber(t, "0"),
		BalanceDue: financeNumber(t, "100"), Currency: "BHD",
	}, nil)
	require.NoError(t, err)
	require.Equal(t, "draft", invoice.Status)

	issued, err := svc.UpdateInvoiceStatus(ctx, invoice.ID, "issued")
	require.NoError(t, err)
	require.Equal(t, "issued", issued.Status)
	invoiceID := invoice.ID
	for i, amount := range []string{"40", "60"} {
		payment, err := svc.RecordPayment(ctx, sqlcdb.CreatePaymentParams{
			ID: fmt.Sprintf("payment-%d", i+1), PaymentNumber: fmt.Sprintf("PAY-%d", i+1), InvoiceID: &invoiceID,
			Amount: financeNumber(t, amount), Currency: "BHD", PaymentMethod: "bank_transfer",
			PaymentDate: pgtype.Date{Time: now, Valid: true}, Status: "completed",
		})
		require.NoError(t, err)
		require.Equal(t, invoiceID, *payment.InvoiceID)
		var status, paid, due string
		require.NoError(t, pool.QueryRow(ctx, `SELECT status, amount_paid::text, balance_due::text FROM finance.invoice WHERE id=$1`, invoiceID).Scan(&status, &paid, &due))
		if i == 0 {
			require.Equal(t, "partially_paid", status)
			require.Equal(t, "40.000", paid)
			require.Equal(t, "60.000", due)
		} else {
			require.Equal(t, "paid", status)
			require.Equal(t, "100.000", paid)
			require.Equal(t, "0.000", due)
		}
	}
	var issuedEvents, paymentEvents int
	require.NoError(t, pool.QueryRow(ctx, `SELECT count(*) FROM finance.outbox WHERE subject=$1`, app.EventInvoiceIssued).Scan(&issuedEvents))
	require.NoError(t, pool.QueryRow(ctx, `SELECT count(*) FROM finance.outbox WHERE subject=$1`, app.EventPaymentRecorded).Scan(&paymentEvents))
	require.Equal(t, 1, issuedEvents)
	require.Equal(t, 2, paymentEvents)
}
