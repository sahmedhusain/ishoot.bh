package outbox

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/prometheus/client_golang/prometheus"
)

// Message is what the relay hands the broker.
type Message struct {
	ID      string
	Subject string
	Data    []byte
	Headers map[string]string
}

// Publisher sends a message to the broker and returns once the broker has stored it (natsx.Publisher).
type Publisher interface {
	Publish(ctx context.Context, msg Message) error
}

// RelayOptions configures a relay.
type RelayOptions struct {
	Schema    string
	Publisher Publisher
	Logger    *slog.Logger
	// Interval is the wait between polls when the outbox is empty.
	Interval time.Duration
	// Batch is the most rows one poll claims.
	Batch int
	// Retention is how long published rows are kept (for the IT dashboard's lag and replay); 0 keeps them.
	Retention time.Duration
	// Metrics, when set, receives the relay's counters and the pending gauge.
	Metrics prometheus.Registerer
}

// Relay publishes a schema's pending outbox rows. Several relays may run against one schema: rows are claimed
// with FOR UPDATE SKIP LOCKED, so each is published by one relay at a time.
type Relay struct {
	pool      *pgxpool.Pool
	opts      RelayOptions
	table     string
	published prometheus.Counter
	failed    prometheus.Counter
	pending   prometheus.Gauge
	now       func() time.Time
}

// NewRelay returns a relay for the schema's outbox.
func NewRelay(pool *pgxpool.Pool, opts RelayOptions) (*Relay, error) {
	if opts.Publisher == nil || opts.Schema == "" {
		return nil, errors.New("outbox: relay needs a schema and a publisher")
	}
	if opts.Interval <= 0 {
		opts.Interval = time.Second
	}
	if opts.Batch <= 0 {
		opts.Batch = 100
	}
	if opts.Logger == nil {
		opts.Logger = slog.Default()
	}
	labels := prometheus.Labels{"schema": opts.Schema}
	r := &Relay{
		pool: pool, opts: opts, table: pgx.Identifier{opts.Schema, "outbox"}.Sanitize(),
		published: prometheus.NewCounter(prometheus.CounterOpts{Name: "outbox_published_total", Help: "Events published to the broker.", ConstLabels: labels}),
		failed:    prometheus.NewCounter(prometheus.CounterOpts{Name: "outbox_publish_failures_total", Help: "Failed publish attempts.", ConstLabels: labels}),
		pending:   prometheus.NewGauge(prometheus.GaugeOpts{Name: "outbox_pending", Help: "Events not yet published.", ConstLabels: labels}),
		now:       func() time.Time { return time.Now().UTC() },
	}
	if opts.Metrics != nil {
		for _, c := range []prometheus.Collector{r.published, r.failed, r.pending} {
			if err := opts.Metrics.Register(c); err != nil {
				return nil, err
			}
		}
	}
	return r, nil
}

// Run publishes until ctx ends. A failed poll is logged and retried; it never stops the relay.
func (r *Relay) Run(ctx context.Context) error {
	purgeEvery := time.NewTicker(time.Hour)
	defer purgeEvery.Stop()
	for {
		n, err := r.Once(ctx)
		if err != nil && ctx.Err() == nil {
			r.opts.Logger.ErrorContext(ctx, "outbox relay", "schema", r.opts.Schema, "error", err)
		}
		wait := r.opts.Interval
		if n == r.opts.Batch {
			wait = 0 // more are waiting
		}
		select {
		case <-ctx.Done():
			return nil
		case <-purgeEvery.C:
			if _, err := r.Purge(ctx); err != nil {
				r.opts.Logger.ErrorContext(ctx, "outbox purge", "schema", r.opts.Schema, "error", err)
			}
		case <-time.After(wait):
		}
	}
}

type outboxRow struct {
	id, subject string
	payload     []byte
	headers     []byte
	attempts    int
}

// Once claims one batch of due rows, publishes them in order and records each outcome. It returns how many rows
// it claimed.
func (r *Relay) Once(ctx context.Context) (int, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer func() { _ = tx.Rollback(context.WithoutCancel(ctx)) }()
	rows, err := tx.Query(ctx, `SELECT id::text, subject, payload, headers, attempts FROM `+r.table+`
		WHERE published_at IS NULL AND next_try_at <= $1 ORDER BY created_at, id LIMIT $2 FOR UPDATE SKIP LOCKED`,
		r.now(), r.opts.Batch)
	if err != nil {
		return 0, err
	}
	batch, err := pgx.CollectRows(rows, func(cr pgx.CollectableRow) (outboxRow, error) {
		var out outboxRow
		err := cr.Scan(&out.id, &out.subject, &out.payload, &out.headers, &out.attempts)
		return out, err
	})
	if err != nil {
		return 0, err
	}
	for _, item := range batch {
		headers := map[string]string{}
		_ = json.Unmarshal(item.headers, &headers)
		pubErr := r.opts.Publisher.Publish(ctx, Message{ID: item.id, Subject: item.subject, Data: item.payload, Headers: headers})
		if pubErr != nil {
			r.failed.Inc()
			if _, err := tx.Exec(ctx, `UPDATE `+r.table+` SET attempts = attempts + 1, next_try_at = $2, last_error = $3 WHERE id = $1`,
				item.id, r.now().Add(backoff(item.attempts)), truncate(pubErr.Error(), 500)); err != nil {
				return 0, err
			}
			continue
		}
		r.published.Inc()
		if _, err := tx.Exec(ctx, `UPDATE `+r.table+` SET published_at = $2, attempts = attempts + 1, last_error = NULL WHERE id = $1`,
			item.id, r.now()); err != nil {
			return 0, err
		}
	}
	var pending int64
	if err := tx.QueryRow(ctx, `SELECT count(*) FROM `+r.table+` WHERE published_at IS NULL`).Scan(&pending); err == nil {
		r.pending.Set(float64(pending))
	}
	return len(batch), tx.Commit(ctx)
}

// Purge deletes published rows older than the retention and returns how many.
func (r *Relay) Purge(ctx context.Context) (int64, error) {
	if r.opts.Retention <= 0 {
		return 0, nil
	}
	tag, err := r.pool.Exec(ctx, `DELETE FROM `+r.table+` WHERE published_at < $1`, r.now().Add(-r.opts.Retention))
	return tag.RowsAffected(), err
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n]
}

// Config is embedded in a service config with envPrefix:"OUTBOX_".
type Config struct {
	Interval  time.Duration `env:"INTERVAL" envDefault:"1s" validate:"gt=0"`
	Batch     int           `env:"BATCH" envDefault:"100" validate:"gt=0,lte=1000"`
	Retention time.Duration `env:"RETENTION" envDefault:"168h" validate:"gte=0"`
}
