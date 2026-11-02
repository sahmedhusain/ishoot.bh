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
	ClearExpiredCredentials(context.Context, time.Time, int32) (int64, error)
}
type CleanupWorker struct {
	river.WorkerDefaults[CleanupArgs]
	Store  Store
	Batch  int32
	Logger *slog.Logger
}

func (w *CleanupWorker) Work(ctx context.Context, _ *river.Job[CleanupArgs]) error {
	var sessions, enrollments, credentials int64
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
		c, err := w.Store.ClearExpiredCredentials(ctx, now, w.Batch)
		if err != nil {
			return err
		}
		credentials += c
		sessions += n
		enrollments += m
		if n == 0 && m == 0 && c == 0 {
			break
		}
	}
	if sessions > 0 || enrollments > 0 || credentials > 0 {
		w.Logger.InfoContext(ctx, "expired identity records removed", "sessions", sessions, "enrollments", enrollments, "credentials", credentials)
	}
	return nil
}

type Options struct {
	Projection         *ProfileProjectionWorker
	ProjectionInterval time.Duration
	Schema             string
	CleanupInterval    time.Duration
	CleanupBatch       int32
	Workers            int
	Logger             *slog.Logger
}

func NewClient(pool *pgxpool.Pool, store Store, opts Options) (*river.Client[pgx.Tx], error) {
	workers := river.NewWorkers()
	if err := river.AddWorkerSafely(workers, &CleanupWorker{Store: store, Batch: opts.CleanupBatch, Logger: opts.Logger}); err != nil {
		return nil, err
	}
	periodic := []*river.PeriodicJob{river.NewPeriodicJob(river.PeriodicInterval(opts.CleanupInterval), func() (river.JobArgs, *river.InsertOpts) { return CleanupArgs{}, nil }, &river.PeriodicJobOpts{RunOnStart: true})}
	if opts.Projection != nil {
		if err := river.AddWorkerSafely(workers, opts.Projection); err != nil {
			return nil, err
		}
		interval := opts.ProjectionInterval
		if interval <= 0 {
			interval = 5 * time.Second
		}
		periodic = append(periodic, river.NewPeriodicJob(river.PeriodicInterval(interval), func() (river.JobArgs, *river.InsertOpts) { return ProfileProjectionArgs{}, nil }, &river.PeriodicJobOpts{RunOnStart: true}))
	}
	return river.NewClient(riverpgxv5.New(pool), &river.Config{Schema: opts.Schema, Logger: opts.Logger,
		Queues: map[string]river.QueueConfig{Queue: {MaxWorkers: opts.Workers}}, Workers: workers,
		PeriodicJobs: periodic,
	})
}
