// Package app holds the inventory service's use cases.
package app

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"platform.local/backend/pkg/outbox"
	"platform.local/backend/services/inventory/internal/postgres"
	"platform.local/backend/services/inventory/internal/postgres/sqlcdb"
)

var (
	ErrNotFound = errors.New("inventory resource not found")
	ErrConflict = errors.New("inventory resource conflict")
)

const (
	EventStockAdjusted    = "inventory.stock.adjusted"
	EventTransferComplete = "inventory.transfer.completed"
)

type Service struct {
	store *postgres.Store
	now   func() time.Time
}

func New(store *postgres.Store) *Service {
	return &Service{
		store: store,
		now:   time.Now,
	}
}

func (s *Service) change(ctx context.Context, subject string, payload any, write func(*postgres.Store) error) error {
	return s.store.Tx(ctx, func(st *postgres.Store, tx pgx.Tx) error {
		if err := write(st); err != nil {
			return err
		}
		return outbox.Enqueue(ctx, tx, postgres.Schema, outbox.Event{Subject: subject, Payload: payload})
	})
}

// Warehouses & Locations
func (s *Service) ListWarehouses(ctx context.Context) ([]postgres.Warehouse, error) {
	return s.store.ListWarehouses(ctx)
}

func (s *Service) GetWarehouse(ctx context.Context, id string) (postgres.Warehouse, error) {
	w, err := s.store.GetWarehouseByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return postgres.Warehouse{}, ErrNotFound
		}
		return postgres.Warehouse{}, err
	}
	return w, nil
}

func (s *Service) CreateWarehouse(ctx context.Context, in sqlcdb.CreateWarehouseParams) (postgres.Warehouse, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	return s.store.CreateWarehouse(ctx, in)
}

func (s *Service) UpdateWarehouse(ctx context.Context, in sqlcdb.UpdateWarehouseParams) (postgres.Warehouse, error) {
	return s.store.UpdateWarehouse(ctx, in)
}

func (s *Service) ListLocations(ctx context.Context, warehouseID string) ([]postgres.Location, error) {
	return s.store.ListLocationsByWarehouse(ctx, warehouseID)
}

func (s *Service) CreateLocation(ctx context.Context, in sqlcdb.CreateLocationParams) (postgres.Location, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	return s.store.CreateLocation(ctx, in)
}

// Categories
func (s *Service) ListCategories(ctx context.Context) ([]postgres.Category, error) {
	return s.store.ListCategories(ctx)
}

func (s *Service) CreateCategory(ctx context.Context, in sqlcdb.CreateCategoryParams) (postgres.Category, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	return s.store.CreateCategory(ctx, in)
}

// Products & Variants
func (s *Service) ListProducts(ctx context.Context) ([]postgres.Product, error) {
	return s.store.ListProducts(ctx)
}

func (s *Service) GetProduct(ctx context.Context, id string) (postgres.Product, error) {
	p, err := s.store.GetProductByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return postgres.Product{}, ErrNotFound
		}
		return postgres.Product{}, err
	}
	return p, nil
}

func (s *Service) CreateProduct(ctx context.Context, in sqlcdb.CreateProductParams) (postgres.Product, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	return s.store.CreateProduct(ctx, in)
}

func (s *Service) UpdateProduct(ctx context.Context, in sqlcdb.UpdateProductParams) (postgres.Product, error) {
	return s.store.UpdateProduct(ctx, in)
}

func (s *Service) ListVariants(ctx context.Context, productID string) ([]postgres.Variant, error) {
	return s.store.ListVariantsByProduct(ctx, productID)
}

func (s *Service) CreateVariant(ctx context.Context, in sqlcdb.CreateProductVariantParams) (postgres.Variant, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	return s.store.CreateProductVariant(ctx, in)
}

// Stock Levels & Movements
func (s *Service) ListStockLevels(ctx context.Context, productID string) ([]postgres.StockLevel, error) {
	return s.store.ListStockLevelsByProduct(ctx, productID)
}

func (s *Service) AdjustStock(ctx context.Context, move sqlcdb.CreateStockMovementParams, level sqlcdb.UpsertStockLevelParams) (postgres.StockMovement, error) {
	if move.ID == "" {
		move.ID = uuid.NewString()
	}
	if level.ID == "" {
		level.ID = uuid.NewString()
	}
	var res postgres.StockMovement
	err := s.change(ctx, EventStockAdjusted, map[string]any{
		"movement_id":   move.ID,
		"product_id":    move.ProductID,
		"location_id":   move.LocationID,
		"quantity":      move.Quantity,
		"movement_type": move.MovementType,
		"adjusted_at":   s.now().Format(time.RFC3339),
	}, func(st *postgres.Store) error {
		var mErr error
		res, mErr = st.CreateStockMovement(ctx, move)
		if mErr != nil {
			return mErr
		}
		_, uErr := st.UpsertStockLevel(ctx, level)
		return uErr
	})
	return res, err
}

func (s *Service) ListStockMovements(ctx context.Context, productID string, limit int32) ([]postgres.StockMovement, error) {
	return s.store.ListStockMovementsByProduct(ctx, sqlcdb.ListStockMovementsByProductParams{
		ProductID: productID,
		Limit:     limit,
	})
}

// Stock Counts
func (s *Service) ListStockCounts(ctx context.Context) ([]postgres.StockCount, error) {
	return s.store.ListStockCounts(ctx)
}

func (s *Service) GetStockCount(ctx context.Context, id string) (postgres.StockCount, error) {
	c, err := s.store.GetStockCountByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return postgres.StockCount{}, ErrNotFound
		}
		return postgres.StockCount{}, err
	}
	return c, nil
}

func (s *Service) CreateStockCount(ctx context.Context, in sqlcdb.CreateStockCountParams) (postgres.StockCount, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	return s.store.CreateStockCount(ctx, in)
}

func (s *Service) UpdateStockCountStatus(ctx context.Context, in sqlcdb.UpdateStockCountStatusParams) (postgres.StockCount, error) {
	return s.store.UpdateStockCountStatus(ctx, in)
}

func (s *Service) ListStockCountLines(ctx context.Context, countID string) ([]postgres.StockCountLine, error) {
	return s.store.ListStockCountLines(ctx, countID)
}

func (s *Service) CreateStockCountLine(ctx context.Context, in sqlcdb.CreateStockCountLineParams) (postgres.StockCountLine, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	return s.store.CreateStockCountLine(ctx, in)
}