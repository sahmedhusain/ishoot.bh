// Package app holds the itsm use cases for the two kinds of caller: employees (through the admin app, acting for
// the requester) and IT staff (with their own IT-realm tokens).
package app

import (
	"context"
	"slices"
	"strings"
	"time"
	"unicode/utf8"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/catalog"
	"platform.local/backend/services/itsm/internal/domain"
	"platform.local/backend/services/itsm/internal/postgres"
)

// Options are the service's settings.
type Options struct {
	Limits        domain.Limits
	ITDisplayName string // shown to requesters as the author of IT comments
	BreachBatch   int32  // tickets marked per SLA sweep round
}

// Service implements the use cases.
type Service struct {
	store *postgres.Store
	opts  Options
	now   func() time.Time
}

// New returns the service.
func New(store *postgres.Store, opts Options) *Service {
	return &Service{store: store, opts: opts, now: func() time.Time { return time.Now().UTC() }}
}

// Requester identifies the employee a request is made for. The calling app has already authenticated them.
type Requester struct{ ID, Name string }

func (r Requester) actor() postgres.Actor {
	return postgres.Actor{Realm: string(authn.RealmStaff), ID: r.ID, Name: r.Name}
}

func itActor(p authn.Principal, name string) postgres.Actor {
	return postgres.Actor{Realm: string(authn.RealmIT), ID: p.Subject, Name: name}
}

// Detail is a ticket with its history.
type Detail struct {
	Ticket      postgres.Ticket
	Comments    []postgres.Comment
	Events      []postgres.Event
	Attachments []postgres.Attachment
}

func validBody(body string) (string, error) {
	body = strings.TrimSpace(body)
	if n := utf8.RuneCountInString(body); n < 1 || n > 10000 || !utf8.ValidString(body) {
		return "", &domain.ValidationError{Field: "body", Code: "length"}
	}
	return body, nil
}

// Create opens a ticket for an employee.
func (s *Service) Create(ctx context.Context, n domain.NewTicket) (postgres.Ticket, error) {
	if err := n.Normalize(s.opts.Limits); err != nil {
		return postgres.Ticket{}, err
	}
	return s.store.Create(ctx, n, Requester{ID: n.RequesterID, Name: n.RequesterName}.actor(), s.now())
}

// ListMine returns a page of the requester's tickets.
func (s *Service) ListMine(ctx context.Context, requester, status string, c *postgres.Cursor, size int32) ([]postgres.Ticket, error) {
	if status != "" && !slices.Contains(catalog.Tickets.Statuses, status) {
		return nil, &domain.ValidationError{Field: "status", Code: "oneof"}
	}
	return s.store.ListForRequester(ctx, requester, status, c, size)
}

// GetMine returns a ticket only to its requester, without internal comments.
func (s *Service) GetMine(ctx context.Context, id, requester string) (Detail, error) {
	t, comments, events, attachments, err := s.store.Detail(ctx, id, false)
	if err != nil {
		return Detail{}, err
	}
	if t.RequesterID != requester {
		return Detail{}, domain.ErrNotFound
	}
	return Detail{Ticket: t, Comments: comments, Events: events, Attachments: attachments}, nil
}

func ownedBy(requester string) func(postgres.Ticket) error {
	return func(t postgres.Ticket) error {
		if t.RequesterID != requester {
			return domain.ErrNotFound
		}
		return nil
	}
}

// CommentAsRequester adds the requester's reply while the ticket is not closed.
func (s *Service) CommentAsRequester(ctx context.Context, id string, r Requester, body string) (postgres.Comment, error) {
	body, err := validBody(body)
	if err != nil {
		return postgres.Comment{}, err
	}
	return s.store.AddComment(ctx, id, r.actor(), body, false, false, s.now(), func(t postgres.Ticket) error {
		if err := ownedBy(r.ID)(t); err != nil {
			return err
		}
		if t.ClosedAt != nil {
			return domain.ErrTransition
		}
		return nil
	})
}

