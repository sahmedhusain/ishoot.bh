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
	"github.com/riverqueue/river"
	"github.com/riverqueue/river/rivertype"

	"platform.local/backend/pkg/db"
	"platform.local/backend/pkg/outbox"
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

// JobInserter enqueues River jobs inside a database transaction.
type JobInserter interface {
	InsertTx(ctx context.Context, tx pgx.Tx, args river.JobArgs, opts *river.InsertOpts) (*rivertype.JobInsertResult, error)
}

// Store implements the persistence the use cases need.
type Store struct {
	pool *pgxpool.Pool
	q    *sqlcdb.Queries
	jobs JobInserter
}

// New returns a store using pool.
func New(pool *pgxpool.Pool) *Store { return &Store{pool: pool, q: sqlcdb.New(pool)} }

// SetJobInserter sets the River job inserter for background notifications.
func (s *Store) SetJobInserter(jobs JobInserter) {
	s.jobs = jobs
}

func notFound(err error) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.ErrNotFound
	}
	return err
}

func (s *Store) recordEvent(q *sqlcdb.Queries, ctx context.Context, ticketID string, actor Actor, kind string, from, to *string, detail any, now time.Time) (string, error) {
	raw, err := json.Marshal(detail)
	if err != nil {
		return "", err
	}
	eventID := uuid.NewString()
	err = q.InsertEvent(ctx, sqlcdb.InsertEventParams{
		ID: eventID, TicketID: ticketID, ActorRealm: actor.Realm, ActorID: actor.ID, Kind: kind,
		FromStatus: from, ToStatus: to, Detail: raw, CreatedAt: now,
	})
	return eventID, err
}

func enqueueOutbox(ctx context.Context, tx pgx.Tx, subject, eventID string, payload any) error {
	return outbox.Enqueue(ctx, tx, "itsm", outbox.Event{
		ID:      eventID,
		Subject: subject,
		Payload: payload,
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
				AddedBy: actor.ID, CommentID: nil, CreatedAt: now,
			}); err != nil {
				return err
			}
		}
		eventID, err := s.recordEvent(q, ctx, ticket.ID, actor, "created", nil, &ticket.Status, map[string]any{"priority": ticket.Priority}, now)
		if err != nil {
			return err
		}
		if err := enqueueOutbox(ctx, tx, "itsm.ticket.created", eventID, map[string]any{
			"ticketId":    ticket.ID,
			"number":      ticket.Number,
			"requesterId": ticket.RequesterID,
			"category":    ticket.Category,
			"subcategory": ticket.Subcategory,
			"priority":    ticket.Priority,
			"status":      ticket.Status,
			"changedBy":   actor.ID,
		}); err != nil {
			return err
		}
		if s.jobs != nil {
			_, _ = s.jobs.InsertTx(ctx, tx, domain.NotificationArgs{
				TicketID:       ticket.ID,
				EventID:        eventID,
				Kind:           "created",
				ActorID:        actor.ID,
				ActorRealm:     actor.Realm,
				RequesterID:    ticket.RequesterID,
				RequesterEmail: ticket.RequesterEmail,
				TicketNumber:   ticket.Number,
				TicketTitle:    ticket.Title,
			}, nil)
		}
		return nil
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
	attachments, err := s.q.ListAttachments(ctx, sqlcdb.ListAttachmentsParams{TicketID: id, IncludeInternal: internal})
	return t, comments, events, attachments, err
}

// Cursor positions keyset pagination after the last row of the previous page.
type Cursor struct {
	CreatedAt time.Time
	ID        string
}

