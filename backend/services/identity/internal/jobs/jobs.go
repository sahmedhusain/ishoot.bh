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
}
type CleanupWorker struct {
	river.WorkerDefaults[CleanupArgs]
	Store  Store
	Batch  int32
	Logger *slog.Logger
}

func (w *CleanupWorker) Work(ctx context.Context, _ *river.Job[CleanupArgs]) error {
	var total int64
	for {
		n, err := w.Store.DeleteExpired(ctx, time.Now(), w.Batch)
		if err != nil {
			return err
		}
		total += n
		if n == 0 {
			break
		}
	}
	if total > 0 {
		w.Logger.InfoContext(ctx, "expired sessions removed", "count", total)
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
