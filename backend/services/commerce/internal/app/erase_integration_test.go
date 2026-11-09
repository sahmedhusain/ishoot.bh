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
	"platform.local/backend/services/commerce/internal/app"
	"platform.local/backend/services/commerce/internal/postgres"
	"platform.local/backend/services/commerce/migrations"
)

const testKey = "0123456789abcdef0123456789abcdef"

func TestEraseCustomerKeepsOrdersButRemovesPersonalData(t *testing.T) {
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, testkit.Postgres(t))
	require.NoError(t, err)
	t.Cleanup(pool.Close)
	require.NoError(t, migrate.Run(ctx, pool, migrate.Options{Schema: postgres.Schema, Migrations: migrations.FS, Logger: slog.New(slog.NewTextHandler(io.Discard, nil))}))

	exec := func(sql string, args ...any) {
		t.Helper()
		_, err := pool.Exec(ctx, sql, args...)
		require.NoError(t, err)
	}
	exec(`INSERT INTO commerce.customer (id, email, phone, first_name, last_name) VALUES ('c1', 'ann@example.test', '+100', 'Ann', 'Lee'), ('c2', 'bob@example.test', '+200', 'Bob', 'Ray')`)
	exec(`INSERT INTO commerce.customer_address (id, customer_id, line1, city) VALUES ('a1', 'c1', '1 Main St', 'X'), ('a2', 'c2', '2 Side St', 'X')`)
	exec(`INSERT INTO commerce.sales_order (id, number, customer_id, email, name, phone, shipping_address) VALUES
		('o1', 'N1', 'c1', 'ann@example.test', 'Ann Lee', '+100', '{"line1":"1 Main St"}'),
		('o2', 'N2', 'c2', 'bob@example.test', 'Bob Ray', '+200', '{"line1":"2 Side St"}')`)
	exec(`INSERT INTO commerce.sales_order_event (id, order_id, kind, note) VALUES ('e1', 'o1', 'note', 'call Ann at home'), ('e2', 'o1', 'status', 'placed'), ('e3', 'o2', 'note', 'keep')`)

	svc := app.New(postgres.New(pool).WithEraseKey([]byte(testKey)))
	require.NoError(t, svc.EraseCustomer(ctx, "c1"))
	require.NoError(t, svc.EraseCustomer(ctx, "c1"), "erasing twice is harmless")
	require.ErrorIs(t, svc.EraseCustomer(ctx, "nobody"), app.ErrNotFound)

	var email, phone *string
	var first, status string
	require.NoError(t, pool.QueryRow(ctx, `SELECT email, phone, first_name, status FROM commerce.customer WHERE id='c1'`).Scan(&email, &phone, &first, &status))
	require.Nil(t, email)
	require.Nil(t, phone)
	require.Equal(t, postgres.ErasedName, first)
	require.Equal(t, "erased", status)

	var n int
	require.NoError(t, pool.QueryRow(ctx, `SELECT count(*) FROM commerce.customer_address WHERE customer_id='c1'`).Scan(&n))
	require.Zero(t, n)

	var name string
	var shipping []byte
	require.NoError(t, pool.QueryRow(ctx, `SELECT name, email, phone, shipping_address FROM commerce.sales_order WHERE id='o1'`).Scan(&name, &email, &phone, &shipping))
	require.Equal(t, postgres.ErasedName, name)
	require.Nil(t, email)
	require.Nil(t, phone)
	require.Nil(t, shipping)

	var note *string
	require.NoError(t, pool.QueryRow(ctx, `SELECT note FROM commerce.sales_order_event WHERE id='e1'`).Scan(&note))
	require.Nil(t, note)
	require.NoError(t, pool.QueryRow(ctx, `SELECT note FROM commerce.sales_order_event WHERE id='e2'`).Scan(&note))
	require.Equal(t, "placed", *note, "non-personal history stays")

	// Another customer is untouched.
	require.NoError(t, pool.QueryRow(ctx, `SELECT name FROM commerce.sales_order WHERE id='o2'`).Scan(&name))
	require.Equal(t, "Bob Ray", name)
	require.NoError(t, pool.QueryRow(ctx, `SELECT note FROM commerce.sales_order_event WHERE id='e3'`).Scan(&note))
	require.Equal(t, "keep", *note)
	require.NoError(t, pool.QueryRow(ctx, `SELECT count(*) FROM commerce.customer_address WHERE customer_id='c2'`).Scan(&n))
	require.Equal(t, 1, n)

	// The erasure was announced for other services.
	require.NoError(t, pool.QueryRow(ctx, `SELECT count(*) FROM commerce.outbox`).Scan(&n))
	require.Positive(t, n)
}

