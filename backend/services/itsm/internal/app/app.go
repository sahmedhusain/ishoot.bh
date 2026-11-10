package app
import (
	"context"
	"slices"
	"strings"
	"time"
	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/catalog"
	"platform.local/backend/services/itsm/internal/domain"
	"platform.local/backend/services/itsm/internal/postgres"
)
type Options struct {
	Limits		domain.Limits
	ITDisplayName	string
	BreachBatch	int32
	ReminderWindow	time.Duration
	ReminderBatch	int32
}
type Service struct {
	store	*postgres.Store
	opts	Options
	now	func() time.Time
}
func New(store *postgres.Store, opts Options) *Service {
	return &Service{store: store, opts: opts, now: func() time.Time { return time.Now().UTC() }}
}
func (s *Service) SetJobInserter(jobs postgres.JobInserter) {
	s.store.SetJobInserter(jobs)
}
type Requester struct{ ID, Name string }
func (r Requester) actor() postgres.Actor {
	return postgres.Actor{Realm: string(authn.RealmStaff), ID: r.ID, Name: r.Name}
}
func itActor(p authn.Principal, name string) postgres.Actor {
	return postgres.Actor{Realm: string(authn.RealmIT), ID: p.Subject, Name: name}
}
type Detail struct {
	Ticket		postgres.Ticket
	Comments	[]postgres.Comment
	Events		[]postgres.Event
	Attachments	[]postgres.Attachment
}
func (s *Service) Create(ctx context.Context, n domain.NewTicket) (postgres.Ticket, error) {
	if err := n.Normalize(s.opts.Limits); err != nil {
		return postgres.Ticket{}, err
	}
	return s.store.Create(ctx, n, Requester{ID: n.RequesterID, Name: n.RequesterName}.actor(), s.now())
}
func (s *Service) ListMine(ctx context.Context, requester, status string, c *postgres.Cursor, size int32) ([]postgres.Ticket, error) {
	if status != "" && !slices.Contains(catalog.Tickets.Statuses, status) {
		return nil, &domain.ValidationError{Field: "status", Code: "oneof"}
	}
	return s.store.ListForRequester(ctx, requester, status, c, size)
}
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
func (s *Service) CommentAsRequester(ctx context.Context, id string, r Requester, c domain.NewComment) (postgres.Comment, error) {
	c.Internal = false
	if err := c.Normalize(s.opts.Limits); err != nil {
		return postgres.Comment{}, err
	}
	return s.store.AddComment(ctx, id, r.actor(), c.Body, false, false, c.Attachments, s.now(), func(t postgres.Ticket) error {
		if err := ownedBy(r.ID)(t); err != nil {
			return err
		}
		if t.ClosedAt != nil {
			return domain.ErrTransition
		}
		return nil
	})
}
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
		FirstResponseAt:	t.FirstResponseAt, ResolvedAt: t.ResolvedAt, ClosedAt: t.ClosedAt}
}
func (s *Service) Queue(ctx context.Context, f postgres.Filter, c *postgres.Cursor, size int32) ([]postgres.Ticket, error) {
	if f.Status != "" && !slices.Contains(catalog.Tickets.Statuses, f.Status) {
		return nil, &domain.ValidationError{Field: "status", Code: "oneof"}
	}
	if f.Priority != "" && !slices.Contains(catalog.Tickets.Priorities, f.Priority) {
		return nil, &domain.ValidationError{Field: "priority", Code: "oneof"}
	}
	if f.Category != "" {
		if _, ok := catalog.Tickets.Category(f.Category); !ok {
			return nil, &domain.ValidationError{Field: "category", Code: "oneof"}
		}
	}
	f.OpenStatuses = catalog.Tickets.OpenStatuses
	return s.store.ListQueue(ctx, f, c, size)
}
func (s *Service) Detail(ctx context.Context, id string) (Detail, error) {
	t, comments, events, attachments, err := s.store.Detail(ctx, id, true)
	return Detail{Ticket: t, Comments: comments, Events: events, Attachments: attachments}, err
}
func (s *Service) TransitionAsIT(ctx context.Context, id string, p authn.Principal, transition, assigneeID, assigneeName string) (postgres.Ticket, error) {
	now := s.now()
	return s.store.Transition(ctx, id, itActor(p, s.opts.ITDisplayName), transition, now, func(t postgres.Ticket) (domain.State, error) {
		return domain.Apply(state(t), transition, false, strings.TrimSpace(assigneeID), strings.TrimSpace(assigneeName), now)
	})
}
func (s *Service) CommentAsIT(ctx context.Context, id string, p authn.Principal, c domain.NewComment) (postgres.Comment, error) {
	if err := c.Normalize(s.opts.Limits); err != nil {
		return postgres.Comment{}, err
	}
	return s.store.AddComment(ctx, id, itActor(p, s.opts.ITDisplayName), c.Body, c.Internal, true, c.Attachments, s.now(), func(postgres.Ticket) error { return nil })
}
func (s *Service) Stats(ctx context.Context) (postgres.Stats, error) {
	return s.store.QueueStats(ctx, catalog.Tickets.OpenStatuses)
}
func (s *Service) SLA(ctx context.Context) ([]postgres.SLAPolicy, error)	{ return s.store.ListSLA(ctx) }
func (s *Service) UpdateSLA(ctx context.Context, p authn.Principal, policy domain.Policy) error {
	if err := policy.Validate(); err != nil {
		return err
	}
	return s.store.UpdateSLA(ctx, policy, p.Subject, s.now())
}
func (s *Service) MarkBreached(ctx context.Context) (int, error) {
	total := 0
	batch := s.opts.BreachBatch
	if batch <= 0 {
		batch = 200
	}
	for {
		n, err := s.store.MarkBreached(ctx, s.now(), batch)
		if err != nil {
			return total, err
		}
		total += n
		if n < int(batch) {
			return total, nil
		}
	}
}
func (s *Service) CheckSLAReminders(ctx context.Context) (int, error) {
	window := s.opts.ReminderWindow
	if window <= 0 {
		window = time.Hour
	}
	batch := s.opts.ReminderBatch
	if batch <= 0 {
		batch = 200
	}
	return s.store.CheckSLAReminders(ctx, s.now(), window, batch)
}
