package jobs
import (
	"context"
	"log/slog"
	"time"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/riverqueue/river"
	"github.com/riverqueue/river/riverdriver/riverpgxv5"
	"platform.local/backend/services/files/internal/app"
)
const Queue = "files"
type CleanupArgs struct{}
func (CleanupArgs) Kind() string	{ return "files.cleanup_expired_uploads" }
func (CleanupArgs) InsertOpts() river.InsertOpts {
	return river.InsertOpts{Queue: Queue, UniqueOpts: river.UniqueOpts{ByArgs: true}}
}
type CleanupWorker struct {
	river.WorkerDefaults[CleanupArgs]
	Service	*app.Service
	Logger	*slog.Logger
}
func (w *CleanupWorker) Work(ctx context.Context, _ *river.Job[CleanupArgs]) error {
	total := 0
	for {
		n, err := w.Service.CleanupExpired(ctx)
		if err != nil {
			return err
		}
		total += n
		if n == 0 {
			break
		}
	}
	if total > 0 {
		w.Logger.InfoContext(ctx, "expired uploads removed", "count", total)
	}
	return nil
}
type CleanupOrphanedPrivateArgs struct{}
func (CleanupOrphanedPrivateArgs) Kind() string	{ return "files.cleanup_orphaned_private" }
func (CleanupOrphanedPrivateArgs) InsertOpts() river.InsertOpts {
	return river.InsertOpts{Queue: Queue, UniqueOpts: river.UniqueOpts{ByArgs: true}}
}
type CleanupOrphanedPrivateWorker struct {
	river.WorkerDefaults[CleanupOrphanedPrivateArgs]
	Service	*app.Service
	Logger	*slog.Logger
}
func (w *CleanupOrphanedPrivateWorker) Work(ctx context.Context, _ *river.Job[CleanupOrphanedPrivateArgs]) error {
	total := 0
	for {
		n, err := w.Service.CleanupOrphanedPrivate(ctx)
		if err != nil {
			return err
		}
		total += n
		if n == 0 {
			break
		}
	}
	if total > 0 {
		w.Logger.InfoContext(ctx, "orphaned private uploads removed", "count", total)
	}
	return nil
}
type Options struct {
	Schema		string
	CleanupInterval	time.Duration
	Workers		int
	Logger		*slog.Logger
}
func NewClient(pool *pgxpool.Pool, svc *app.Service, opts Options) (*river.Client[pgx.Tx], error) {
	workers := river.NewWorkers()
	if err := river.AddWorkerSafely(workers, &CleanupWorker{Service: svc, Logger: opts.Logger}); err != nil {
		return nil, err
	}
	if err := river.AddWorkerSafely(workers, &CleanupOrphanedPrivateWorker{Service: svc, Logger: opts.Logger}); err != nil {
		return nil, err
	}
	return river.NewClient(riverpgxv5.New(pool), &river.Config{
		Schema:		opts.Schema,
		Logger:		opts.Logger,
		Queues:		map[string]river.QueueConfig{Queue: {MaxWorkers: opts.Workers}},
		Workers:	workers,
		PeriodicJobs: []*river.PeriodicJob{
			river.NewPeriodicJob(river.PeriodicInterval(opts.CleanupInterval),
				func() (river.JobArgs, *river.InsertOpts) { return CleanupArgs{}, nil },
				&river.PeriodicJobOpts{RunOnStart: true}),
			river.NewPeriodicJob(river.PeriodicInterval(opts.CleanupInterval),
				func() (river.JobArgs, *river.InsertOpts) { return CleanupOrphanedPrivateArgs{}, nil },
				&river.PeriodicJobOpts{RunOnStart: true}),
		},
	})
}
