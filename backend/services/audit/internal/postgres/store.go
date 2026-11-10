package postgres
import (
	"context"
	"github.com/jackc/pgx/v5/pgxpool"
	"platform.local/backend/services/audit/internal/postgres/sqlcdb"
)
const Schema = "audit"
type Event = sqlcdb.AuditEvent
type SubjectCount = sqlcdb.SubjectsRow
type Filter = sqlcdb.ListEventsParams
type Store struct{ q *sqlcdb.Queries }
func New(pool *pgxpool.Pool) *Store	{ return &Store{q: sqlcdb.New(pool)} }
func (s *Store) Insert(ctx context.Context, p sqlcdb.InsertEventParams) (bool, error) {
	n, err := s.q.InsertEvent(ctx, p)
	return n == 1, err
}
func (s *Store) List(ctx context.Context, f Filter) ([]Event, error)	{ return s.q.ListEvents(ctx, f) }
func (s *Store) Get(ctx context.Context, id string) (Event, error)	{ return s.q.GetEvent(ctx, id) }
func (s *Store) Subjects(ctx context.Context) ([]SubjectCount, error)	{ return s.q.Subjects(ctx) }
