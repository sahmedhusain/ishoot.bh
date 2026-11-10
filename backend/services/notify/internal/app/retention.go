package app
import (
	"context"
	"time"
	"github.com/riverqueue/river"
)
const emailRetentionBatchSize = 100
type PurgeEmailArgs struct{}
func (PurgeEmailArgs) Kind() string	{ return "notify.email_purge" }
func (PurgeEmailArgs) InsertOpts() river.InsertOpts	{ return river.InsertOpts{Queue: Queue} }
func (s *Service) PurgeEmailContent(ctx context.Context, retention time.Duration) (int64, error) {
	if retention <= 0 {
		return 0, nil
	}
	before := s.now().Add(-retention)
	var total int64
	for {
		removed, err := s.store.PurgeSentEmailContent(ctx, before, emailRetentionBatchSize)
		total += removed
		if err != nil || removed < emailRetentionBatchSize {
			return total, err
		}
	}
}
