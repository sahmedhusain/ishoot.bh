// Package jobs schedules and runs identity maintenance using River.
package jobs

import (
	"context"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/riverqueue/river"
	"github.com/riverqueue/river/riverdriver/riverpgxv5"
)

const Queue = "identity"

type CleanupArgs struct{}

func (CleanupArgs) Kind() string { return "identity.cleanup_expired_sessions" }
func (CleanupArgs) InsertOpts() river.InsertOpts {
	return river.InsertOpts{Queue: Queue, UniqueOpts: river.UniqueOpts{ByArgs: true}}
}

type Store interface {
	DeleteExpired(context.Context, time.Time, int32) (int64, error)
	ClearExpiredMFAEnrollments(context.Context, time.Time, int32) (int64, error)
}
type CleanupWorker struct {
	river.WorkerDefaults[CleanupArgs]
	Store  Store
	Batch  int32
	Logger *slog.Logger
}

func (w *CleanupWorker) Work(ctx context.Context, _ *river.Job[CleanupArgs]) error {
	var sessions, enrollments int64
	for {
		now := time.Now()
		n, err := w.Store.DeleteExpired(ctx, now, w.Batch)
		if err != nil {
			return err
		}
		m, err := w.Store.ClearExpiredMFAEnrollments(ctx, now, w.Batch)
		if err != nil {
			return err
		}
		sessions += n
		enrollments += m
		if n == 0 && m == 0 {
			break
		}
	}
	if sessions > 0 || enrollments > 0 {
		w.Logger.InfoContext(ctx, "expired identity records removed", "sessions", sessions, "enrollments", enrollments)
	}
	return nil
}

type Options struct {
	Schema          string
	CleanupInterval time.Duration
	CleanupBatch    int32
	Workers         int
	Logger          *slog.Logger
}

func NewClient(pool *pgxpool.Pool, store Store, opts Options) (*river.Client[pgx.Tx], error) {
	workers := river.NewWorkers()
	if err := river.AddWorkerSafely(workers, &CleanupWorker{Store: store, Batch: opts.CleanupBatch, Logger: opts.Logger}); err != nil {
		return nil, err
	}
	return river.NewClient(riverpgxv5.New(pool), &river.Config{Schema: opts.Schema, Logger: opts.Logger,
		Queues: map[string]river.QueueConfig{Queue: {MaxWorkers: opts.Workers}}, Workers: workers,
		PeriodicJobs: []*river.PeriodicJob{river.NewPeriodicJob(river.PeriodicInterval(opts.CleanupInterval), func() (river.JobArgs, *river.InsertOpts) { return CleanupArgs{}, nil }, &river.PeriodicJobOpts{RunOnStart: true})},
	})
}
