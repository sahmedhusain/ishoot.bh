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
	"platform.local/backend/services/commerce/internal/app"
	"platform.local/backend/services/commerce/internal/postgres"
	"platform.local/backend/services/commerce/migrations"
)

func TestCommerceMeshSyncAndOrderRelationsIntegration(t *testing.T) {
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, testkit.Postgres(t))
	require.NoError(t, err)
	t.Cleanup(pool.Close)

	require.NoError(t, migrate.Run(ctx, pool, migrate.Options{
		Schema:     postgres.Schema,
		Migrations: migrations.FS,
		Logger:     slog.New(slog.NewTextHandler(io.Discard, nil)),
	}))

	_, err = pool.Exec(ctx, `
		INSERT INTO commerce.customer (id, email, phone, first_name, last_name)
		VALUES ('cust-1', 'acme@example.test', '+97333000001', 'Acme', 'Buyer')
	`)
	require.NoError(t, err)

	_, err = pool.Exec(ctx, `
		INSERT INTO commerce.sales_order (id, number, customer_id, contact_id, name, warehouse_id, status, payment_status)
		VALUES ('ord-rel-1', 'SO-1001', 'cust-1', 'cont-1', 'Acme Buyer', 'wh-1', 'placed', 'unpaid')
	`)
	require.NoError(t, err)

	svc := app.New(postgres.New(pool))

	whEv := []byte(`{"id":"wh-1","code":"MAIN","nameEn":"Main Vault","nameAr":"المخزن الرئيسي","isActive":true,"isDefault":true}`)
	require.NoError(t, svc.HandleMeshEvent(ctx, "33333333-3333-4333-8333-333333333301", "inventory.warehouse.upserted", whEv))
	require.NoError(t, svc.HandleMeshEvent(ctx, "33333333-3333-4333-8333-333333333301", "inventory.warehouse.upserted", whEv), "duplicate must be ignored")

	warehouses, err := svc.ListWarehouseRefs(ctx)
	require.NoError(t, err)
	require.Len(t, warehouses, 1)
	require.Equal(t, "MAIN", warehouses[0].Code)

	require.NoError(t, svc.HandleMeshEvent(ctx, "33333333-3333-4333-8333-333333333302", "finance.invoice.issued", []byte(`{"orderId":"ord-rel-1","invoiceId":"inv-99","status":"issued"}`)))
	require.NoError(t, svc.HandleMeshEvent(ctx, "33333333-3333-4333-8333-333333333303", "delivery.shipment.dispatched", []byte(`{"shipment_id":"shp-99","order_id":"ord-rel-1","status":"dispatched","tracking_token":"trk-99"}`)))

	rel, err := svc.GetOrderRelations(ctx, "ord-rel-1")
	require.NoError(t, err)
	require.Equal(t, "Main Vault", rel.WarehouseName)
	require.NotNil(t, rel.InvoiceID)
	require.Equal(t, "inv-99", *rel.InvoiceID)
	require.NotNil(t, rel.ShipmentID)
	require.Equal(t, "shp-99", *rel.ShipmentID)
	require.NotNil(t, rel.TrackingToken)
	require.Equal(t, "trk-99", *rel.TrackingToken)
}
