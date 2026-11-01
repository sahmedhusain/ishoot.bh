// Package postgres stores the audit trail in the audit schema.
package postgres

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"

	"platform.local/backend/services/audit/internal/postgres/sqlcdb"
)

// Schema is the service's database schema (ADR 0002).
const Schema = "audit"

// Event is one stored event.
type Event = sqlcdb.AuditEvent

// SubjectCount is how many events of one subject there are.
type SubjectCount = sqlcdb.SubjectsRow

// Filter narrows a listing; nil fields do not filter.
type Filter = sqlcdb.ListEventsParams

// Store reads and writes the audit schema.
type Store struct{ q *sqlcdb.Queries }

// New returns a store on the pool.
func New(pool *pgxpool.Pool) *Store { return &Store{q: sqlcdb.New(pool)} }

// Insert stores an event; it returns false when the event was stored before (a redelivery).
func (s *Store) Insert(ctx context.Context, p sqlcdb.InsertEventParams) (bool, error) {
	n, err := s.q.InsertEvent(ctx, p)
	return n == 1, err
}

// List returns one page of events, newest first.
func (s *Store) List(ctx context.Context, f Filter) ([]Event, error) { return s.q.ListEvents(ctx, f) }

// Get returns one event.
func (s *Store) Get(ctx context.Context, id string) (Event, error) { return s.q.GetEvent(ctx, id) }

// Subjects returns every subject with its count.
func (s *Store) Subjects(ctx context.Context) ([]SubjectCount, error) { return s.q.Subjects(ctx) }