// Filter narrows the IT queue.
type Filter struct {
	Status, AssigneeID, Priority, Category string
	OpenOnly                               bool
	OpenStatuses                           []string
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
		Status: f.Status, AssigneeID: f.AssigneeID, Priority: f.Priority, Category: f.Category, OpenOnly: f.OpenOnly, OpenStatuses: f.OpenStatuses,
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
		eventID, err := s.recordEvent(q, ctx, id, actor, name, &current.Status, &out.Status, map[string]any{"assigneeId": out.AssigneeID}, now)
		if err != nil {
			return err
		}
		if err := enqueueOutbox(ctx, tx, "itsm.ticket.changed", eventID, map[string]any{
			"ticketId":   out.ID,
			"number":     out.Number,
			"transition": name,
			"fromStatus": current.Status,
			"toStatus":   out.Status,
			"assigneeId": out.AssigneeID,
			"changedBy":  actor.ID,
		}); err != nil {
			return err
		}
		if s.jobs != nil {
			var assignee string
			if out.AssigneeID != nil {
				assignee = *out.AssigneeID
			}
			_, _ = s.jobs.InsertTx(ctx, tx, domain.NotificationArgs{
				TicketID:       out.ID,
				EventID:        eventID,
				Kind:           "transition",
				Detail:         out.Status,
				ActorID:        actor.ID,
				ActorRealm:     actor.Realm,
				RequesterID:    out.RequesterID,
				RequesterEmail: out.RequesterEmail,
				AssigneeID:     assignee,
				TicketNumber:   out.Number,
				TicketTitle:    out.Title,
			}, nil)
		}
		return nil
	})
	return out, err
}

// AddComment locks the ticket, runs check, stores the comment and an event. A visible IT comment is the first
// response when none was made yet.
func (s *Store) AddComment(ctx context.Context, id string, actor Actor, body string, internal, isResponse bool, attachments []domain.Attachment, now time.Time, check func(Ticket) error) (Comment, error) {
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
		commentID := uuid.NewString()
		out, err = q.InsertComment(ctx, sqlcdb.InsertCommentParams{
			ID: commentID, TicketID: id, AuthorRealm: actor.Realm, AuthorID: actor.ID, AuthorName: actor.Name,
			Body: body, Internal: internal, CreatedAt: now,
		})
		if err != nil {
			return err
		}
		for _, a := range attachments {
			if err := q.InsertAttachment(ctx, sqlcdb.InsertAttachmentParams{
				TicketID: id, FileUrl: a.FileURL, FileName: a.FileName, MimeType: a.MIMEType, FileSize: a.Size,
				AddedBy: actor.ID, CommentID: &commentID, CreatedAt: now,
			}); err != nil {
				return err
			}
		}
		var first *time.Time
		if isResponse && !internal {
			first = &now
		}
		if err := q.TouchTicket(ctx, sqlcdb.TouchTicketParams{ID: id, FirstResponseAt: first, Now: now}); err != nil {
			return err
		}
		eventID, err := s.recordEvent(q, ctx, id, actor, "comment", nil, nil, map[string]any{"internal": internal, "attachments": len(attachments)}, now)
		if err != nil {
			return err
		}
		if err := enqueueOutbox(ctx, tx, "itsm.ticket.commented", eventID, map[string]any{
			"ticketId":        current.ID,
			"number":          current.Number,
			"commentId":       commentID,
			"internal":        internal,
			"attachmentCount": len(attachments),
			"changedBy":       actor.ID,
		}); err != nil {
			return err
		}
		if s.jobs != nil && !internal {
			var assignee string
			if current.AssigneeID != nil {
				assignee = *current.AssigneeID
			}
			_, _ = s.jobs.InsertTx(ctx, tx, domain.NotificationArgs{
				TicketID:       current.ID,
				EventID:        eventID,
				Kind:           "comment",
				Detail:         body,
				ActorID:        actor.ID,
				ActorRealm:     actor.Realm,
				RequesterID:    current.RequesterID,
				RequesterEmail: current.RequesterEmail,
				AssigneeID:     assignee,
				TicketNumber:   current.Number,
				TicketTitle:    current.Title,
			}, nil)
		}
		return nil
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

// MarkBreached flags open tickets past their resolve or response deadline, records events and outbox, and returns how many.
func (s *Store) MarkBreached(ctx context.Context, now time.Time, batch int32) (int, error) {
	var rows []sqlcdb.MarkBreachedRow
	err := db.WithTx(ctx, s.pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		q := s.q.WithTx(tx)
		var err error
		rows, err = q.MarkBreached(ctx, sqlcdb.MarkBreachedParams{Now: &now, BatchSize: batch})
		if err != nil {
			return err
		}
		actor := Actor{Realm: "system", ID: "system", Name: "System"}
		for _, r := range rows {
			breachType := "resolve"
			if r.FirstResponseAt == nil && !r.RespondBy.After(now) {
				breachType = "response"
			}
			eventID, err := s.recordEvent(q, ctx, r.ID, actor, "breached", nil, nil, map[string]any{"breachType": breachType}, now)
			if err != nil {
				return err
			}
			if err := enqueueOutbox(ctx, tx, "itsm.ticket.breached", eventID, map[string]any{
				"ticketId":   r.ID,
				"number":     r.Number,
				"breachType": breachType,
				"priority":   r.Priority,
				"breachedAt": now.Format(time.RFC3339),
			}); err != nil {
				return err
			}
			if s.jobs != nil {
				var assignee string
				if r.AssigneeID != nil {
					assignee = *r.AssigneeID
				}
				_, _ = s.jobs.InsertTx(ctx, tx, domain.NotificationArgs{
					TicketID:       r.ID,
					EventID:        eventID,
					Kind:           "breached",
					Detail:         breachType,
					ActorID:        "system",
					ActorRealm:     "system",
					RequesterID:    r.RequesterID,
					RequesterEmail: r.RequesterEmail,
					AssigneeID:     assignee,
					TicketNumber:   r.Number,
					TicketTitle:    r.Title,
				}, nil)
			}
		}
		return nil
	})
	return len(rows), err
}

