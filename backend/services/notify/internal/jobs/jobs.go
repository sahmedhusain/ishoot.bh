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

// DueWorker announces a scheduled in-app notification when its time comes.
type DueWorker struct {
	river.WorkerDefaults[app.DueArgs]
	Service *app.Service
}

// Work sends the notification's live hint.
func (w *DueWorker) Work(ctx context.Context, job *river.Job[app.DueArgs]) error {
	return w.Service.AnnounceDue(ctx, job.Args.ID)
}

// PurgeWorker removes old read and archived in-app notifications.
type PurgeWorker struct {
	river.WorkerDefaults[app.PurgeArgs]
	Service   *app.Service
	Retention time.Duration
	Logger    *slog.Logger
}

// Work purges once.
func (w *PurgeWorker) Work(ctx context.Context, _ *river.Job[app.PurgeArgs]) error {
	n, err := w.Service.Purge(ctx, w.Retention)
	if err == nil && n > 0 {
		w.Logger.InfoContext(ctx, "purged old notifications", "removed", n)
	}
	return err
}

// PurgeEmailWorker removes sensitive content from old successful email records.
type PurgeEmailWorker struct {
	river.WorkerDefaults[app.PurgeEmailArgs]
	Service   *app.Service
	Retention time.Duration
	Logger    *slog.Logger
}

func (w *PurgeEmailWorker) Work(ctx context.Context, _ *river.Job[app.PurgeEmailArgs]) error {
	n, err := w.Service.PurgeEmailContent(ctx, w.Retention)
	if err == nil && n > 0 {
		w.Logger.InfoContext(ctx, "purged old email content", "removed", n)
	}
	return err
}

// Options configures the River client.
type Options struct {
	Schema      string
	Workers     int
	MaxAttempts int
	SendTimeout time.Duration
	Logger      *slog.Logger
	// InboxRetention is how long read and archived in-app notifications are kept; PurgeEvery is how often the
	// worker removes older ones (zero turns purging off).
	InboxRetention    time.Duration
	PurgeEvery        time.Duration
	MessageRetention  time.Duration
	MessagePurgeEvery time.Duration
}

// NewClient returns a River client that delivers messages (worker) or only inserts jobs (svc nil: the API).
func NewClient(pool *pgxpool.Pool, svc *app.Service, opts Options) (*river.Client[pgx.Tx], error) {
	cfg := &river.Config{Schema: opts.Schema, Logger: opts.Logger, MaxAttempts: opts.MaxAttempts}
	if svc != nil {
		workers := river.NewWorkers()
		var periodicJobs []*river.PeriodicJob
		if err := river.AddWorkerSafely(workers, &DeliverWorker{Service: svc, SendTimeout: opts.SendTimeout}); err != nil {
			return nil, err
		}
		if err := river.AddWorkerSafely(workers, &DueWorker{Service: svc}); err != nil {
			return nil, err
		}
		if opts.InboxRetention > 0 && opts.PurgeEvery > 0 {
			if err := river.AddWorkerSafely(workers, &PurgeWorker{Service: svc, Retention: opts.InboxRetention, Logger: opts.Logger}); err != nil {
				return nil, err
			}
			periodicJobs = append(periodicJobs, river.NewPeriodicJob(river.PeriodicInterval(opts.PurgeEvery),
				func() (river.JobArgs, *river.InsertOpts) { return app.PurgeArgs{}, nil }, &river.PeriodicJobOpts{RunOnStart: true}))
		}
		if opts.MessageRetention > 0 && opts.MessagePurgeEvery > 0 {
			if err := river.AddWorkerSafely(workers, &PurgeEmailWorker{Service: svc, Retention: opts.MessageRetention, Logger: opts.Logger}); err != nil {
				return nil, err
			}
			periodicJobs = append(periodicJobs, river.NewPeriodicJob(river.PeriodicInterval(opts.MessagePurgeEvery),
				func() (river.JobArgs, *river.InsertOpts) { return app.PurgeEmailArgs{}, nil }, &river.PeriodicJobOpts{RunOnStart: true}))
		}
		cfg.PeriodicJobs = periodicJobs
		cfg.Workers = workers
		cfg.Queues = map[string]river.QueueConfig{app.Queue: {MaxWorkers: opts.Workers}}
	}
	return river.NewClient(riverpgxv5.New(pool), cfg)
}
