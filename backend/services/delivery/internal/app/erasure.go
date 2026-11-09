package app

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5"

	"platform.local/backend/pkg/outbox"
	"platform.local/backend/services/delivery/internal/postgres"
)

// CommerceEventsConsumer names delivery's durable consumer of commerce's events (and its inbox rows).
const CommerceEventsConsumer = "delivery-commerce-events"

// SubjectCustomerErased is the event commerce publishes after it erased a customer's personal data.
const SubjectCustomerErased = "commerce.customer.erased"

const erasedName = "Erased customer"

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