// CheckSLAReminders sweeps for open tickets approaching deadlines, marks them reminded, records events, and returns count.
func (s *Store) CheckSLAReminders(ctx context.Context, now time.Time, window time.Duration, batch int32) (int, error) {
	threshold := now.Add(window)
	var rows []sqlcdb.FindSLARemindersRow
	err := db.WithTx(ctx, s.pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		q := s.q.WithTx(tx)
		var err error
		rows, err = q.FindSLAReminders(ctx, sqlcdb.FindSLARemindersParams{
			Threshold: threshold,
			BatchSize: batch,
		})
		if err != nil || len(rows) == 0 {
			return err
		}
		ids := make([]string, len(rows))
		for i, r := range rows {
			ids[i] = r.ID
		}
		if err := q.MarkReminded(ctx, sqlcdb.MarkRemindedParams{Now: &now, Ids: ids}); err != nil {
			return err
		}
		actor := Actor{Realm: "system", ID: "system", Name: "System"}
		for _, r := range rows {
			reminderType := "resolve"
			if r.FirstResponseAt == nil && !r.RespondBy.After(threshold) {
				reminderType = "response"
			}
			eventID, err := s.recordEvent(q, ctx, r.ID, actor, "reminder", nil, nil, map[string]any{"reminderType": reminderType}, now)
			if err != nil {
				return err
			}
			if err := enqueueOutbox(ctx, tx, "itsm.ticket.reminded", eventID, map[string]any{
				"ticketId":     r.ID,
				"number":       r.Number,
				"reminderType": reminderType,
				"priority":     r.Priority,
				"remindedAt":   now.Format(time.RFC3339),
			}); err != nil {
				return err
			}
			if s.jobs != nil {
				var assignee string
				if r.AssigneeID != nil {
					assignee = *r.AssigneeID
				}
				_, _ = s.jobs.InsertTx(ctx, tx, domain.NotificationArgs{
					TicketID:       r.ID,
					EventID:        eventID,
					Kind:           "reminder",
					Detail:         reminderType,
					ActorID:        "system",
					ActorRealm:     "system",
					RequesterID:    r.RequesterID,
					RequesterEmail: r.RequesterEmail,
					AssigneeID:     assignee,
					TicketNumber:   r.Number,
					TicketTitle:    r.Title,
				}, nil)
			}
		}
		return nil
	})
	return len(rows), err
}
