package app

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"platform.local/backend/services/delivery/internal/postgres"
)

func (s *Service) Pool() *pgxpool.Pool {
	if s == nil || s.store == nil {
		return nil
	}
	return s.store.Pool()
}

func (s *Service) ListCourierAgencies(ctx context.Context) ([]postgres.CourierAgencyRow, error) {
	return s.store.ListCourierAgencies(ctx)
}

func (s *Service) UpsertCourierAgency(ctx context.Context, row postgres.CourierAgencyRow) (postgres.CourierAgencyRow, error) {
	return s.store.UpsertCourierAgency(ctx, row)
}

func (s *Service) DeleteCourierAgency(ctx context.Context, id string) error {
	return s.store.DeleteCourierAgency(ctx, id)
}

func (s *Service) UpdateDeliverySlot(ctx context.Context, id string, weekday int32, slotStart, slotEnd string, capacity int32, isActive bool) error {
	return s.store.UpdateDeliverySlot(ctx, id, weekday, slotStart, slotEnd, capacity, isActive)
}

func (s *Service) DeleteDeliverySlot(ctx context.Context, id string) error {
	return s.store.DeleteDeliverySlot(ctx, id)
}

func (s *Service) UpdateShipmentStatus(ctx context.Context, id, toStatus, note, actorID string, codCollected *float64, trackingNumber *string) error {
	return s.store.UpdateShipmentStatusAndEvent(ctx, id, toStatus, note, actorID, codCollected, trackingNumber)
}

func (s *Service) ListCODSettlements(ctx context.Context) ([]postgres.CODSettlementRow, error) {
	return s.store.ListCODSettlements(ctx)
}

func (s *Service) UpsertCODSettlement(ctx context.Context, row postgres.CODSettlementRow) (postgres.CODSettlementRow, error) {
	return s.store.UpsertCODSettlement(ctx, row)
}
