package app

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/jackc/pgx/v5"
	"platform.local/backend/services/commerce/internal/postgres"
)

const CommerceMeshConsumer = "commerce-mesh-events"

func (s *Service) ListOrdersFiltered(ctx context.Context, customerID, contactID, status string) ([]postgres.SalesOrder, error) {
	return s.store.ListOrdersFiltered(ctx, customerID, contactID, status)
}

func (s *Service) GetOrderRelations(ctx context.Context, orderID string) (postgres.OrderRelations, error) {
	rel, err := s.store.GetOrderRelations(ctx, orderID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return postgres.OrderRelations{}, ErrNotFound
		}
		return postgres.OrderRelations{}, err
	}
	return rel, nil
}

func (s *Service) ListWarehouseRefs(ctx context.Context) ([]postgres.WarehouseRef, error) {
	return s.store.ListWarehouseRefs(ctx)
}

func (s *Service) HandleMeshEvent(ctx context.Context, eventID, subject string, payload []byte) error {
	switch {
	case len(subject) >= 18 && subject[:18] == "delivery.shipment.":
		var in struct {
			ShipmentID    string `json:"shipment_id"`
			OrderID       string `json:"order_id"`
			Status        string `json:"status"`
			TrackingToken string `json:"tracking_token"`
		}
		if err := json.Unmarshal(payload, &in); err != nil {
			return nil
		}
		if in.Status == "" && subject == "delivery.shipment.delivered" {
			in.Status = "delivered"
		} else if in.Status == "" && subject == "delivery.shipment.dispatched" {
			in.Status = "dispatched"
		}
		return s.store.ApplyShipmentSync(ctx, CommerceMeshConsumer, eventID, in.OrderID, in.ShipmentID, in.Status, in.TrackingToken)

	case len(subject) >= 16 && subject[:16] == "finance.invoice.":
		var in struct {
			OrderID   string `json:"orderId"`
			InvoiceID string `json:"invoiceId"`
			Status    string `json:"status"`
		}
		if err := json.Unmarshal(payload, &in); err != nil {
			return nil
		}
		return s.store.ApplyInvoiceSync(ctx, CommerceMeshConsumer, eventID, in.OrderID, in.InvoiceID, in.Status)

	case subject == "inventory.warehouse.upserted":
		var in postgres.WarehouseRef
		var id struct {
			ID string `json:"id"`
		}
		if err := json.Unmarshal(payload, &in); err != nil {
			return nil
		}
		_ = json.Unmarshal(payload, &id)
		if in.WarehouseID == "" {
			in.WarehouseID = id.ID
		}
		return s.store.UpsertWarehouseRef(ctx, CommerceMeshConsumer, eventID, in)
	}
	return nil
}
