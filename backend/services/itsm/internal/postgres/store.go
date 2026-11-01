// Package postgres stores tickets in the itsm schema.
package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"platform.local/backend/pkg/db"
	"platform.local/backend/services/itsm/internal/domain"
	"platform.local/backend/services/itsm/internal/postgres/sqlcdb"
)

// Ticket, Comment, Event and Attachment are the stored rows.
type (
	Ticket     = sqlcdb.ItsmTicket
	Comment    = sqlcdb.ItsmTicketComment
	Event      = sqlcdb.ItsmTicketEvent
	Attachment = sqlcdb.ItsmTicketAttachment
	SLAPolicy  = sqlcdb.ItsmSlaPolicy
)

// Actor is who changed a ticket.
type Actor struct{ Realm, ID, Name string }

// Store implements the persistence the use cases need.
type Store struct {
	pool *pgxpool.Pool
	q    *sqlcdb.Queries
}

// New returns a store using pool.
func New(pool *pgxpool.Pool) *Store { return &Store{pool: pool, q: sqlcdb.New(pool)} }

func notFound(err error) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.ErrNotFound
	}
	return err
}

func event(q *sqlcdb.Queries, ctx context.Context, ticketID string, actor Actor, kind string, from, to *string, detail any, now time.Time) error {
	raw, err := json.Marshal(detail)
	if err != nil {
		return err
	}
	return q.InsertEvent(ctx, sqlcdb.InsertEventParams{
		ID: uuid.NewString(), TicketID: ticketID, ActorRealm: actor.Realm, ActorID: actor.ID, Kind: kind,
		FromStatus: from, ToStatus: to, Detail: raw, CreatedAt: now,
	})
}

// Create stores a validated ticket, its attachments and a "created" event, with deadlines from the SLA policy.
func (s *Store) Create(ctx context.Context, n domain.NewTicket, actor Actor, now time.Time) (Ticket, error) {
	var ticket Ticket
	err := db.WithTx(ctx, s.pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		q := s.q.WithTx(tx)
		row, err := q.SLAPolicy(ctx, n.Priority)
		if err != nil {
			return notFound(err)
		}
		respondBy, resolveBy := domain.Policy{ResponseMinutes: row.ResponseMinutes, ResolveMinutes: row.ResolveMinutes}.Deadlines(now)
		var asset *string
		if n.AssetRef != "" {
			asset = &n.AssetRef
		}
		ticket, err = q.InsertTicket(ctx, sqlcdb.InsertTicketParams{
			ID: uuid.NewString(), RequesterID: n.RequesterID, RequesterName: n.RequesterName, RequesterEmail: n.RequesterEmail,
			Category: n.Category, Subcategory: n.Subcategory, Priority: n.Priority, Status: domain.InitialStatus(),
			Title: n.Title, Description: n.Description, AssetRef: asset, RespondBy: respondBy, ResolveBy: resolveBy, Now: now,
		})
		if err != nil {
			return err
		}
		for _, a := range n.Attachments {
			if err := q.InsertAttachment(ctx, sqlcdb.InsertAttachmentParams{
				TicketID: ticket.ID, FileUrl: a.FileURL, FileName: a.FileName, MimeType: a.MIMEType, FileSize: a.Size,
				AddedBy: actor.ID, CreatedAt: now,
			}); err != nil {
				return err
			}
		}
		return event(q, ctx, ticket.ID, actor, "created", nil, &ticket.Status, map[string]any{"priority": ticket.Priority}, now)
	})
	return ticket, err
}

// Get returns a ticket.
func (s *Store) Get(ctx context.Context, id string) (Ticket, error) {
	if _, err := uuid.Parse(id); err != nil {
		return Ticket{}, domain.ErrNotFound
	}
	t, err := s.q.GetTicket(ctx, id)
	return t, notFound(err)
}

// Detail returns a ticket with its comments (internal ones only when asked), events and attachments.
func (s *Store) Detail(ctx context.Context, id string, internal bool) (Ticket, []Comment, []Event, []Attachment, error) {
	t, err := s.Get(ctx, id)
	if err != nil {
		return Ticket{}, nil, nil, nil, err
	}
	comments, err := s.q.ListComments(ctx, sqlcdb.ListCommentsParams{TicketID: id, IncludeInternal: internal})
	if err != nil {
		return Ticket{}, nil, nil, nil, err
	}
	events, err := s.q.ListEvents(ctx, id)
	if err != nil {
		return Ticket{}, nil, nil, nil, err
	}
	attachments, err := s.q.ListAttachments(ctx, id)
	return t, comments, events, attachments, err
}

// Cursor positions keyset pagination after the last row of the previous page.
type Cursor struct {
	CreatedAt time.Time
	ID        string
}

// Filter narrows the IT queue.
type Filter struct {
	Status, AssigneeID, Priority string
	OpenOnly                     bool
	OpenStatuses                 []string
}

func cursorParams(c *Cursor) (bool, time.Time, string) {
	if c == nil {
		return false, time.Time{}, uuid.Nil.String()
	}
	return true, c.CreatedAt, c.ID
}

