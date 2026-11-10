package app_test
import (
	"context"
	"io"
	"log/slog"
	"testing"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
	"platform.local/backend/pkg/migrate"
	"platform.local/backend/pkg/testkit"
	"platform.local/backend/services/inventory/internal/app"
	"platform.local/backend/services/inventory/internal/postgres"
	"platform.local/backend/services/inventory/internal/postgres/sqlcdb"
	"platform.local/backend/services/inventory/migrations"
)
func inventoryNumber(t *testing.T, value string) pgtype.Numeric {
	t.Helper()
	var number pgtype.Numeric
	require.NoError(t, number.Scan(value))
	return number
}
func TestStockAdjustmentCreatesMovementAndUpdatesLevel(t *testing.T) {
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, testkit.Postgres(t))
	require.NoError(t, err)
	t.Cleanup(pool.Close)
	require.NoError(t, migrate.Run(ctx, pool, migrate.Options{
		Schema:	postgres.Schema, Migrations: migrations.FS, Logger: slog.New(slog.NewTextHandler(io.Discard, nil)),
	}))
	_, err = pool.Exec(ctx, `INSERT INTO inventory.warehouse (id, code, name_en, name_ar) VALUES ('w1', 'W1', 'Main', 'Main')`)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO inventory.stock_location (id, warehouse_id, code) VALUES ('l1', 'w1', 'A1')`)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO inventory.product (id, sku, name_en, name_ar) VALUES ('p1', 'SKU-1', 'Product', 'Product')`)
	require.NoError(t, err)
	svc := app.New(postgres.New(pool))
	for _, step := range []struct {
		id		string
		delta		string
		onHand		string
		available	string
	}{
		{id: "m1", delta: "5.5", onHand: "5.5", available: "5.5"},
		{id: "m2", delta: "-2", onHand: "3.5", available: "3.5"},
	} {
		movement, err := svc.AdjustStock(ctx, sqlcdb.CreateStockMovementParams{
			ID:	step.id, MovementType: "adjustment", ProductID: "p1", LocationID: "l1",
			Quantity:	inventoryNumber(t, step.delta), UnitCost: inventoryNumber(t, "0"), SourceType: "manual",
		}, sqlcdb.UpsertStockLevelParams{
			ID:	"level-1", ProductID: "p1", LocationID: "l1", QuantityOnHand: inventoryNumber(t, step.onHand),
			QuantityReserved:	inventoryNumber(t, "0"), QuantityAvailable: inventoryNumber(t, step.available),
			ReorderPoint:	inventoryNumber(t, "0"),
		})
		require.NoError(t, err)
		require.Equal(t, step.id, movement.ID)
	}
	var onHand, available string
	require.NoError(t, pool.QueryRow(ctx, `
SELECT quantity_on_hand::text, quantity_available::text
FROM inventory.stock_level WHERE product_id='p1' AND location_id='l1'`).Scan(&onHand, &available))
	require.Equal(t, "3.5000", onHand)
	require.Equal(t, "3.5000", available)
	var movementCount, eventCount int
	require.NoError(t, pool.QueryRow(ctx, `SELECT count(*) FROM inventory.stock_movement WHERE product_id='p1'`).Scan(&movementCount))
	require.NoError(t, pool.QueryRow(ctx, `SELECT count(*) FROM inventory.outbox WHERE subject=$1`, app.EventStockAdjusted).Scan(&eventCount))
	require.Equal(t, 2, movementCount)
	require.Equal(t, 2, eventCount)
}
