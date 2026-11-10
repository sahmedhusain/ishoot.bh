package postgres
import (
	"context"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"platform.local/backend/pkg/db"
	"platform.local/backend/services/inventory/internal/postgres/sqlcdb"
)
const Schema = "inventory"
type Warehouse = sqlcdb.InventoryWarehouse
type Location = sqlcdb.InventoryStockLocation
type Category = sqlcdb.InventoryProductCategory
type Product = sqlcdb.InventoryProduct
type Variant = sqlcdb.InventoryProductVariant
type StockLevel = sqlcdb.InventoryStockLevel
type StockMovement = sqlcdb.InventoryStockMovement
type StockCount = sqlcdb.InventoryStockCount
type StockCountLine = sqlcdb.InventoryStockCountLine
type Store struct {
	pool	*pgxpool.Pool
	q	*sqlcdb.Queries
}
func New(pool *pgxpool.Pool) *Store	{ return &Store{pool: pool, q: sqlcdb.New(pool)} }
func (s *Store) Tx(ctx context.Context, fn func(*Store, pgx.Tx) error) error {
	return db.WithTx(ctx, s.pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		return fn(&Store{q: s.q.WithTx(tx)}, tx)
	})
}
func (s *Store) ListWarehouses(ctx context.Context) ([]Warehouse, error) {
	return s.q.ListWarehouses(ctx)
}
func (s *Store) GetWarehouseByID(ctx context.Context, id string) (Warehouse, error) {
	return s.q.GetWarehouseByID(ctx, id)
}
func (s *Store) GetDefaultWarehouse(ctx context.Context) (Warehouse, error) {
	return s.q.GetDefaultWarehouse(ctx)
}
func (s *Store) CreateWarehouse(ctx context.Context, p sqlcdb.CreateWarehouseParams) (Warehouse, error) {
	return s.q.CreateWarehouse(ctx, p)
}
func (s *Store) UpdateWarehouse(ctx context.Context, p sqlcdb.UpdateWarehouseParams) (Warehouse, error) {
	return s.q.UpdateWarehouse(ctx, p)
}
func (s *Store) ListLocationsByWarehouse(ctx context.Context, warehouseID string) ([]Location, error) {
	return s.q.ListLocationsByWarehouse(ctx, warehouseID)
}
func (s *Store) GetLocationByID(ctx context.Context, id string) (Location, error) {
	return s.q.GetLocationByID(ctx, id)
}
func (s *Store) CreateLocation(ctx context.Context, p sqlcdb.CreateLocationParams) (Location, error) {
	return s.q.CreateLocation(ctx, p)
}
func (s *Store) ListCategories(ctx context.Context) ([]Category, error) {
	return s.q.ListCategories(ctx)
}
func (s *Store) GetCategoryByID(ctx context.Context, id string) (Category, error) {
	return s.q.GetCategoryByID(ctx, id)
}
func (s *Store) CreateCategory(ctx context.Context, p sqlcdb.CreateCategoryParams) (Category, error) {
	return s.q.CreateCategory(ctx, p)
}
func (s *Store) ListProducts(ctx context.Context) ([]Product, error) {
	return s.q.ListProducts(ctx)
}
func (s *Store) GetProductByID(ctx context.Context, id string) (Product, error) {
	return s.q.GetProductByID(ctx, id)
}
func (s *Store) GetProductBySKU(ctx context.Context, sku string) (Product, error) {
	return s.q.GetProductBySKU(ctx, sku)
}
func (s *Store) CreateProduct(ctx context.Context, p sqlcdb.CreateProductParams) (Product, error) {
	return s.q.CreateProduct(ctx, p)
}
func (s *Store) UpdateProduct(ctx context.Context, p sqlcdb.UpdateProductParams) (Product, error) {
	return s.q.UpdateProduct(ctx, p)
}
func (s *Store) ListVariantsByProduct(ctx context.Context, productID string) ([]Variant, error) {
	return s.q.ListVariantsByProduct(ctx, productID)
}
func (s *Store) CreateProductVariant(ctx context.Context, p sqlcdb.CreateProductVariantParams) (Variant, error) {
	return s.q.CreateProductVariant(ctx, p)
}
func (s *Store) ListStockLevelsByProduct(ctx context.Context, productID string) ([]StockLevel, error) {
	return s.q.ListStockLevelsByProduct(ctx, productID)
}
func (s *Store) GetStockLevel(ctx context.Context, p sqlcdb.GetStockLevelParams) (StockLevel, error) {
	return s.q.GetStockLevel(ctx, p)
}
func (s *Store) UpsertStockLevel(ctx context.Context, p sqlcdb.UpsertStockLevelParams) (StockLevel, error) {
	return s.q.UpsertStockLevel(ctx, p)
}
func (s *Store) CreateStockMovement(ctx context.Context, p sqlcdb.CreateStockMovementParams) (StockMovement, error) {
	return s.q.CreateStockMovement(ctx, p)
}
func (s *Store) ListStockMovementsByProduct(ctx context.Context, p sqlcdb.ListStockMovementsByProductParams) ([]StockMovement, error) {
	return s.q.ListStockMovementsByProduct(ctx, p)
}
func (s *Store) ListStockCounts(ctx context.Context) ([]StockCount, error) {
	return s.q.ListStockCounts(ctx)
}
func (s *Store) GetStockCountByID(ctx context.Context, id string) (StockCount, error) {
	return s.q.GetStockCountByID(ctx, id)
}
func (s *Store) CreateStockCount(ctx context.Context, p sqlcdb.CreateStockCountParams) (StockCount, error) {
	return s.q.CreateStockCount(ctx, p)
}
func (s *Store) UpdateStockCountStatus(ctx context.Context, p sqlcdb.UpdateStockCountStatusParams) (StockCount, error) {
	return s.q.UpdateStockCountStatus(ctx, p)
}
func (s *Store) ListStockCountLines(ctx context.Context, countID string) ([]StockCountLine, error) {
	return s.q.ListStockCountLines(ctx, countID)
}
func (s *Store) CreateStockCountLine(ctx context.Context, p sqlcdb.CreateStockCountLineParams) (StockCountLine, error) {
	return s.q.CreateStockCountLine(ctx, p)
}
