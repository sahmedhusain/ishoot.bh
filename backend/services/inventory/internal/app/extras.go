package app

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5/pgxpool"
	"platform.local/backend/services/inventory/internal/postgres"
)

func (s *Service) Pool() *pgxpool.Pool {
	if s == nil || s.store == nil {
		return nil
	}
	return s.store.Pool()
}

func (s *Service) UpdateWarehouseFields(ctx context.Context, id string, code, nameEn, nameAr, address *string, isDefault, isActive *bool) error {
	return s.store.UpdateWarehouseFields(ctx, id, code, nameEn, nameAr, address, isDefault, isActive)
}

func (s *Service) UpdateLocationFields(ctx context.Context, id string, code, nameEn, nameAr, kind *string, isActive *bool) error {
	return s.store.UpdateLocationFields(ctx, id, code, nameEn, nameAr, kind, isActive)
}

func (s *Service) DeleteCategoryByID(ctx context.Context, id string) error {
	return s.store.DeleteCategoryByID(ctx, id)
}

func (s *Service) SetReorderPoint(ctx context.Context, productID string, variantID, locationID *string, reorderPoint, reorderQty *float64) error {
	return s.store.SetReorderPoint(ctx, productID, variantID, locationID, reorderPoint, reorderQty)
}

func (s *Service) SetStockCountStatus(ctx context.Context, countID, status string) error {
	return s.store.SetStockCountStatus(ctx, countID, status)
}

func (s *Service) RecordCountedQuantities(ctx context.Context, entries []postgres.CountQuantityEntry) error {
	return s.store.RecordCountedQuantities(ctx, entries)
}

func (s *Service) ApproveStockCount(ctx context.Context, countID, approvedByID string) (int, error) {
	return s.store.ApproveStockCount(ctx, countID, approvedByID)
}

func (s *Service) ListExpiringBatches(ctx context.Context, days int) (json.RawMessage, error) {
	return s.store.ListExpiringBatches(ctx, days)
}

func (s *Service) ListAllInventoryJSON(ctx context.Context, table, orderBy string) (json.RawMessage, error) {
	return s.store.ListAllInventoryJSON(ctx, table, orderBy)
}
