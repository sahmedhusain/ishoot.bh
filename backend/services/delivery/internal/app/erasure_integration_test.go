package app_test

import (
	"context"
	"io"
	"log/slog"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"

	"platform.local/backend/pkg/migrate"
	"platform.local/backend/pkg/testkit"
	"platform.local/backend/services/delivery/internal/app"
	"platform.local/backend/services/delivery/internal/postgres"
	"platform.local/backend/services/delivery/migrations"
)

func open(t *testing.T) (context.Context, *pgxpool.Pool) {
	t.Helper()
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, testkit.Postgres(t))
	require.NoError(t, err)
	t.Cleanup(pool.Close)
	require.NoError(t, migrate.Run(ctx, pool, migrate.Options{Schema: postgres.Schema, Migrations: migrations.FS, Logger: slog.New(slog.NewTextHandler(io.Discard, nil))}))
	return ctx, pool
}

func TestCustomerErasedScrubsShipments(t *testing.T) {
	ctx, pool := open(t)
	_, err := pool.Exec(ctx, `INSERT INTO delivery.shipment (id, number, order_id, promised_by, recipient_name, recipient_phone, address, tracking_token, proof_signature)
		VALUES ('s1', 'S1', 'o1', now(), 'Ann Lee', '+100', '{"line1":"1 Main St"}', 't1', 'sig'),
		       ('s2', 'S2', 'o2', now(), 'Bob Ray', '+200', '{"line1":"2 Side St"}', 't2', 'sig')`)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO delivery.shipment_event (id, shipment_id, status, note) VALUES ('e1', 's1', 'pending', 'gate code 1234'), ('e2', 's2', 'pending', 'keep')`)
	require.NoError(t, err)

	svc := app.New(postgres.New(pool))
	const id = "6f1c1d0e-0000-4000-8000-000000000011"
	payload := []byte(`{"customerId":"c1","orderIds":["o1"],"contactIds":[]}`)
	require.NoError(t, svc.HandleCustomerErased(ctx, id, payload))
	require.NoError(t, svc.HandleCustomerErased(ctx, id, payload), "redelivery")
	require.NoError(t, svc.HandleCustomerErased(ctx, "6f1c1d0e-0000-4000-8000-000000000012", []byte(`oops`)))
	require.NoError(t, svc.HandleCustomerErased(ctx, "6f1c1d0e-0000-4000-8000-000000000013", []byte(`{"orderIds":[]}`)))

	var name, phone string
	var sig *string
	var addr string
	require.NoError(t, pool.QueryRow(ctx, `SELECT recipient_name, recipient_phone, proof_signature, address::text FROM delivery.shipment WHERE id='s1'`).Scan(&name, &phone, &sig, &addr))
	require.Equal(t, "Erased customer", name)
	require.Empty(t, phone)
	require.Nil(t, sig)
	require.JSONEq(t, `{}`, addr)
	var note *string
	require.NoError(t, pool.QueryRow(ctx, `SELECT note FROM delivery.shipment_event WHERE id='e1'`).Scan(&note))
	require.Nil(t, note)

	require.NoError(t, pool.QueryRow(ctx, `SELECT recipient_name FROM delivery.shipment WHERE id='s2'`).Scan(&name))
	require.Equal(t, "Bob Ray", name, "other customers keep their data")
	require.NoError(t, pool.QueryRow(ctx, `SELECT note FROM delivery.shipment_event WHERE id='e2'`).Scan(&note))
	require.Equal(t, "keep", *note)
}
