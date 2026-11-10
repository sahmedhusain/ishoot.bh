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
var subjectPattern = regexp.MustCompile(`^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$`)
var ErrInvalidSubject = errors.New("outbox: subject must be <service>.<entity>.<verb>")
type Event struct {
	ID	string
	Subject	string
	Payload	any
}
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
func Handled(ctx context.Context, tx pgx.Tx, schema, consumer, eventID string) (bool, error) {
	tag, err := tx.Exec(ctx, `INSERT INTO `+pgx.Identifier{schema, "inbox"}.Sanitize()+
		` (consumer, event_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, consumer, eventID)
	if err != nil {
		return false, fmt.Errorf("outbox: inbox: %w", err)
	}
	return tag.RowsAffected() == 1, nil
}
func backoff(attempts int) time.Duration {
	if attempts > 9 {
		return 5 * time.Minute
	}
	return min(time.Second<<attempts, 5*time.Minute)
}
