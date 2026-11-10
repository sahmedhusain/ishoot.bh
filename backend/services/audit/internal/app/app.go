package app
import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"platform.local/backend/services/audit/internal/postgres"
	"platform.local/backend/services/audit/internal/postgres/sqlcdb"
)
var ErrNotFound = errors.New("event not found")
type Incoming struct {
	ID	string
	Subject	string
	Data	[]byte
	OccurredAt	time.Time
	Traceparent	string
	Stream		string
	Sequence	uint64
}
type Event struct {
	ID		string		`json:"id"`
	Subject		string		`json:"subject"`
	Service		string		`json:"service"`
	Entity		string		`json:"entity"`
	Verb		string		`json:"verb"`
	Actor		*string		`json:"actor"`
	OccurredAt	time.Time	`json:"occurredAt"`
	ReceivedAt	time.Time	`json:"receivedAt"`
	Payload		json.RawMessage	`json:"payload"`
	TraceID		*string		`json:"traceId"`
}
type Query struct {
	Subject, Service, Actor	string
	From, To		time.Time
	BeforeOccurred		time.Time
	BeforeID		string
	Limit			int32
}
type SubjectCount struct {
	Subject	string		`json:"subject"`
	Events	int64		`json:"events"`
	LastAt	time.Time	`json:"lastAt"`
}
type Service struct{ store *postgres.Store }
func New(store *postgres.Store) *Service	{ return &Service{store: store} }
var sequenceNamespace = uuid.MustParse("6f1c9d8e-2b7a-4e55-9a3c-0d4b8e2f7a61")
func (s *Service) Record(ctx context.Context, in Incoming) (bool, error) {
	parts := strings.Split(in.Subject, ".")
	service, entity, verb := parts[0], "", parts[len(parts)-1]
	if len(parts) > 2 {
		entity = strings.Join(parts[1:len(parts)-1], ".")
	} else if len(parts) == 1 {
		verb = ""
	}
	id := in.ID
	if _, err := uuid.Parse(id); err != nil {
		id = uuid.NewSHA1(sequenceNamespace, fmt.Appendf(nil, "%s/%d", in.Stream, in.Sequence)).String()
	}
	payload := in.Data
	var body map[string]any
	if err := json.Unmarshal(in.Data, &body); err != nil || body == nil {
		payload, _ = json.Marshal(map[string]string{"raw": string(in.Data)})
		body = nil
	}
	params := sqlcdb.InsertEventParams{
		ID:	id, Subject: in.Subject, Service: service, Entity: entity, Verb: verb,
		Actor:	actorOf(body), OccurredAt: in.OccurredAt.UTC(), Payload: payload, TraceID: traceID(in.Traceparent),
	}
	return s.store.Insert(ctx, params)
}
func actorOf(body map[string]any) *string {
	for _, key := range []string{"changedBy", "actorId", "actor"} {
		if v, ok := body[key].(string); ok && v != "" {
			return &v
		}
	}
	return nil
}
func traceID(traceparent string) *string {
	parts := strings.Split(traceparent, "-")
	if len(parts) == 4 && len(parts[1]) == 32 {
		return &parts[1]
	}
	return nil
}
func optional(v string) *string {
	if v == "" {
		return nil
	}
	return &v
}
func optionalTime(t time.Time) *time.Time {
	if t.IsZero() {
		return nil
	}
	return &t
}
func (s *Service) List(ctx context.Context, q Query) ([]Event, error) {
	rows, err := s.store.List(ctx, postgres.Filter{
		Subject:	optional(q.Subject), Service: optional(q.Service), Actor: optional(q.Actor),
		FromTime:	optionalTime(q.From), ToTime: optionalTime(q.To),
		HasCursor:	q.BeforeID != "", BeforeOccurred: q.BeforeOccurred, BeforeID: orNil(q.BeforeID), PageSize: q.Limit,
	})
	if err != nil {
		return nil, err
	}
	out := make([]Event, len(rows))
	for i, r := range rows {
		out[i] = toEvent(r)
	}
	return out, nil
}
func orNil(id string) string {
	if id == "" {
		return uuid.Nil.String()
	}
	return id
}
func (s *Service) Get(ctx context.Context, id string) (Event, error) {
	if _, err := uuid.Parse(id); err != nil {
		return Event{}, ErrNotFound
	}
	r, err := s.store.Get(ctx, id)
	if errors.Is(err, pgx.ErrNoRows) {
		return Event{}, ErrNotFound
	}
	if err != nil {
		return Event{}, err
	}
	return toEvent(r), nil
}
func (s *Service) Subjects(ctx context.Context) ([]SubjectCount, error) {
	rows, err := s.store.Subjects(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]SubjectCount, len(rows))
	for i, r := range rows {
		out[i] = SubjectCount{Subject: r.Subject, Events: r.Events, LastAt: r.LastAt.UTC()}
	}
	return out, nil
}
func toEvent(r postgres.Event) Event {
	return Event{ID: r.ID, Subject: r.Subject, Service: r.Service, Entity: r.Entity, Verb: r.Verb, Actor: r.Actor,
		OccurredAt:	r.OccurredAt.UTC(), ReceivedAt: r.ReceivedAt.UTC(), Payload: r.Payload, TraceID: r.TraceID}
}