// ListForRequester returns one page of a requester's tickets, newest first.
func (s *Store) ListForRequester(ctx context.Context, requester, status string, c *Cursor, size int32) ([]Ticket, error) {
	has, at, id := cursorParams(c)
	return s.q.ListRequesterTickets(ctx, sqlcdb.ListRequesterTicketsParams{
		RequesterID: requester, Status: status, HasCursor: has, BeforeCreated: at, BeforeID: id, PageSize: size,
	})
}

// ListQueue returns one page of the IT queue, newest first.
func (s *Store) ListQueue(ctx context.Context, f Filter, c *Cursor, size int32) ([]Ticket, error) {
	has, at, id := cursorParams(c)
	return s.q.ListQueue(ctx, sqlcdb.ListQueueParams{
		Status: f.Status, AssigneeID: f.AssigneeID, Priority: f.Priority, OpenOnly: f.OpenOnly, OpenStatuses: f.OpenStatuses,
		HasCursor: has, BeforeCreated: at, BeforeID: id, PageSize: size,
	})
}

// Stats are the open tickets counted per status and priority.
type Stats struct {
	Open, Breached, Unassigned int64
	ByStatus, ByPriority       map[string]int64
}

// QueueStats counts open tickets.
func (s *Store) QueueStats(ctx context.Context, openStatuses []string) (Stats, error) {
	rows, err := s.q.QueueStats(ctx, openStatuses)
	if err != nil {
		return Stats{}, err
	}
	out := Stats{ByStatus: map[string]int64{}, ByPriority: map[string]int64{}}
	for _, r := range rows {
		out.Open += r.Tickets
		out.Breached += r.Breached
		out.Unassigned += r.Unassigned
		out.ByStatus[r.Status] += r.Tickets
		out.ByPriority[r.Priority] += r.Tickets
	}
	return out, nil
}

// Transition locks the ticket, asks change for the new state and stores it with an event.
func (s *Store) Transition(ctx context.Context, id string, actor Actor, name string, now time.Time, change func(Ticket) (domain.State, error)) (Ticket, error) {
	if _, err := uuid.Parse(id); err != nil {
		return Ticket{}, domain.ErrNotFound
	}
	var out Ticket
	err := db.WithTx(ctx, s.pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		q := s.q.WithTx(tx)
		current, err := q.LockTicket(ctx, id)
		if err != nil {
			return notFound(err)
		}
		next, err := change(current)
		if err != nil {
			return err
		}
		out, err = q.UpdateTicketState(ctx, sqlcdb.UpdateTicketStateParams{
			ID: id, Status: next.Status, AssigneeID: next.AssigneeID, AssigneeName: next.AssigneeName,
			FirstResponseAt: next.FirstResponseAt, ResolvedAt: next.ResolvedAt, ClosedAt: next.ClosedAt, Now: now,
		})
		if err != nil {
			return err
		}
		return event(q, ctx, id, actor, name, &current.Status, &out.Status, map[string]any{"assigneeId": out.AssigneeID}, now)
	})
	return out, err
}

// AddComment locks the ticket, runs check, stores the comment and an event. A visible IT comment is the first
// response when none was made yet.
func (s *Store) AddComment(ctx context.Context, id string, actor Actor, body string, internal, isResponse bool, now time.Time, check func(Ticket) error) (Comment, error) {
	if _, err := uuid.Parse(id); err != nil {
		return Comment{}, domain.ErrNotFound
	}
	var out Comment
	err := db.WithTx(ctx, s.pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		q := s.q.WithTx(tx)
		current, err := q.LockTicket(ctx, id)
		if err != nil {
			return notFound(err)
		}
		if err := check(current); err != nil {
			return err
		}
		out, err = q.InsertComment(ctx, sqlcdb.InsertCommentParams{
			ID: uuid.NewString(), TicketID: id, AuthorRealm: actor.Realm, AuthorID: actor.ID, AuthorName: actor.Name,
			Body: body, Internal: internal, CreatedAt: now,
		})
		if err != nil {
			return err
		}
		var first *time.Time
		if isResponse && !internal {
			first = &now
		}
		if err := q.TouchTicket(ctx, sqlcdb.TouchTicketParams{ID: id, FirstResponseAt: first, Now: now}); err != nil {
			return err
		}
		return event(q, ctx, id, actor, "comment", nil, nil, map[string]any{"internal": internal}, now)
	})
	return out, err
}

// ListSLA returns every SLA policy.
func (s *Store) ListSLA(ctx context.Context) ([]SLAPolicy, error) { return s.q.ListSLAPolicies(ctx) }

// UpdateSLA changes one policy.
func (s *Store) UpdateSLA(ctx context.Context, p domain.Policy, by string, now time.Time) error {
	n, err := s.q.UpdateSLAPolicy(ctx, sqlcdb.UpdateSLAPolicyParams{
		Priority: p.Priority, ResponseMinutes: p.ResponseMinutes, ResolveMinutes: p.ResolveMinutes,
		UpdatedBy: &by, UpdatedAt: now,
	})
	if err == nil && n == 0 {
		return domain.ErrNotFound
	}
	return err
}

// MarkBreached flags one batch of open tickets past their resolution deadline and returns how many.
func (s *Store) MarkBreached(ctx context.Context, now time.Time, batch int32) (int, error) {
	ids, err := s.q.MarkBreached(ctx, sqlcdb.MarkBreachedParams{Now: &now, BatchSize: batch})
	return len(ids), err
}
