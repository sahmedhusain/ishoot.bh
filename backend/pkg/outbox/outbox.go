// Package outbox delivers a service's events reliably (ADR 0003). A use case writes its event to the service's own
// outbox table in the same transaction as the change; the relay publishes pending rows to the broker and marks them
// sent, so an event is never lost when the broker is down and never published for a change that rolled back.
// Delivery is at least once: the event ID travels as the broker's de-duplication key, and consumers record the IDs
// they handled in the inbox table (Handled).
package outbox

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/propagation"
)

// Subject names an event: <service>.<entity>.<verb>, lower case, e.g. "system.module.changed".
var subjectPattern = regexp.MustCompile(`^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$`)

// ErrInvalidSubject means the subject does not follow <service>.<entity>.<verb>.
var ErrInvalidSubject = errors.New("outbox: subject must be <service>.<entity>.<verb>")

// Event is one fact a service announces.
type Event struct {
	// ID is generated when empty. It is the broker's de-duplication key and the consumers' idempotency key.
	ID      string
	Subject string
	// Payload is marshalled to JSON; its schema lives in contracts/events/<subject>.v<version>.json.
	Payload any
}

// DDL creates the outbox and inbox tables in a service's schema. Services put it in a goose migration of their
// own (see the system service's 00004_outbox.sql); tests call it directly.
func DDL(schema string) string {
	return strings.NewReplacer("{schema}", pgx.Identifier{schema}.Sanitize()).Replace(`
CREATE TABLE IF NOT EXISTS {schema}.outbox (
    id           uuid        NOT NULL,
    subject      text        NOT NULL,
    payload      jsonb       NOT NULL,
    headers      jsonb       NOT NULL DEFAULT '{}'::jsonb,
    created_at   timestamptz NOT NULL DEFAULT now(),
    published_at timestamptz,
    attempts     integer     NOT NULL DEFAULT 0,
    next_try_at  timestamptz NOT NULL DEFAULT now(),
    last_error   text,
    CONSTRAINT outbox_pkey PRIMARY KEY (id),
    CONSTRAINT outbox_subject_check CHECK (subject ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$')
);
CREATE INDEX IF NOT EXISTS outbox_pending_idx ON {schema}.outbox (next_try_at) WHERE published_at IS NULL;
CREATE INDEX IF NOT EXISTS outbox_published_idx ON {schema}.outbox (published_at) WHERE published_at IS NOT NULL;
CREATE TABLE IF NOT EXISTS {schema}.inbox (
    consumer   text        NOT NULL,
    event_id   uuid        NOT NULL,
    handled_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT inbox_pkey PRIMARY KEY (consumer, event_id)
);`)
}

// Enqueue writes events to the schema's outbox inside the caller's transaction. The current trace context is kept
// with each event, so the consumer's work joins the same trace.
func Enqueue(ctx context.Context, tx pgx.Tx, schema string, events ...Event) error {
	headers := propagation.MapCarrier{}
	otel.GetTextMapPropagator().Inject(ctx, headers)
	rawHeaders, err := json.Marshal(headers)
	if err != nil {
		return err
	}
	table := pgx.Identifier{schema, "outbox"}.Sanitize()
	for _, ev := range events {
		if !subjectPattern.MatchString(ev.Subject) {
			return fmt.Errorf("%w: %q", ErrInvalidSubject, ev.Subject)
		}
		id := ev.ID
		if id == "" {
			id = uuid.NewString()
		} else if _, err := uuid.Parse(id); err != nil {
			return fmt.Errorf("outbox: event id: %w", err)
		}
		payload, err := json.Marshal(ev.Payload)
		if err != nil {
			return fmt.Errorf("outbox: payload of %s: %w", ev.Subject, err)
		}
		if _, err := tx.Exec(ctx, `INSERT INTO `+table+` (id, subject, payload, headers) VALUES ($1, $2, $3, $4)`,
			id, ev.Subject, payload, rawHeaders); err != nil {
			return fmt.Errorf("outbox: enqueue %s: %w", ev.Subject, err)
		}
	}
	return nil
}

// Handled records that consumer handled the event, inside the consumer's transaction. It returns false when the
// event was handled before, so the caller skips the work: a redelivered event changes nothing.
func Handled(ctx context.Context, tx pgx.Tx, schema, consumer, eventID string) (bool, error) {
	tag, err := tx.Exec(ctx, `INSERT INTO `+pgx.Identifier{schema, "inbox"}.Sanitize()+
		` (consumer, event_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, consumer, eventID)
	if err != nil {
		return false, fmt.Errorf("outbox: inbox: %w", err)
	}
	return tag.RowsAffected() == 1, nil
}

// backoff is the wait before the next attempt: 1s, 2s, 4s… capped at five minutes.
func backoff(attempts int) time.Duration {
	if attempts > 9 {
		return 5 * time.Minute
	}
	return min(time.Second<<attempts, 5*time.Minute)
}
