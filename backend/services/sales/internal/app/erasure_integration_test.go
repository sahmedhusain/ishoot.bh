package app_test

import (
	"context"
	"io"
	"log/slog"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"

	"platform.local/backend/pkg/erasure"
	"platform.local/backend/pkg/migrate"
	"platform.local/backend/pkg/testkit"
	"platform.local/backend/services/sales/internal/app"
	"platform.local/backend/services/sales/internal/postgres"
	"platform.local/backend/services/sales/migrations"
)

const testKey = "0123456789abcdef0123456789abcdef"

func open(t *testing.T) (context.Context, *pgxpool.Pool) {
	t.Helper()
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, testkit.Postgres(t))
	require.NoError(t, err)
	t.Cleanup(pool.Close)
	require.NoError(t, migrate.Run(ctx, pool, migrate.Options{Schema: postgres.Schema, Migrations: migrations.FS, Logger: slog.New(slog.NewTextHandler(io.Discard, nil))}))
	return ctx, pool
}

func TestCustomerErasedScrubsContacts(t *testing.T) {
	ctx, pool := open(t)
	_, err := pool.Exec(ctx, `INSERT INTO sales.contact (id, first_name, last_name, email, phone, company, notes)
		VALUES ('k1', 'Ann', 'Lee', 'ann@example.test', '+100', 'Acme', 'likes tea'), ('k2', 'Bob', 'Ray', 'bob@example.test', '+200', 'Beta', 'n')`)
	require.NoError(t, err)

	svc := app.New(postgres.New(pool)).WithEraseKey([]byte(testKey))
	const id = "6f1c1d0e-0000-4000-8000-000000000021"
	payload := []byte(`{"customerId":"c1","orderIds":["o1"],"contactIds":["k1"]}`)
	require.NoError(t, svc.HandleCustomerErased(ctx, id, payload))
	require.NoError(t, svc.HandleCustomerErased(ctx, id, payload), "redelivery")

	var first string
	var last, email, phone, company, notes *string
	require.NoError(t, pool.QueryRow(ctx, `SELECT first_name, last_name, email, phone, company, notes FROM sales.contact WHERE id='k1'`).Scan(&first, &last, &email, &phone, &company, &notes))
	require.Equal(t, "Erased customer", first)
	for _, v := range []*string{last, email, phone, company, notes} {
		require.Nil(t, v)
	}
	require.NoError(t, pool.QueryRow(ctx, `SELECT first_name, email FROM sales.contact WHERE id='k2'`).Scan(&first, &email))
	require.Equal(t, "Bob", first)
	require.NotNil(t, email)
}

func TestCustomerErasedByEmailHashScrubsInquiriesAndContacts(t *testing.T) {
	ctx, pool := open(t)
	_, err := pool.Exec(ctx, `INSERT INTO sales.contact (id, first_name, email, phone) VALUES ('k1', 'Ann', 'Ann@Example.test', '+1'), ('k2', 'Bob', 'bob@example.test', '+2')`)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO sales.inquiry (id, subject, message, requester_name, requester_email, requester_phone) VALUES
		('i1', 'Hello', 'my number is 555', 'Ann Lee', ' ann@example.test', '+1'),
		('i2', 'Hi', 'keep me', 'Bob Ray', 'bob@example.test', '+2')`)
	require.NoError(t, err)

	payload := []byte(`{"customerId":"","orderIds":[],"contactIds":[],"emailHashes":["` + erasure.EmailHash([]byte(testKey), "ann@example.test") + `"]}`)
	svc := app.New(postgres.New(pool)).WithEraseKey([]byte(testKey))
	require.NoError(t, svc.HandleCustomerErased(ctx, "6f1c1d0e-0000-4000-8000-000000000031", payload))

	var name, message string
	var email, phone *string
	require.NoError(t, pool.QueryRow(ctx, `SELECT requester_name, message FROM sales.inquiry WHERE id='i1'`).Scan(&name, &message))
	require.Equal(t, "Erased customer", name)
	require.Equal(t, "[erased]", message)
	require.NoError(t, pool.QueryRow(ctx, `SELECT first_name, email, phone FROM sales.contact WHERE id='k1'`).Scan(&name, &email, &phone))
	require.Equal(t, "Erased customer", name)
	require.Nil(t, email)
	require.Nil(t, phone)

	require.NoError(t, pool.QueryRow(ctx, `SELECT requester_name, message FROM sales.inquiry WHERE id='i2'`).Scan(&name, &message))
	require.Equal(t, "Bob Ray", name)
	require.Equal(t, "keep me", message)
	require.NoError(t, pool.QueryRow(ctx, `SELECT first_name FROM sales.contact WHERE id='k2'`).Scan(&name))
	require.Equal(t, "Bob", name)
}

func TestCustomerErasedWithoutKeyFailsInsteadOfSkipping(t *testing.T) {
	ctx, pool := open(t)
	svc := app.New(postgres.New(pool)) // no erase key
	err := svc.HandleCustomerErased(ctx, "6f1c1d0e-0000-4000-8000-000000000041", []byte(`{"emailHashes":["abc"]}`))
	require.Error(t, err, "an unkeyed service must not silently leave inquiries behind")
}
