package app

import (
	"context"

	"platform.local/backend/services/inventory/internal/postgres"
)

func (s *Service) ListPurchaseRequisitions(ctx context.Context) ([]postgres.PurchaseRequisitionRow, error) {
	return s.store.ListPurchaseRequisitions(ctx)
}

func (s *Service) GetPurchaseRequisition(ctx context.Context, id string) (postgres.PurchaseRequisitionRow, error) {
	return s.store.GetPurchaseRequisition(ctx, id)
}

func (s *Service) UpsertPurchaseRequisition(ctx context.Context, row postgres.PurchaseRequisitionRow) (postgres.PurchaseRequisitionRow, error) {
	return s.store.UpsertPurchaseRequisition(ctx, row)
}

func (s *Service) DeletePurchaseRequisition(ctx context.Context, id string) error {
	return s.store.DeletePurchaseRequisition(ctx, id)
}
