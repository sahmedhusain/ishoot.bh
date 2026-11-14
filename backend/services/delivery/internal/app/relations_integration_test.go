package app_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"

	"platform.local/backend/services/delivery/internal/app"
	"platform.local/backend/services/delivery/internal/postgres"
)

func TestDeliveryMeshSyncAndEnrichedShipmentsIntegration(t *testing.T) {
	ctx := context.Background()
	ctx, pool := open(t)
	svc := app.New(postgres.New(pool))

	_, err := pool.Exec(ctx, `
		INSERT INTO delivery.delivery_zone (id, name_en, name_ar, fee)
		VALUES ('zone-1', 'Manama Central', 'وسط المنامة', 2.000)
	`)
	require.NoError(t, err)

	_, err = pool.Exec(ctx, `
		INSERT INTO delivery.shipment (id, number, order_id, zone_id, promised_by, recipient_name, recipient_phone, address, tracking_token, driver_id, status)
		VALUES ('shp-1', 'SHP-1001', 'ord-1', 'zone-1', now(), 'Zainab Ali', '+97333001122', '{"area":"Seef","city":"Manama"}', 'tok-123', 'emp-drv-1', 'assigned')
	`)
	require.NoError(t, err)

	orderEv := []byte(`{"order_id":"ord-1","order_number":"SO-2026-001","customer_id":"cust-1","recipient_name":"Zainab Ali","recipient_phone":"+97333001122","status":"placed","currency":"BHD","total":"45.500"}`)
	require.NoError(t, svc.HandleMeshEvent(ctx, "44444444-4444-4444-8444-444444444401", "commerce.order.placed", orderEv))
	require.NoError(t, svc.HandleMeshEvent(ctx, "44444444-4444-4444-8444-444444444401", "commerce.order.placed", orderEv), "duplicate must be ignored")

	driverEv := []byte(`{"id":"emp-drv-1","userId":"usr-drv-1","nameEn":"Rashid Driver","nameAr":"راشد السائق","phone":"+97339990000","status":"active"}`)
	require.NoError(t, svc.HandleMeshEvent(ctx, "44444444-4444-4444-8444-444444444402", "hr.employee.upserted", driverEv))

	orders, err := svc.ListOrderRefs(ctx)
	require.NoError(t, err)
	require.Len(t, orders, 1)
	require.Equal(t, "SO-2026-001", orders[0].OrderNumber)

	drivers, err := svc.ListDriverRefs(ctx)
	require.NoError(t, err)
	require.Len(t, drivers, 1)
	require.Equal(t, "Rashid Driver", drivers[0].NameEn)

	enriched, err := svc.ListShipmentsEnriched(ctx, "ord-1", "", "")
	require.NoError(t, err)
	require.Len(t, enriched, 1)
	require.Equal(t, "SO-2026-001", enriched[0].OrderNumber)
	require.Equal(t, "Manama Central", enriched[0].ZoneNameEn)
	require.Equal(t, "Rashid Driver", enriched[0].DriverNameEn)
	require.NotNil(t, enriched[0].CustomerID)
	require.Equal(t, "cust-1", *enriched[0].CustomerID)
}
