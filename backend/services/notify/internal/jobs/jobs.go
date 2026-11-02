// Package jobs runs the notify service's deliveries on River (ADR 0004).
package jobs

import (
	"context"
	"time"

	"log/slog"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/riverqueue/river"
	"github.com/riverqueue/river/riverdriver/riverpgxv5"

	"platform.local/backend/services/notify/internal/app"
)

// DeliverWorker sends one message.
type DeliverWorker struct {
	river.WorkerDefaults[app.DeliverArgs]
	Service *app.Service
	// Timeout bounds one send.
	SendTimeout time.Duration
}

// Work delivers the message; an error asks River to retry with its back-off.
func (w *DeliverWorker) Work(ctx context.Context, job *river.Job[app.DeliverArgs]) error {
	return w.Service.Deliver(ctx, job.Args.ID, job.Attempt)
}

// Timeout bounds one attempt.
func (w *DeliverWorker) Timeout(*river.Job[app.DeliverArgs]) time.Duration { return w.SendTimeout }

// Options configures the River client.
type Options struct {
	Schema      string
	Workers     int
	MaxAttempts int
	SendTimeout time.Duration
	Logger      *slog.Logger
}

// NewClient returns a River client that delivers messages (worker) or only inserts jobs (svc nil: the API).
func NewClient(pool *pgxpool.Pool, svc *app.Service, opts Options) (*river.Client[pgx.Tx], error) {
	cfg := &river.Config{Schema: opts.Schema, Logger: opts.Logger, MaxAttempts: opts.MaxAttempts}
	if svc != nil {
		workers := river.NewWorkers()
		if err := river.AddWorkerSafely(workers, &DeliverWorker{Service: svc, SendTimeout: opts.SendTimeout}); err != nil {
			return nil, err
		}
		cfg.Workers = workers
		cfg.Queues = map[string]river.QueueConfig{app.Queue: {MaxWorkers: opts.Workers}}
	}
	return river.NewClient(riverpgxv5.New(pool), cfg)
}
