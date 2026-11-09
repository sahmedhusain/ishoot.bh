package app

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/jackc/pgx/v5"

	"platform.local/backend/pkg/outbox"
	"platform.local/backend/services/delivery/internal/postgres"
)

// CommerceEventsConsumer names delivery's durable consumer of commerce's events (and its inbox rows).
const CommerceEventsConsumer = "delivery-commerce-events"

// SubjectCustomerErased is the event commerce publishes after it erased a customer's personal data.
const SubjectCustomerErased = "commerce.customer.erased"

const erasedName = "Erased customer"

// PrivateFileDeleter deletes a private proof photo that is no longer referenced by a shipment.
type PrivateFileDeleter interface {
	DeletePrivate(context.Context, string) error
}

// HandleCustomerErased removes the personal data of the shipments of the erased customer's orders. The event carries IDs only. A redelivered
// event, a malformed one, or one naming nothing changes nothing.
func (s *Service) HandleCustomerErased(ctx context.Context, eventID string, payload []byte) error {
	var in struct {
		OrderIDs   []string `json:"orderIds"`
		ContactIDs []string `json:"contactIds"`
	}
	if err := json.Unmarshal(payload, &in); err != nil || len(in.OrderIDs) == 0 {
		return nil
	}
	proofPhotos, err := s.store.UnreferencedProofPhotos(ctx, in.OrderIDs)
	if err != nil {
		return err
	}
	if len(proofPhotos) > 0 && s.fileDeleter == nil {
		return errors.New("delivery: private proof photo deleter is not configured")
	}
	for _, fileURL := range proofPhotos {
		if err := s.fileDeleter.DeletePrivate(ctx, fileURL); err != nil {
			return err
		}
	}
	return s.store.Tx(ctx, func(_ *postgres.Store, tx pgx.Tx) error {
		first, err := outbox.Handled(ctx, tx, postgres.Schema, CommerceEventsConsumer, eventID)
		if err != nil || !first {
			return err
		}
		if _, err := tx.Exec(ctx, `UPDATE delivery.shipment SET recipient_name = $2, recipient_phone = '', address = '{}'::jsonb,
		proof_signature = NULL, proof_photo_url = NULL, updated_at = now() WHERE order_id = ANY($1)`, in.OrderIDs, erasedName); err != nil {
			return err
		}
		_, err = tx.Exec(ctx, `UPDATE delivery.shipment_event SET note = NULL
		WHERE shipment_id IN (SELECT id FROM delivery.shipment WHERE order_id = ANY($1))`, in.OrderIDs)
		return err
	})
}
