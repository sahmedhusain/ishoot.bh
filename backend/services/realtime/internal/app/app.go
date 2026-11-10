package app
import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"slices"
	"strings"
	"time"
	"unicode/utf8"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"platform.local/backend/pkg/catalog"
	"platform.local/backend/pkg/live"
	"platform.local/backend/services/realtime/internal/postgres"
	"platform.local/backend/services/realtime/internal/postgres/sqlcdb"
	"platform.local/backend/services/realtime/internal/presence"
)
var (
	ErrValidation	= errors.New("validation failed")
	ErrNotFound	= errors.New("not found")
)
func invalid(format string, args ...any) error {
	return fmt.Errorf("%w: %s", ErrValidation, fmt.Sprintf(format, args...))
}
const HintPresence = "presence.changed"
func PresenceTopic(realm string) string	{ return "presence." + realm }
const (
	SourceManual		= "manual"
	SourceLeave		= "leave"
	SourceCalendar		= "calendar"
	SourceConnection	= "connection"
)
const (
	ConnOnline	= "online"
	ConnIdle	= "idle"
	ConnOffline	= "offline"
)
const (
	maxWindowLength	= 366 * 24 * time.Hour
	maxWindowUsers	= 500
)
var sourcePattern = regexp.MustCompile(`^[a-z][a-z0-9_]{0,31}$`)
type Presence struct {
	UserID		string		`json:"userId"`
	Status		string		`json:"status"`
	Source		string		`json:"source"`
	Connection	string		`json:"connection"`
	Message		*string		`json:"message"`
	Until		*time.Time	`json:"until"`
	LastSeenAt	*time.Time	`json:"lastSeenAt"`
}
type Chosen struct {
	Status		string		`json:"status"`
	Message		*string		`json:"message"`
	ExpiresAt	*time.Time	`json:"expiresAt"`
}
type Window struct {
	Kind		string		`json:"kind"`
	Status		string		`json:"status"`
	Source		string		`json:"source"`
	StartsAt	time.Time	`json:"startsAt"`
	EndsAt		time.Time	`json:"endsAt"`
}
type Mine struct {
	Presence	Presence	`json:"presence"`
	Chosen		*Chosen		`json:"chosen"`
	Upcoming	[]Window	`json:"upcoming"`
}
type WindowInput struct {
	SourceID	string
	Kind		string
	StartsAt	time.Time
	EndsAt		time.Time
	UserIDs		[]string
}
type Service struct {
	store	*postgres.Store
	tracker	presence.Tracker
	live	live.Publisher
	now	func() time.Time
}
func New(store *postgres.Store, tracker presence.Tracker, publisher live.Publisher) *Service {
	return &Service{store: store, tracker: tracker, live: publisher, now: func() time.Time { return time.Now().UTC() }}
}
func checkUser(realm, id string) error {
	if !live.ValidRealm(realm) || !live.ValidID(id) {
		return invalid("realm must be staff or it, with a user ID")
	}
	return nil
}
func (s *Service) announce(ctx context.Context, realm string, ids ...string) {
	if len(ids) == 0 {
		if ev, err := live.New(HintPresence, map[string]string{}); err == nil {
			_ = s.live.ToTopic(ctx, PresenceTopic(realm), ev)
		}
		return
	}
	for _, id := range ids {
		if ev, err := live.New(HintPresence, map[string]string{"userId": id}); err == nil {
			_ = s.live.ToTopic(ctx, PresenceTopic(realm), ev)
		}
	}
}
func statusTone(key string) string {
	st, _ := catalog.Presence.Status(key)
	return st.Tone
}
func resolve(id string, chosen *sqlcdb.RealtimeStatus, windows []sqlcdb.RealtimeStatusWindow, conn presence.Connection) Presence {
	p := Presence{UserID: id, Connection: ConnOffline, LastSeenAt: conn.LastSeen}
	if conn.Online {
		p.Connection = ConnOnline
		if conn.Idle {
			p.Connection = ConnIdle
		}
	}
	var leave, meeting *sqlcdb.RealtimeStatusWindow
	for i := range windows {
		w := &windows[i]
		status, _ := catalog.Presence.WindowStatus(w.Kind)
		switch {
		case statusTone(status) == "leave" && leave == nil:
			leave = w
		case statusTone(status) != "leave" && meeting == nil:
			meeting = w
		}
	}
	if chosen != nil {
		p.Message = chosen.Message
	}
	offline := catalog.Presence.Automatic("disconnected")
	switch {
	case chosen != nil && chosen.Status == offline:
		p.Status, p.Source, p.Until = offline, SourceManual, chosen.ExpiresAt
		p.Connection, p.LastSeenAt = ConnOffline, nil
	case chosen != nil && statusTone(chosen.Status) == "leave":
		p.Status, p.Source, p.Until = chosen.Status, SourceManual, chosen.ExpiresAt
	case leave != nil:
		status, _ := catalog.Presence.WindowStatus(leave.Kind)
		p.Status, p.Source, p.Until = status, SourceLeave, &leave.EndsAt
	case chosen != nil && conn.Online:
		p.Status, p.Source, p.Until = chosen.Status, SourceManual, chosen.ExpiresAt
	case meeting != nil:
		status, _ := catalog.Presence.WindowStatus(meeting.Kind)
		p.Status, p.Source, p.Until = status, SourceCalendar, &meeting.EndsAt
	case conn.Online && conn.Idle:
		p.Status, p.Source = catalog.Presence.Automatic("idle"), SourceConnection
	case conn.Online:
		p.Status, p.Source = catalog.Presence.Automatic("connected"), SourceConnection
	default:
		p.Status, p.Source = offline, SourceConnection
	}
	return p
}
func (s *Service) Presence(ctx context.Context, realm string, ids []string) ([]Presence, error) {
	if !live.ValidRealm(realm) {
		return nil, invalid("realm must be staff or it")
	}
	unique := make([]string, 0, len(ids))
	for _, id := range ids {
		if !live.ValidID(id) {
			return nil, invalid("ids must be user IDs")
		}
		if !slices.Contains(unique, id) {
			unique = append(unique, id)
		}
	}
	if len(unique) == 0 {
		return []Presence{}, nil
	}
	now := s.now()
	chosen, err := s.store.StatusesFor(ctx, sqlcdb.StatusesForParams{Realm: realm, Users: unique, Now: &now})
	if err != nil {
		return nil, err
	}
	windows, err := s.store.ActiveWindowsFor(ctx, sqlcdb.ActiveWindowsForParams{Realm: realm, Users: unique, Now: now})
	if err != nil {
		return nil, err
	}
	states, err := s.tracker.States(ctx, realm, unique)
	if err != nil {
		return nil, err
	}
	byUser := map[string]*sqlcdb.RealtimeStatus{}
	for i := range chosen {
		byUser[chosen[i].UserID] = &chosen[i]
	}
	windowsOf := map[string][]sqlcdb.RealtimeStatusWindow{}
	for _, w := range windows {
		windowsOf[w.UserID] = append(windowsOf[w.UserID], w)
	}
	out := make([]Presence, 0, len(unique))
	for _, id := range unique {
		out = append(out, resolve(id, byUser[id], windowsOf[id], states[id]))
	}
	return out, nil
}
func (s *Service) Mine(ctx context.Context, realm, id string) (Mine, error) {
	if err := checkUser(realm, id); err != nil {
		return Mine{}, err
	}
	all, err := s.Presence(ctx, realm, []string{id})
	if err != nil {
		return Mine{}, err
	}
	out := Mine{Presence: all[0], Upcoming: []Window{}}
	now := s.now()
	chosen, err := s.store.GetStatus(ctx, sqlcdb.GetStatusParams{Realm: realm, UserID: id})
	switch {
	case err == nil:
		if chosen.ExpiresAt == nil || chosen.ExpiresAt.After(now) {
			out.Chosen = &Chosen{Status: chosen.Status, Message: chosen.Message, ExpiresAt: chosen.ExpiresAt}
		}
	case !errors.Is(err, pgx.ErrNoRows):
		return Mine{}, err
	}
	upcoming, err := s.store.UpcomingWindows(ctx, sqlcdb.UpcomingWindowsParams{Realm: realm, UserID: id, Now: now, Until: now.Add(7 * 24 * time.Hour)})
	if err != nil {
		return Mine{}, err
	}
	for _, w := range upcoming {
		status, _ := catalog.Presence.WindowStatus(w.Kind)
		out.Upcoming = append(out.Upcoming, Window{Kind: w.Kind, Status: status, Source: w.Source, StartsAt: w.StartsAt, EndsAt: w.EndsAt})
	}
	return out, nil
}
func (s *Service) SetStatus(ctx context.Context, realm, id string, in Chosen) (Mine, error) {
	if err := checkUser(realm, id); err != nil {
		return Mine{}, err
	}
	status, ok := catalog.Presence.Status(in.Status)
	if !ok || !status.Manual {
		return Mine{}, invalid("status %q cannot be chosen", in.Status)
	}
	var message *string
	if in.Message != nil {
		m := strings.TrimSpace(strings.ReplaceAll(*in.Message, "\n", " "))
		if utf8.RuneCountInString(m) > catalog.Presence.MessageMaxLength {
			return Mine{}, invalid("the message has up to %d characters", catalog.Presence.MessageMaxLength)
		}
		if m != "" {
			message = &m
		}
	}
	now := s.now()
	if in.ExpiresAt != nil && !in.ExpiresAt.After(now) {
		return Mine{}, invalid("expiresAt must be in the future")
	}
	var expires *time.Time
	if in.ExpiresAt != nil {
		e := in.ExpiresAt.UTC()
		expires = &e
	}
	if err := s.store.UpsertStatus(ctx, sqlcdb.UpsertStatusParams{Realm: realm, UserID: id, Status: in.Status,
		Message:	message, ExpiresAt: expires, Now: now}); err != nil {
		return Mine{}, err
	}
	s.announce(ctx, realm, id)
	return s.Mine(ctx, realm, id)
}
func (s *Service) ClearStatus(ctx context.Context, realm, id string) (Mine, error) {
	if err := checkUser(realm, id); err != nil {
		return Mine{}, err
	}
	if _, err := s.store.DeleteStatus(ctx, sqlcdb.DeleteStatusParams{Realm: realm, UserID: id}); err != nil {
		return Mine{}, err
	}
	s.announce(ctx, realm, id)
	return s.Mine(ctx, realm, id)
}
func (s *Service) SetActivity(ctx context.Context, realm, id string, idle bool) error {
	if err := checkUser(realm, id); err != nil {
		return err
	}
	before, err := s.tracker.States(ctx, realm, []string{id})
	if err != nil {
		return err
	}
	if err := s.tracker.SetIdle(ctx, realm, id, idle); err != nil {
		return err
	}
	if before[id].Idle != idle {
		s.announce(ctx, realm, id)
	}
	return nil
}
func (s *Service) Connected(ctx context.Context, realm, id string, first bool) error {
	before, err := s.tracker.States(ctx, realm, []string{id})
	if err != nil {
		return err
	}
	if err := s.tracker.Online(ctx, realm, id); err != nil {
		return err
	}
	if first && !before[id].Online {
		s.announce(ctx, realm, id)
	}
	return nil
}
func (s *Service) Disconnected(ctx context.Context, realm, id string) error {
	if err := s.tracker.Offline(ctx, realm, id); err != nil {
		return err
	}
	after, err := s.tracker.States(ctx, realm, []string{id})
	if err != nil {
		return err
	}
	if !after[id].Online {
		s.announce(ctx, realm, id)
	}
	return nil
}
func (s *Service) checkWindow(realm, source string, w WindowInput) error {
	if !live.ValidRealm(realm) || !sourcePattern.MatchString(source) {
		return invalid("realm must be staff or it, with a source of lower-case letters")
	}
	if w.SourceID == "" || len(w.SourceID) > 100 {
		return invalid("sourceId must have 1 to 100 characters")
	}
	if _, ok := catalog.Presence.WindowStatus(w.Kind); !ok {
		return invalid("unknown window kind %q", w.Kind)
	}
	if !w.EndsAt.After(w.StartsAt) || w.EndsAt.Sub(w.StartsAt) > maxWindowLength {
		return invalid("a window ends after it starts and lasts at most a year")
	}
	if len(w.UserIDs) > maxWindowUsers {
		return invalid("at most %d people per window", maxWindowUsers)
	}
	for _, id := range w.UserIDs {
		if !live.ValidID(id) {
			return invalid("userIds must be user IDs")
		}
	}
	return nil
}
func upsertWindow(ctx context.Context, q *sqlcdb.Queries, realm, source string, w WindowInput, now time.Time) error {
	for _, id := range w.UserIDs {
		if err := q.UpsertWindow(ctx, sqlcdb.UpsertWindowParams{ID: uuid.NewString(), Realm: realm, UserID: id, Source: source,
			SourceID:	w.SourceID, Kind: w.Kind, StartsAt: w.StartsAt.UTC(), EndsAt: w.EndsAt.UTC(), Now: now}); err != nil {
			return err
		}
	}
	return nil
}
func (s *Service) RemoveWindow(ctx context.Context, realm, source, sourceID string) error {
	if !live.ValidRealm(realm) || !sourcePattern.MatchString(source) || sourceID == "" || len(sourceID) > 100 {
		return invalid("realm, source and sourceId are required")
	}
	removed, err := s.store.DeleteWindowsExcept(ctx, sqlcdb.DeleteWindowsExceptParams{Realm: realm, Source: source, SourceID: sourceID, Keep: []string{}})
	if err != nil {
		return err
	}
	if len(removed) == 0 {
		return ErrNotFound
	}
	s.announce(ctx, realm, removed...)
	return nil
}
func (s *Service) ReplaceWindow(ctx context.Context, realm, source string, w WindowInput) error {
	if err := s.checkWindow(realm, source, w); err != nil {
		return err
	}
	if len(w.UserIDs) == 0 {
		return invalid("name the window's people, or remove the window")
	}
	var affected []string
	err := s.store.Tx(ctx, func(q *sqlcdb.Queries) error {
		removed, err := q.DeleteWindowsExcept(ctx, sqlcdb.DeleteWindowsExceptParams{Realm: realm, Source: source, SourceID: w.SourceID, Keep: nonNil(w.UserIDs)})
		if err != nil {
			return err
		}
		affected = append(append(affected[:0], removed...), w.UserIDs...)
		return upsertWindow(ctx, q, realm, source, w, s.now())
	})
	if err != nil {
		return err
	}
	s.announce(ctx, realm, affected...)
	return nil
}
func (s *Service) SyncWindows(ctx context.Context, realm, source string, from, until time.Time, windows []WindowInput, max int) (int, error) {
	if !until.After(from) || until.Sub(from) > maxWindowLength {
		return 0, invalid("the range ends after it starts and spans at most a year")
	}
	if len(windows) > max {
		return 0, invalid("at most %d windows at a time", max)
	}
	for _, w := range windows {
		if err := s.checkWindow(realm, source, w); err != nil {
			return 0, err
		}
	}
	stored := 0
	err := s.store.Tx(ctx, func(q *sqlcdb.Queries) error {
		stored = 0
		if _, err := q.DeleteSourceRange(ctx, sqlcdb.DeleteSourceRangeParams{Realm: realm, Source: source, RangeStart: from, RangeEnd: until}); err != nil {
			return err
		}
		for _, w := range windows {
			if err := upsertWindow(ctx, q, realm, source, w, s.now()); err != nil {
				return err
			}
			stored += len(w.UserIDs)
		}
		return nil
	})
	if err != nil {
		return 0, err
	}
	s.announce(ctx, realm)
	return stored, nil
}
func nonNil(ids []string) []string {
	if ids == nil {
		return []string{}
	}
	return ids
}
func (s *Service) Tick(ctx context.Context, since, now time.Time) error {
	rows, err := s.store.Transitions(ctx, sqlcdb.TransitionsParams{Since: since, Now: now})
	if err != nil {
		return err
	}
	for _, r := range rows {
		s.announce(ctx, r.Realm, r.UserID)
	}
	return nil
}
func (s *Service) Purge(ctx context.Context, retention time.Duration) error {
	before := s.now().Add(-retention)
	if _, err := s.store.PurgeEnded(ctx, before); err != nil {
		return err
	}
	_, err := s.store.PurgeExpired(ctx, &before)
	return err
}
func (s *Service) Publish(ctx context.Context, topics []string, users []live.Target, ev live.Event) error {
	if err := ev.Validate(); err != nil {
		return invalid("%s", strings.TrimPrefix(err.Error(), live.ErrInvalid.Error()+": "))
	}
	if len(topics)+len(users) == 0 || len(topics) > 50 || len(users) > 500 {
		return invalid("name 1 to 50 topics and up to 500 people")
	}
	for _, t := range topics {
		if !live.ValidTopic(t) || strings.HasPrefix(t, "presence.") {
			return invalid("topic %q cannot be published to", t)
		}
	}
	for _, u := range users {
		if err := checkUser(u.Realm, u.ID); err != nil {
			return err
		}
	}
	for _, t := range topics {
		if err := s.live.ToTopic(ctx, t, ev); err != nil {
			return err
		}
	}
	for _, u := range users {
		if err := s.live.ToUser(ctx, u.Realm, u.ID, ev); err != nil {
			return err
		}
	}
	return nil
}