// TransitionAsRequester applies one of the requester's transitions (provide info, reopen, close, cancel).
func (s *Service) TransitionAsRequester(ctx context.Context, id string, r Requester, transition string) (postgres.Ticket, error) {
	now := s.now()
	return s.store.Transition(ctx, id, r.actor(), transition, now, func(t postgres.Ticket) (domain.State, error) {
		if err := ownedBy(r.ID)(t); err != nil {
			return domain.State{}, err
		}
		return domain.Apply(state(t), transition, true, "", "", now)
	})
}

func state(t postgres.Ticket) domain.State {
	return domain.State{Status: t.Status, AssigneeID: t.AssigneeID, AssigneeName: t.AssigneeName,
		FirstResponseAt: t.FirstResponseAt, ResolvedAt: t.ResolvedAt, ClosedAt: t.ClosedAt}
}

// Queue returns a page of the IT queue.
func (s *Service) Queue(ctx context.Context, f postgres.Filter, c *postgres.Cursor, size int32) ([]postgres.Ticket, error) {
	if f.Status != "" && !slices.Contains(catalog.Tickets.Statuses, f.Status) {
		return nil, &domain.ValidationError{Field: "status", Code: "oneof"}
	}
	if f.Priority != "" && !slices.Contains(catalog.Tickets.Priorities, f.Priority) {
		return nil, &domain.ValidationError{Field: "priority", Code: "oneof"}
	}
	f.OpenStatuses = catalog.Tickets.OpenStatuses
	return s.store.ListQueue(ctx, f, c, size)
}

// Detail returns a ticket with internal comments, for IT.
func (s *Service) Detail(ctx context.Context, id string) (Detail, error) {
	t, comments, events, attachments, err := s.store.Detail(ctx, id, true)
	return Detail{Ticket: t, Comments: comments, Events: events, Attachments: attachments}, err
}

// TransitionAsIT applies any catalogue transition for IT staff.
func (s *Service) TransitionAsIT(ctx context.Context, id string, p authn.Principal, transition, assigneeID, assigneeName string) (postgres.Ticket, error) {
	now := s.now()
	return s.store.Transition(ctx, id, itActor(p, s.opts.ITDisplayName), transition, now, func(t postgres.Ticket) (domain.State, error) {
		return domain.Apply(state(t), transition, false, strings.TrimSpace(assigneeID), strings.TrimSpace(assigneeName), now)
	})
}

// CommentAsIT adds a reply visible to the requester, or an internal note.
func (s *Service) CommentAsIT(ctx context.Context, id string, p authn.Principal, body string, internal bool) (postgres.Comment, error) {
	body, err := validBody(body)
	if err != nil {
		return postgres.Comment{}, err
	}
	return s.store.AddComment(ctx, id, itActor(p, s.opts.ITDisplayName), body, internal, true, s.now(), func(postgres.Ticket) error { return nil })
}

// SLA returns the SLA policies.
func (s *Service) SLA(ctx context.Context) ([]postgres.SLAPolicy, error) { return s.store.ListSLA(ctx) }

// UpdateSLA changes one SLA policy; existing tickets keep their deadlines.
func (s *Service) UpdateSLA(ctx context.Context, p authn.Principal, policy domain.Policy) error {
	if err := policy.Validate(); err != nil {
		return err
	}
	return s.store.UpdateSLA(ctx, policy, p.Subject, s.now())
}

// MarkBreached flags open tickets past their resolve deadline, in batches until none are left, and returns how many.
func (s *Service) MarkBreached(ctx context.Context) (int, error) {
	total := 0
	for {
		n, err := s.store.MarkBreached(ctx, s.now(), s.opts.BreachBatch)
		if err != nil {
			return total, err
		}
		total += n
		if n < int(s.opts.BreachBatch) {
			return total, nil
		}
	}
}
