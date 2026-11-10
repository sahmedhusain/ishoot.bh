package app
import (
	"context"
	"encoding/json"
	"errors"
	"github.com/jackc/pgx/v5"
	"platform.local/backend/pkg/erasure"
	"platform.local/backend/pkg/outbox"
	"platform.local/backend/services/sales/internal/postgres"
)
const CommerceEventsConsumer = "sales-commerce-events"
const SubjectCustomerErased = "commerce.customer.erased"
const erasedName = "Erased customer"
func (s *Service) HandleCustomerErased(ctx context.Context, eventID string, payload []byte) error {
	var in struct {
		OrderIDs	[]string	`json:"orderIds"`
		ContactIDs	[]string	`json:"contactIds"`
		EmailHashes	[]string	`json:"emailHashes"`
	}
	if err := json.Unmarshal(payload, &in); err != nil || len(in.ContactIDs) == 0 && len(in.EmailHashes) == 0 {
		return nil
	}
	return s.store.Tx(ctx, func(_ *postgres.Store, tx pgx.Tx) error {
		first, err := outbox.Handled(ctx, tx, postgres.Schema, CommerceEventsConsumer, eventID)
		if err != nil || !first {
			return err
		}
		contacts, err := matchingEmails(ctx, tx, s.eraseKey, in.EmailHashes, "contact", "email")
		if err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `UPDATE sales.contact SET first_name = $2, last_name = NULL, email = NULL, phone = NULL,
		company = NULL, notes = NULL, updated_at = now() WHERE id = ANY($1)`, append(in.ContactIDs, contacts...), erasedName); err != nil {
			return err
		}
		inquiries, err := matchingEmails(ctx, tx, s.eraseKey, in.EmailHashes, "inquiry", "requester_email")
		if err != nil {
			return err
		}
		_, err = tx.Exec(ctx, `UPDATE sales.inquiry SET requester_name = $2, requester_email = '', requester_phone = NULL,
		message = '[erased]', updated_at = now() WHERE id = ANY($1)`, inquiries, erasedName)
		return err
	})
}
func (s *Service) WithEraseKey(key []byte) *Service {
	c := *s
	c.eraseKey = key
	return &c
}
func matchingEmails(ctx context.Context, tx pgx.Tx, key []byte, hashes []string, table, column string) ([]string, error) {
	var matches []string
	if len(hashes) == 0 {
		return matches, nil
	}
	if len(key) < erasure.MinKeyLength {
		return nil, errors.New("sales: no erase key (ERASURE_HASH_KEY)")
	}
	wanted := make(map[string]bool, len(hashes))
	for _, h := range hashes {
		wanted[h] = true
	}
	last := ""
	for {
		rows, err := tx.Query(ctx, `SELECT id, `+column+` FROM sales.`+table+` WHERE `+column+` IS NOT NULL AND id > $1 ORDER BY id LIMIT 1000`, last)
		if err != nil {
			return nil, err
		}
		n := 0
		for rows.Next() {
			var id, email string
			if err := rows.Scan(&id, &email); err != nil {
				rows.Close()
				return nil, err
			}
			n++
			last = id
			if wanted[erasure.EmailHash(key, email)] {
				matches = append(matches, id)
			}
		}
		rows.Close()
		if err := rows.Err(); err != nil {
			return nil, err
		}
		if n < 1000 {
			return matches, nil
		}
	}
}