func TestAccountDeletionEventErasesCustomerOnce(t *testing.T) {
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, testkit.Postgres(t))
	require.NoError(t, err)
	t.Cleanup(pool.Close)
	require.NoError(t, migrate.Run(ctx, pool, migrate.Options{Schema: postgres.Schema, Migrations: migrations.FS, Logger: slog.New(slog.NewTextHandler(io.Discard, nil))}))
	_, err = pool.Exec(ctx, `INSERT INTO commerce.customer (id, email, first_name, last_name) VALUES ('c1', 'ann@example.test', 'Ann', 'Lee'), ('s1', 'staff@example.test', 'Sam', 'Roe')`)
	require.NoError(t, err)

	svc := app.New(postgres.New(pool).WithEraseKey([]byte(testKey)))
	const event = "6f1c1d0e-0000-4000-8000-000000000001"
	require.NoError(t, svc.HandleUserDeleted(ctx, event, []byte(`{"subjectId":"c1","realm":"customer"}`)))
	require.NoError(t, svc.HandleUserDeleted(ctx, event, []byte(`{"subjectId":"c1","realm":"customer"}`)), "redelivery")
	require.NoError(t, svc.HandleUserDeleted(ctx, "6f1c1d0e-0000-4000-8000-000000000002", []byte(`{"subjectId":"s1","realm":"staff"}`)))
	require.NoError(t, svc.HandleUserDeleted(ctx, "6f1c1d0e-0000-4000-8000-000000000003", []byte(`not json`)))
	require.NoError(t, svc.HandleUserDeleted(ctx, "6f1c1d0e-0000-4000-8000-000000000004", []byte(`{"subjectId":"nobody","realm":"customer"}`)))

	var email *string
	require.NoError(t, pool.QueryRow(ctx, `SELECT email FROM commerce.customer WHERE id='c1'`).Scan(&email))
	require.Nil(t, email)
	require.NoError(t, pool.QueryRow(ctx, `SELECT email FROM commerce.customer WHERE id='s1'`).Scan(&email))
	require.NotNil(t, email, "a staff deletion does not touch customers")
	var n int
	require.NoError(t, pool.QueryRow(ctx, `SELECT count(*) FROM commerce.outbox WHERE subject='commerce.customer.erased'`).Scan(&n))
	require.Equal(t, 1, n, "announced once, not once per delivery")
}

func TestEraseByEmailCoversGuestOrdersAndIsQuietAboutUnknownAddresses(t *testing.T) {
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, testkit.Postgres(t))
	require.NoError(t, err)
	t.Cleanup(pool.Close)
	require.NoError(t, migrate.Run(ctx, pool, migrate.Options{Schema: postgres.Schema, Migrations: migrations.FS, Logger: slog.New(slog.NewTextHandler(io.Discard, nil))}))
	for _, q := range []string{
		`INSERT INTO commerce.customer (id, email, first_name, last_name) VALUES ('c1', 'Ann@Example.test', 'Ann', 'Lee'), ('c2', 'bob@example.test', 'Bob', 'Ray')`,
		`INSERT INTO commerce.sales_order (id, number, customer_id, contact_id, email, name) VALUES
			('o1', 'N1', 'c1', 'k1', 'ann@example.test', 'Ann Lee'),
			('g1', 'N2', NULL, 'k9', 'ANN@example.test', 'Ann Guest'),
			('o2', 'N3', 'c2', NULL, 'bob@example.test', 'Bob Ray'),
			('g2', 'N4', NULL, NULL, 'carol@example.test', 'Carol')`,
		`INSERT INTO commerce.sales_order_event (id, order_id, kind, note) VALUES ('e1', 'g1', 'note', 'ring twice'), ('e2', 'g2', 'note', 'keep')`,
	} {
		_, err := pool.Exec(ctx, q)
		require.NoError(t, err)
	}

	svc := app.New(postgres.New(pool).WithEraseKey([]byte(testKey)))
	require.NoError(t, svc.EraseByEmail(ctx, " ann@example.TEST "))
	require.NoError(t, svc.EraseByEmail(ctx, "nobody@example.test"), "unknown addresses are not an error")

	var name string
	var email *string
	require.NoError(t, pool.QueryRow(ctx, `SELECT first_name, email FROM commerce.customer WHERE id='c1'`).Scan(&name, &email))
	require.Equal(t, postgres.ErasedName, name)
	require.Nil(t, email)
	for _, id := range []string{"o1", "g1"} {
		require.NoError(t, pool.QueryRow(ctx, `SELECT name, email FROM commerce.sales_order WHERE id=$1`, id).Scan(&name, &email))
		require.Equal(t, postgres.ErasedName, name, id)
		require.Nil(t, email, id)
	}
	var note *string
	require.NoError(t, pool.QueryRow(ctx, `SELECT note FROM commerce.sales_order_event WHERE id='e1'`).Scan(&note))
	require.Nil(t, note)
	for id, want := range map[string]string{"o2": "Bob Ray", "g2": "Carol"} {
		require.NoError(t, pool.QueryRow(ctx, `SELECT name FROM commerce.sales_order WHERE id=$1`, id).Scan(&name))
		require.Equal(t, want, name, "other people's orders are untouched")
	}
	require.NoError(t, pool.QueryRow(ctx, `SELECT note FROM commerce.sales_order_event WHERE id='e2'`).Scan(&note))
	require.Equal(t, "keep", *note)

	// The event names orders, contacts and a hash of the address, never the address.
	var payload string
	require.NoError(t, pool.QueryRow(ctx, `SELECT payload::text FROM commerce.outbox WHERE payload->>'customerId' = '' ORDER BY created_at LIMIT 1`).Scan(&payload))
	require.Contains(t, payload, erasure.EmailHash([]byte(testKey), "ann@example.test"))
	require.Contains(t, payload, `"g1"`)
	require.Contains(t, payload, `"k9"`)
	require.NotContains(t, payload, "example.test")
}
