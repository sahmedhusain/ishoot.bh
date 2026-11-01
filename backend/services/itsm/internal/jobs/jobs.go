// Package jobs runs the itsm service's background work on River (ADR 0004).
package jobs

import (
	"context"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/riverqueue/river"
	"github.com/riverqueue/river/riverdriver/riverpgxv5"

	"platform.local/backend/services/itsm/internal/app"
)

// Queue is the River queue the service's jobs run on.
const Queue = "itsm"

// BreachArgs asks for open tickets past their resolve deadline to be flagged.
type BreachArgs struct{}

// Kind names the job in River's tables.
func (BreachArgs) Kind() string { return "itsm.mark_sla_breaches" }

// InsertOpts keeps at most one sweep waiting at a time.
func (BreachArgs) InsertOpts() river.InsertOpts {
	return river.InsertOpts{Queue: Queue, UniqueOpts: river.UniqueOpts{ByArgs: true}}
}

// BreachWorker flags breached tickets.
type BreachWorker struct {
	river.WorkerDefaults[BreachArgs]
	Service *app.Service
	Logger  *slog.Logger
}

// Work runs one sweep.
func (w *BreachWorker) Work(ctx context.Context, _ *river.Job[BreachArgs]) error {
	n, err := w.Service.MarkBreached(ctx)
	if n > 0 {
		w.Logger.InfoContext(ctx, "tickets past their SLA", "count", n)
	}
	return err
}

// Options configures the River client.
type Options struct {
	Schema         string
	BreachInterval time.Duration
	Workers        int
	Logger         *slog.Logger
}

// NewClient returns a River client that works the service's queue and schedules the SLA sweep.
func NewClient(pool *pgxpool.Pool, svc *app.Service, opts Options) (*river.Client[pgx.Tx], error) {
	workers := river.NewWorkers()
	if err := river.AddWorkerSafely(workers, &BreachWorker{Service: svc, Logger: opts.Logger}); err != nil {
		return nil, err
	}
	return river.NewClient(riverpgxv5.New(pool), &river.Config{
		Schema:  opts.Schema,
		Logger:  opts.Logger,
		Queues:  map[string]river.QueueConfig{Queue: {MaxWorkers: opts.Workers}},
		Workers: workers,
		PeriodicJobs: []*river.PeriodicJob{
			river.NewPeriodicJob(river.PeriodicInterval(opts.BreachInterval),
				func() (river.JobArgs, *river.InsertOpts) { return BreachArgs{}, nil },
				&river.PeriodicJobOpts{RunOnStart: true}),
		},
	})
}
