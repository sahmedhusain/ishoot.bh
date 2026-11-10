package app
import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"platform.local/backend/pkg/outbox"
	"platform.local/backend/services/system/internal/postgres"
	"platform.local/backend/services/system/internal/postgres/sqlcdb"
)
var ErrReservationConflict = errors.New("idempotency key was used for another numbering command")
func (s *Service) ReserveNumber(ctx context.Context, caller, key, kind, date string) (string, error) {
	parsed, err := time.Parse(time.DateOnly, date)
	if err != nil || parsed.Year() < 1 || (kind != "invoice" && kind != "receipt") || key == "" || len(key) > 200 || strings.ContainsAny(key, "\r\n\t") {
		return "", ErrValidationFailed
	}
	var number string
	err = s.store.Tx(ctx, func(store *postgres.Store, tx pgx.Tx) error {
		if _, err := store.Company(ctx, true); errors.Is(err, pgx.ErrNoRows) {
			return ErrCompanyMissing
		} else if err != nil {
			return err
		}
		existing, err := store.Reservation(ctx, caller, key)
		if err == nil {
			if existing.Kind != kind || !existing.DocumentDate.Time.Equal(parsed) {
				return ErrReservationConflict
			}
			number = existing.DocumentNumber
			return nil
		}
		if !errors.Is(err, pgx.ErrNoRows) {
			return err
		}
		sequence, err := store.ReserveSequence(ctx, kind)
		if err != nil {
			return err
		}
		number = fmt.Sprintf("%s-%d-%04d", sequence.Prefix, parsed.Year(), sequence.Allocated)
		if err := store.RecordReservation(ctx, sqlcdb.SaveNumberReservationParams{Caller: caller, IdempotencyKey: key, Kind: kind, DocumentDate: pgtype.Date{Time: parsed, Valid: true}, DocumentNumber: number}); err != nil {
			return err
		}
		hash := sha256.Sum256([]byte(caller + ":" + key))
		return outbox.Enqueue(ctx, tx, "system", outbox.Event{Subject: "system.sequence.allocated", Payload: map[string]any{"kind": kind, "reservationId": hex.EncodeToString(hash[:]), "changedBy": "service:" + caller}})
	})
	return number, err
}
func (s *Service) CompleteSetup(ctx context.Context, by string) (CompanyRecord, error) {
	var out CompanyRecord
	err := s.store.Tx(ctx, func(store *postgres.Store, tx pgx.Tx) error {
		current, err := companyRecord(ctx, store, true)
		if err != nil {
			return err
		}
		if current.SetupCompletedAt != nil {
			out = current
			return nil
		}
		now := s.now()
		current.SetupCompletedAt = &now
		current.UpdatedAt = now
		current.Revision++
		raw, err := json.Marshal(current)
		if err != nil {
			return err
		}
		if err := store.SaveCompany(ctx, current.ID, raw, by, now); err != nil {
			return err
		}
		out = current
		return outbox.Enqueue(ctx, tx, "system", outbox.Event{Subject: "system.company.changed", Payload: map[string]any{"companyId": current.ID, "revision": current.Revision, "changedBy": by}})
	})
	return out, err
}
