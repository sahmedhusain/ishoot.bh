package app_test

import (
	"encoding/json"
	"math/big"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/stretchr/testify/require"

	"platform.local/backend/services/delivery/internal/app"
	"platform.local/backend/services/delivery/internal/postgres"
	"platform.local/backend/services/delivery/internal/postgres/sqlcdb"
)

func TestShipmentDispatchToDelivered(t *testing.T) {
	ctx, pool := open(t)
	svc := app.New(postgres.New(pool))
	shipment, err := svc.CreateShipment(ctx, sqlcdb.CreateShipmentParams{
		ID: "shipment-1", Number: "S-1", OrderID: "order-1", Status: "pending", Method: "courier",
		PromisedBy: time.Now().UTC().Add(24 * time.Hour), RecipientName: "Customer", RecipientPhone: "+97300000000",
		Address: json.RawMessage(`{"line1":"1 Main St"}`), CodAmount: deliveryNumber(0), CodCollected: deliveryNumber(0),
	})
	require.NoError(t, err)
	require.Equal(t, "pending", shipment.Status)

	driverID := "driver-1"
	assigned, err := svc.AssignShipmentDriver(ctx, sqlcdb.AssignShipmentDriverParams{ID: shipment.ID, DriverID: &driverID})
	require.NoError(t, err)
	require.Equal(t, "assigned", assigned.Status)

	delivered, err := svc.RecordProofOfDelivery(ctx, sqlcdb.RecordProofOfDeliveryParams{
		ID: shipment.ID, ProofSignature: stringPointer("signed"), CodCollected: deliveryNumber(0),
	})
	require.NoError(t, err)
	require.Equal(t, "delivered", delivered.Status)
	require.NotNil(t, delivered.DeliveredAt)

	events, err := svc.ListShipmentEvents(ctx, shipment.ID)
	require.NoError(t, err)
	require.Len(t, events, 3)
	require.Equal(t, []string{"pending", "assigned", "delivered"}, []string{events[0].Status, events[1].Status, events[2].Status})
	var dispatched, deliveredEvents int
	require.NoError(t, pool.QueryRow(ctx, `SELECT count(*) FROM delivery.outbox WHERE subject=$1`, app.EventShipmentDispatched).Scan(&dispatched))
	require.NoError(t, pool.QueryRow(ctx, `SELECT count(*) FROM delivery.outbox WHERE subject=$1`, app.EventShipmentDelivered).Scan(&deliveredEvents))
	require.Equal(t, 2, dispatched)
	require.Equal(t, 1, deliveredEvents)
}

func stringPointer(value string) *string { return &value }

func deliveryNumber(value int64) pgtype.Numeric {
	return pgtype.Numeric{Int: big.NewInt(value), Exp: 0, Valid: true}
}
