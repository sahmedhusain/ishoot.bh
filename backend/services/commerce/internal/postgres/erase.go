package postgres
import (
	"context"
	"errors"
	"slices"
	"strings"
	"platform.local/backend/pkg/erasure"
)
const ErasedName = "Erased customer"
type Erased struct {
	Found			bool
	OrderIDs, ContactIDs	[]string
	EmailHashes	[]string
}
func (e *Erased) merge(o Erased) {
	e.Found = e.Found || o.Found
	for _, id := range o.OrderIDs {
		if !slices.Contains(e.OrderIDs, id) {
			e.OrderIDs = append(e.OrderIDs, id)
		}
	}
	for _, id := range o.ContactIDs {
		if !slices.Contains(e.ContactIDs, id) {
			e.ContactIDs = append(e.ContactIDs, id)
		}
	}
	for _, h := range o.EmailHashes {
		if !slices.Contains(e.EmailHashes, h) {
			e.EmailHashes = append(e.EmailHashes, h)
		}
	}
}
func (s *Store) EraseByEmail(ctx context.Context, email string) (Erased, error) {
	if s.tx == nil {
		return Erased{}, errors.New("commerce: EraseByEmail must run inside Tx")
	}
	if len(s.eraseKey) < erasure.MinKeyLength {
		return Erased{}, errors.New("commerce: no erase key (ERASURE_HASH_KEY)")
	}
	email = strings.ToLower(strings.TrimSpace(email))
	total := Erased{OrderIDs: []string{}, ContactIDs: []string{}, EmailHashes: []string{erasure.EmailHash(s.eraseKey, email)}}
	rows, err := s.tx.Query(ctx, `SELECT id FROM commerce.customer WHERE lower(email) = $1`, email)
	if err != nil {
		return Erased{}, err
	}
	var customers []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			rows.Close()
			return Erased{}, err
		}
		customers = append(customers, id)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return Erased{}, err
	}
	for _, id := range customers {
		one, err := s.EraseCustomer(ctx, id)
		if err != nil {
			return Erased{}, err
		}
		total.merge(one)
	}
	guest, err := s.tx.Query(ctx, `UPDATE commerce.sales_order SET name = $2, email = NULL, phone = NULL, shipping_address = NULL
		WHERE customer_id IS NULL AND lower(email) = $1 RETURNING id, contact_id`, email, ErasedName)
	if err != nil {
		return Erased{}, err
	}
	var orders []string
	for guest.Next() {
		var order string
		var contact *string
		if err := guest.Scan(&order, &contact); err != nil {
			guest.Close()
			return Erased{}, err
		}
		orders = append(orders, order)
		total.merge(Erased{Found: true, OrderIDs: []string{order}, ContactIDs: derefs(contact)})
	}
	guest.Close()
	if err := guest.Err(); err != nil {
		return Erased{}, err
	}
	if len(orders) > 0 {
		if _, err := s.tx.Exec(ctx, `UPDATE commerce.sales_order_event SET note = NULL WHERE kind IN ('note', 'email') AND order_id = ANY($1)`, orders); err != nil {
			return Erased{}, err
		}
	}
	return total, nil
}
func derefs(s *string) []string {
	if s == nil {
		return nil
	}
	return []string{*s}
}
func (s *Store) EraseCustomer(ctx context.Context, id string) (Erased, error) {
	if s.tx == nil {
		return Erased{}, errors.New("commerce: EraseCustomer must run inside Tx")
	}
	if len(s.eraseKey) < erasure.MinKeyLength {
		return Erased{}, errors.New("commerce: no erase key (ERASURE_HASH_KEY)")
	}
	erased := Erased{OrderIDs: []string{}, ContactIDs: []string{}, EmailHashes: []string{}}
	var current *string
	if err := s.tx.QueryRow(ctx, `SELECT email FROM commerce.customer WHERE id = $1`, id).Scan(&current); err == nil && current != nil && *current != "" {
		erased.EmailHashes = append(erased.EmailHashes, erasure.EmailHash(s.eraseKey, *current))
	}
	rows, err := s.tx.Query(ctx, `SELECT id, contact_id FROM commerce.sales_order WHERE customer_id = $1`, id)
	if err != nil {
		return Erased{}, err
	}
	for rows.Next() {
		var order string
		var contact *string
		if err := rows.Scan(&order, &contact); err != nil {
			rows.Close()
			return Erased{}, err
		}
		erased.OrderIDs = append(erased.OrderIDs, order)
		if contact != nil && !slices.Contains(erased.ContactIDs, *contact) {
			erased.ContactIDs = append(erased.ContactIDs, *contact)
		}
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return Erased{}, err
	}
	tag, err := s.tx.Exec(ctx, `UPDATE commerce.customer SET email = NULL, phone = NULL, first_name = $2, last_name = '',
		status = 'erased', updated_at = now() WHERE id = $1`, id, ErasedName)
	if err != nil {
		return Erased{}, err
	}
	if tag.RowsAffected() == 0 {
		return Erased{}, nil
	}
	erased.Found = true
	for _, step := range []struct {
		sql	string
		args	[]any
	}{
		{`DELETE FROM commerce.customer_address WHERE customer_id = $1`, []any{id}},
		{`UPDATE commerce.sales_order SET name = $2, email = NULL, phone = NULL, shipping_address = NULL WHERE customer_id = $1`, []any{id, ErasedName}},
		{`UPDATE commerce.sales_order_event SET note = NULL
		   WHERE kind IN ('note', 'email') AND order_id IN (SELECT id FROM commerce.sales_order WHERE customer_id = $1)`, []any{id}},
	} {
		if _, err := s.tx.Exec(ctx, step.sql, step.args...); err != nil {
			return Erased{}, err
		}
	}
	return erased, nil
}
