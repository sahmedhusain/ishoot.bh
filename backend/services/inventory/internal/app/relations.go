package app

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"platform.local/backend/services/inventory/internal/postgres"
)

const (
	EventWarehouseUpserted = "inventory.warehouse.upserted"
	EventPOReceived        = "inventory.purchase_order.received"
)

func (s *Service) ListPurchaseOrders(ctx context.Context, status, supplierID, warehouseID string) ([]postgres.PurchaseOrder, error) {
	return s.store.ListPurchaseOrders(ctx, status, supplierID, warehouseID)
}

func (s *Service) GetPurchaseOrder(ctx context.Context, id string) (postgres.PurchaseOrder, error) {
	po, err := s.store.GetPurchaseOrderByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return postgres.PurchaseOrder{}, ErrNotFound
		}
		return postgres.PurchaseOrder{}, err
	}
	return po, nil
}

func (s *Service) CreatePurchaseOrder(ctx context.Context, in postgres.PurchaseOrder) (postgres.PurchaseOrder, error) {
	return s.store.CreatePurchaseOrder(ctx, in)
}

func (s *Service) ReceivePurchaseOrder(ctx context.Context, poID string, in postgres.ReceivePOInput) (postgres.GoodsReceipt, error) {
	gr, err := s.store.ReceivePurchaseOrder(ctx, poID, in, EventPOReceived)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return postgres.GoodsReceipt{}, ErrNotFound
		}
		return postgres.GoodsReceipt{}, err
	}
	return gr, nil
}
