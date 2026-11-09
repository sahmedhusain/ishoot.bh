package app

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"slices"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/riverqueue/river"
	"github.com/riverqueue/river/rivertype"

	"platform.local/backend/pkg/catalog"
	"platform.local/backend/pkg/live"
	"platform.local/backend/services/notify/internal/postgres/sqlcdb"
)

// Hints the inbox sends to the person's browsers (ADR 0012); they carry IDs and counts only.
const (
	HintCreated     = "notification.created"
	HintChanged     = "notification.changed"
	HintPreferences = "notification.preferences"
)

// Limits on what an in-app notification may carry.
const (
	maxTitle       = 300
	maxBody        = 2000
	maxParams      = 30
	maxParamKey    = 64
	maxParamValue  = 1000
	maxActionURL   = 1000
	maxEntityField = 100
	maxDedupeKey   = 200
	// MaxBatch is the most notifications one call may deliver.
	MaxBatch = 500
	// MaxActionIDs is the most notifications one action may name.
	MaxActionIDs = 500
)

// MutedForever is stored as mutedUntil when everything is muted until the person turns it back on.
var MutedForever = time.Date(9999, time.December, 31, 0, 0, 0, 0, time.UTC)

var messageKeyPattern = regexp.MustCompile(`^[A-Za-z0-9_.-]{1,200}$`)

// Inbox filters.
const (
	FilterAll      = "all"
	FilterUnread   = "unread"
	FilterRead     = "read"
	FilterArchived = "archived"
	FilterMuted    = "muted"
)

// Filters lists every inbox filter.
var Filters = []string{FilterAll, FilterUnread, FilterRead, FilterArchived, FilterMuted}

// Actions on notifications.
var Actions = []string{"read", "unread", "archive", "unarchive", "delete"}

// DueArgs announces a scheduled notification when its time comes (River job, ADR 0004).
type DueArgs struct {
	ID string `json:"id"`
}

// Kind names the job in River's tables.
func (DueArgs) Kind() string { return "notify.inbox_due" }

// InsertOpts keeps one pending announcement per notification.
func (DueArgs) InsertOpts() river.InsertOpts {
	return river.InsertOpts{Queue: Queue, UniqueOpts: river.UniqueOpts{ByArgs: true, ByState: []rivertype.JobState{
		rivertype.JobStateAvailable, rivertype.JobStatePending, rivertype.JobStateRunning,
		rivertype.JobStateRetryable, rivertype.JobStateScheduled,
	}}}
}

// PurgeArgs removes read and archived notifications past the retention (periodic River job).
type PurgeArgs struct{}

// Kind names the job in River's tables.
func (PurgeArgs) Kind() string { return "notify.inbox_purge" }

// InsertOpts runs purges on the notify queue.
func (PurgeArgs) InsertOpts() river.InsertOpts { return river.InsertOpts{Queue: Queue} }

// NewNotification is one notification to deliver to one person.
type NewNotification struct {
	// ID is generated when empty; the Prisma hand-over passes its row ID so a resend changes nothing.
	ID            string
	Realm         string
	Recipient     string
	Category      string
	Priority      string
	Title         string
	Body          string
	MessageKey    string
	MessageParams map[string]string
	ActionURL     string
	EntityType    string
	EntityID      string
	ActorID       string
	// DedupeKey makes a repeat for the same person a no-op (an event key such as "announcement:42").
	DedupeKey string
	// DeliverAt shows it later (a reminder); empty means now.
	DeliverAt *time.Time
	// CreatedAt, ReadAt and ArchivedAt carry an earlier notification's state when it is handed over.
	CreatedAt  *time.Time
	ReadAt     *time.Time
	ArchivedAt *time.Time
}

// DeliverResult says what a delivery stored.
type DeliverResult struct {
	Created    int      `json:"created"`
	Duplicates int      `json:"duplicates"`
	IDs        []string `json:"ids"`
}

// Owner is whose inbox an action is for, with the categories they may see.
type Owner struct {
	Realm      string
	UserID     string
	Categories []string
}

// InboxItem is a notification as its recipient sees it.
type InboxItem struct {
	ID            string            `json:"id"`
	Category      string            `json:"category"`
	Priority      string            `json:"priority"`
	Title         string            `json:"title"`
	Body          string            `json:"body"`
	MessageKey    *string           `json:"messageKey"`
	MessageParams map[string]string `json:"messageParams"`
	ActionURL     *string           `json:"actionUrl"`
	EntityType    *string           `json:"entityType"`
	EntityID      *string           `json:"entityId"`
	ActorID       *string           `json:"actorId"`
	Silent        bool              `json:"silent"`
	Read          bool              `json:"read"`
	Archived      bool              `json:"archived"`
	CreatedAt     time.Time         `json:"createdAt"`
	ReadAt        *time.Time        `json:"readAt"`
}

// InboxQuery selects a page of the inbox.
type InboxQuery struct {
	Filter   string
	Category string
	Limit    int32
	// BeforeAt and BeforeID continue after the last item of the previous page.
	BeforeAt time.Time
	BeforeID string
}

// InboxPage is one page with the unread count across the whole inbox.
type InboxPage struct {
	Items  []InboxItem
	Unread int64
}

// Summary counts unread notifications (muted ones excluded).
type Summary struct {
	Unread     int64            `json:"unread"`
	ByCategory map[string]int64 `json:"byCategory"`
}

// InboxAction changes notifications: the ones named, or every one the filter (and category) selects.
type InboxAction struct {
	Action   string
	IDs      []string
	All      bool
	Filter   string
	Category string
}

// CategorySetting is one category's setting for a person.
type CategorySetting struct {
	Category  string `json:"category"`
	Muted     bool   `json:"muted"`
	Sound     bool   `json:"sound"`
	Mandatory bool   `json:"mandatory"`
}

// Preferences are a person's notification settings.
type Preferences struct {
	MutedUntil     *time.Time        `json:"mutedUntil"`
	SoundEnabled   bool              `json:"soundEnabled"`
	Sound          string            `json:"sound"`
	Volume         int               `json:"volume"`
	PopupsEnabled  bool              `json:"popupsEnabled"`
	DesktopEnabled bool              `json:"desktopEnabled"`
	Categories     []CategorySetting `json:"categories"`
}

// Mute is a record the person muted.
type Mute struct {
	EntityType string     `json:"entityType"`
	EntityID   string     `json:"entityId"`
	Until      *time.Time `json:"until"`
	CreatedAt  time.Time  `json:"createdAt"`
}

// SetLive sets where hints go (the API and the worker connect to NATS after building the service).
func (s *Service) SetLive(p live.Publisher) { s.live = p }

// SetLiveWindow sets how old a delivered notification may be and still be announced live: the hand-over of old
// notifications must not ring for each of them.
func (s *Service) SetLiveWindow(d time.Duration) { s.liveWindow = d }

func clean(s string) string {
	return strings.TrimSpace(strings.Map(func(r rune) rune {
		if unicode.IsControl(r) && r != '\n' {
			return -1
		}
		return r
	}, s))
}

// validRecipient keeps IDs usable as hint subjects.
func validRecipient(realm, id string) bool {
	return slices.Contains(catalog.Notifications.Realms, realm) && live.ValidID(id)
}

func (s *Service) normalizeNotification(n NewNotification) (NewNotification, error) {
	if n.ID != "" {
		if _, err := uuid.Parse(n.ID); err != nil {
			return n, invalid("id must be a UUID")
		}
	}
	if !validRecipient(n.Realm, n.Recipient) {
		return n, invalid("realm must be staff or it, with a recipient ID")
	}
	n.MessageKey = strings.TrimSpace(n.MessageKey)
	if n.MessageKey != "" && !messageKeyPattern.MatchString(n.MessageKey) {
		return n, invalid("messageKey may hold letters, digits, '.', '_' and '-' only")
	}
	n.EntityType, n.EntityID = strings.TrimSpace(n.EntityType), strings.TrimSpace(n.EntityID)
	if len(n.EntityType) > maxEntityField || len(n.EntityID) > maxEntityField {
		return n, invalid("entityType and entityId have up to %d characters", maxEntityField)
	}
	if n.Category == "" {
		n.Category = catalog.Notifications.CategoryFor(n.Realm, n.MessageKey, n.EntityType)
	}
	category, ok := catalog.Notifications.Category(n.Category)
	if !ok || !category.InRealm(n.Realm) {
		return n, invalid("unknown category %q for realm %s", n.Category, n.Realm)
	}
	if n.Priority == "" {
		n.Priority = category.Priority
	}
	if !slices.Contains(catalog.Notifications.Priorities, n.Priority) {
		return n, invalid("priority must be one of %s", strings.Join(catalog.Notifications.Priorities, ", "))
	}
	n.Title, n.Body = clean(n.Title), clean(n.Body)
	if n.Title == "" || utf8.RuneCountInString(n.Title) > maxTitle {
		return n, invalid("title must have 1 to %d characters", maxTitle)
	}
	if utf8.RuneCountInString(n.Body) > maxBody {
		return n, invalid("body has up to %d characters", maxBody)
	}
	if len(n.MessageParams) > maxParams {
		return n, invalid("at most %d message params", maxParams)
	}
	for k, v := range n.MessageParams {
		if k == "" || len(k) > maxParamKey || utf8.RuneCountInString(v) > maxParamValue {
			return n, invalid("message param %q is too long", k)
		}
	}
	n.ActionURL = strings.TrimSpace(n.ActionURL)
	if n.ActionURL != "" && (!strings.HasPrefix(n.ActionURL, "/") || strings.HasPrefix(n.ActionURL, "//") ||
		strings.ContainsAny(n.ActionURL, "\\\r\n\t") || len(n.ActionURL) > maxActionURL) {
		return n, invalid("actionUrl must be a path in the app, starting with one /")
	}
	if len(n.ActorID) > maxActor {
		return n, invalid("actorId is too long")
	}
	if len(n.DedupeKey) > maxDedupeKey {
		return n, invalid("dedupeKey has up to %d characters", maxDedupeKey)
	}
	return n, nil
}

// DeliverInApp stores in-app notifications (at most MaxBatch). A repeated ID or dedupe key for the same person is counted as a
// duplicate and changes nothing. Notifications in a category or about a record the person muted are stored silently;
// security ones never are. Fresh notifications are announced live; scheduled ones when their time comes.
func (s *Service) DeliverInApp(ctx context.Context, caller string, items []NewNotification) (DeliverResult, error) {
	if len(items) == 0 || len(items) > MaxBatch {
		return DeliverResult{}, invalid("deliver 1 to %d notifications at a time", MaxBatch)
	}
	now := s.now()
	byRealm := map[string][]string{}
	for i := range items {
		n, err := s.normalizeNotification(items[i])
		if err != nil {
			return DeliverResult{}, fmt.Errorf("%w (item %d)", err, i)
		}
		items[i] = n
		if !slices.Contains(byRealm[n.Realm], n.Recipient) {
			byRealm[n.Realm] = append(byRealm[n.Realm], n.Recipient)
		}
	}
	mutedCategories := map[string]bool{}
	mutedEntities := map[string]bool{}
	for realm, users := range byRealm {
		cats, err := s.store.MutedCategoriesFor(ctx, sqlcdb.MutedCategoriesForParams{Realm: realm, Users: users})
		if err != nil {
			return DeliverResult{}, err
		}
		for _, c := range cats {
			mutedCategories[realm+"|"+c.UserID+"|"+c.Category] = true
		}
		mutes, err := s.store.ActiveMutesFor(ctx, sqlcdb.ActiveMutesForParams{Realm: realm, Users: users, Now: &now})
		if err != nil {
			return DeliverResult{}, err
		}
		for _, m := range mutes {
			mutedEntities[realm+"|"+m.UserID+"|"+m.EntityType+"|"+m.EntityID] = true
		}
	}

	type announcement struct {
		realm, recipient string
		hint             createdHint
	}
	var (
		result DeliverResult
		fresh  []announcement
	)
	err := s.store.Tx(ctx, func(q *sqlcdb.Queries, tx pgx.Tx) error {
		result, fresh = DeliverResult{}, nil
		for _, n := range items {
			category, _ := catalog.Notifications.Category(n.Category)
			silent := !category.Mandatory && (mutedCategories[n.Realm+"|"+n.Recipient+"|"+n.Category] ||
				(n.EntityType != "" && mutedEntities[n.Realm+"|"+n.Recipient+"|"+n.EntityType+"|"+n.EntityID]))
			id := n.ID
			if id == "" {
				id = uuid.NewString()
			}
			deliverAt, createdAt := now, now
			if n.CreatedAt != nil {
				createdAt, deliverAt = n.CreatedAt.UTC(), n.CreatedAt.UTC()
			}
			if n.DeliverAt != nil {
				deliverAt = n.DeliverAt.UTC()
			}
			params, err := json.Marshal(nonNilParams(n.MessageParams))
			if err != nil {
				return err
			}
			inserted, err := q.InsertNotification(ctx, sqlcdb.InsertNotificationParams{
				ID: id, Realm: n.Realm, Recipient: n.Recipient, Category: n.Category, Priority: n.Priority,
				Title: n.Title, Body: n.Body, MessageKey: optional(n.MessageKey), MessageParams: params,
				ActionUrl: optional(n.ActionURL), EntityType: optional(n.EntityType), EntityID: optional(n.EntityID),
				Actor: optional(n.ActorID), Caller: caller, DedupeKey: optional(n.DedupeKey), Silent: silent,
				DeliverAt: deliverAt, ReadAt: utc(n.ReadAt), ArchivedAt: utc(n.ArchivedAt), CreatedAt: createdAt,
			})
			if err != nil {
				return err
			}
			if inserted == 0 {
				result.Duplicates++
				continue
			}
			result.Created++
			result.IDs = append(result.IDs, id)
			if n.ReadAt != nil || n.ArchivedAt != nil {
				continue
			}
			if deliverAt.After(now) {
				if s.jobs == nil {
					return errors.New("notify: no job inserter for a scheduled notification")
				}
				if _, err := s.jobs.InsertTx(ctx, tx, DueArgs{ID: id}, &river.InsertOpts{ScheduledAt: deliverAt}); err != nil {
					return err
				}
				continue
			}
			if now.Sub(deliverAt) <= s.liveWindow {
				fresh = append(fresh, announcement{n.Realm, n.Recipient, createdHint{ID: id, Category: n.Category, Priority: n.Priority, Silent: silent}})
			}
		}
		return nil
	})
	if err != nil {
		return DeliverResult{}, err
	}
	if result.IDs == nil {
		result.IDs = []string{}
	}
	for _, a := range fresh {
		s.hint(ctx, a.realm, a.recipient, HintCreated, a.hint)
	}
	return result, nil
}

type createdHint struct {
	ID       string `json:"id"`
	Category string `json:"category"`
	Priority string `json:"priority"`
	Silent   bool   `json:"silent"`
}

// hint sends a hint; a failure is logged by the publisher's caller only through metrics, since browsers resync.
func (s *Service) hint(ctx context.Context, realm, recipient, kind string, data any) {
	ev, err := live.New(kind, data)
	if err != nil {
		return
	}
	_ = s.live.ToUser(ctx, realm, recipient, ev)
}

// AnnounceDue announces a scheduled notification whose time has come (the worker's job).
func (s *Service) AnnounceDue(ctx context.Context, id string) error {
	n, err := s.store.GetNotification(ctx, id)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil // deleted before its time
	}
	if err != nil {
		return err
	}
	if n.ReadAt != nil || n.ArchivedAt != nil {
		return nil
	}
	s.hint(ctx, n.Realm, n.Recipient, HintCreated, createdHint{ID: n.ID, Category: n.Category, Priority: n.Priority, Silent: n.Silent})
	return nil
}

// Purge removes read and archived notifications older than retention, and expired mutes.
func (s *Service) Purge(ctx context.Context, retention time.Duration) (int64, error) {
	before := s.now().Add(-retention)
	n, err := s.store.PurgeNotifications(ctx, before)
	if err != nil {
		return 0, err
	}
	if _, err := s.store.PurgeMutes(ctx, &before); err != nil {
		return n, err
	}
	return n, nil
}

func nonNilParams(p map[string]string) map[string]string {
	if p == nil {
		return map[string]string{}
	}
	return p
}

func inboxItem(n sqlcdb.NotifyNotification) InboxItem {
	params := map[string]string{}
	_ = json.Unmarshal(n.MessageParams, &params)
	return InboxItem{
		ID: n.ID, Category: n.Category, Priority: n.Priority, Title: n.Title, Body: n.Body, MessageKey: n.MessageKey,
		MessageParams: params, ActionURL: n.ActionUrl, EntityType: n.EntityType, EntityID: n.EntityID, ActorID: n.Actor,
		Silent: n.Silent, Read: n.ReadAt != nil, Archived: n.ArchivedAt != nil, CreatedAt: n.DeliverAt, ReadAt: n.ReadAt,
	}
}

func (s *Service) checkOwner(o Owner) error {
	if !validRecipient(o.Realm, o.UserID) {
		return invalid("realm must be staff or it, with a user ID")
	}
	for _, c := range o.Categories {
		category, ok := catalog.Notifications.Category(c)
		if !ok || !category.InRealm(o.Realm) {
			return invalid("unknown category %q for realm %s", c, o.Realm)
		}
	}
	return nil
}

func (s *Service) unread(ctx context.Context, o Owner) (Summary, error) {
	rows, err := s.store.UnreadByCategory(ctx, sqlcdb.UnreadByCategoryParams{Realm: o.Realm, Recipient: o.UserID, Now: s.now(), Categories: o.Categories})
	if err != nil {
		return Summary{}, err
	}
	out := Summary{ByCategory: map[string]int64{}}
	for _, r := range rows {
		out.ByCategory[r.Category] = r.Unread
		out.Unread += r.Unread
	}
	return out, nil
}

// Inbox returns a page of the owner's notifications, newest first, with their unread count.
func (s *Service) Inbox(ctx context.Context, o Owner, q InboxQuery) (InboxPage, error) {
	if err := s.checkOwner(o); err != nil {
		return InboxPage{}, err
	}
	if q.Filter == "" {
		q.Filter = FilterAll
	}
	rows, err := s.store.ListNotifications(ctx, sqlcdb.ListNotificationsParams{
		Realm: o.Realm, Recipient: o.UserID, Now: s.now(), Categories: o.Categories, Category: optional(q.Category),
		Filter: q.Filter, HasCursor: q.BeforeID != "", BeforeAt: q.BeforeAt, BeforeID: orZeroUUID(q.BeforeID), PageSize: q.Limit,
	})
	if err != nil {
		return InboxPage{}, err
	}
	summary, err := s.unread(ctx, o)
	if err != nil {
		return InboxPage{}, err
	}
	page := InboxPage{Items: make([]InboxItem, 0, len(rows)), Unread: summary.Unread}
	for _, r := range rows {
		page.Items = append(page.Items, inboxItem(r))
	}
	return page, nil
}

func orZeroUUID(id string) string {
	if id == "" {
		return uuid.Nil.String()
	}
	return id
}

// Summary counts the owner's unread notifications by category.
func (s *Service) Summary(ctx context.Context, o Owner) (Summary, error) {
	if err := s.checkOwner(o); err != nil {
		return Summary{}, err
	}
	return s.unread(ctx, o)
}

// Notification returns one of the owner's notifications.
func (s *Service) Notification(ctx context.Context, o Owner, id string) (InboxItem, error) {
	if err := s.checkOwner(o); err != nil {
		return InboxItem{}, err
	}
	if _, err := uuid.Parse(id); err != nil {
		return InboxItem{}, ErrNotFound
	}
	n, err := s.store.OwnNotification(ctx, sqlcdb.OwnNotificationParams{ID: id, Realm: o.Realm, Recipient: o.UserID, Now: s.now(), Categories: o.Categories})
	if errors.Is(err, pgx.ErrNoRows) {
		return InboxItem{}, ErrNotFound
	}
	if err != nil {
		return InboxItem{}, err
	}
	return inboxItem(n), nil
}

// Act applies an action to the owner's notifications and returns how many changed and the new unread count. Other
// devices of the owner hear about the change.
func (s *Service) Act(ctx context.Context, o Owner, a InboxAction) (int64, int64, error) {
	if err := s.checkOwner(o); err != nil {
		return 0, 0, err
	}
	if !slices.Contains(Actions, a.Action) {
		return 0, 0, invalid("action must be one of %s", strings.Join(Actions, ", "))
	}
	if a.Filter == "" {
		a.Filter = FilterAll
	}
	if !slices.Contains(Filters, a.Filter) {
		return 0, 0, invalid("filter must be one of %s", strings.Join(Filters, ", "))
	}
	if a.All == (len(a.IDs) > 0) {
		return 0, 0, invalid("name the notifications, or ask for all of them")
	}
	if len(a.IDs) > MaxActionIDs {
		return 0, 0, invalid("at most %d notifications at a time", MaxActionIDs)
	}
	for _, id := range a.IDs {
		if _, err := uuid.Parse(id); err != nil {
			return 0, 0, invalid("ids must be UUIDs")
		}
	}
	if a.IDs == nil {
		a.IDs = []string{}
	}
	now := s.now()
	var (
		changed int64
		err     error
	)
	if a.Action == "delete" {
		changed, err = s.store.DeleteNotifications(ctx, sqlcdb.DeleteNotificationsParams{
			Realm: o.Realm, Recipient: o.UserID, Now: now, Categories: o.Categories, Category: optional(a.Category),
			Every: a.All, Ids: a.IDs, Filter: a.Filter,
		})
	} else {
		changed, err = s.store.ChangeNotifications(ctx, sqlcdb.ChangeNotificationsParams{
			Action: a.Action, Now: &now, Realm: o.Realm, Recipient: o.UserID, Categories: o.Categories,
			Category: optional(a.Category), Every: a.All, Ids: a.IDs, Filter: a.Filter,
		})
	}
	if err != nil {
		return 0, 0, err
	}
	summary, err := s.unread(ctx, o)
	if err != nil {
		return changed, 0, err
	}
	if changed > 0 {
		s.hint(ctx, o.Realm, o.UserID, HintChanged, map[string]int64{"unread": summary.Unread})
	}
	return changed, summary.Unread, nil
}

// Preferences returns the owner's settings, with the catalogue's defaults for anything they never set, and one
// entry for each category they may receive.
func (s *Service) Preferences(ctx context.Context, o Owner) (Preferences, error) {
	if err := s.checkOwner(o); err != nil {
		return Preferences{}, err
	}
	out := Preferences{SoundEnabled: true, Sound: catalog.Notifications.DefaultSound, Volume: catalog.Notifications.DefaultVolume,
		PopupsEnabled: true}
	p, err := s.store.GetPreference(ctx, sqlcdb.GetPreferenceParams{Realm: o.Realm, UserID: o.UserID})
	switch {
	case err == nil:
		out.SoundEnabled, out.Sound, out.Volume = p.SoundEnabled, p.Sound, int(p.Volume)
		out.PopupsEnabled, out.DesktopEnabled = p.PopupsEnabled, p.DesktopEnabled
		if p.MutedUntil != nil && p.MutedUntil.After(s.now()) {
			out.MutedUntil = p.MutedUntil
		}
	case !errors.Is(err, pgx.ErrNoRows):
		return Preferences{}, err
	}
	stored, err := s.store.CategorySettings(ctx, sqlcdb.CategorySettingsParams{Realm: o.Realm, UserID: o.UserID})
	if err != nil {
		return Preferences{}, err
	}
	settings := map[string]sqlcdb.CategorySettingsRow{}
	for _, c := range stored {
		settings[c.Category] = c
	}
	for _, key := range o.Categories {
		category, _ := catalog.Notifications.Category(key)
		setting := CategorySetting{Category: key, Sound: true, Mandatory: category.Mandatory}
		if c, ok := settings[key]; ok {
			setting.Muted, setting.Sound = c.Muted && !category.Mandatory, c.Sound
		}
		out.Categories = append(out.Categories, setting)
	}
	if out.Categories == nil {
		out.Categories = []CategorySetting{}
	}
	return out, nil
}

// SavePreferences replaces the owner's settings. Categories outside the owner's are refused; settings kept for
// categories they lost stay as they were. Mandatory categories cannot be muted.
func (s *Service) SavePreferences(ctx context.Context, o Owner, p Preferences) (Preferences, error) {
	if err := s.checkOwner(o); err != nil {
		return Preferences{}, err
	}
	if !slices.Contains(catalog.Notifications.Sounds, p.Sound) {
		return Preferences{}, invalid("sound must be one of %s", strings.Join(catalog.Notifications.Sounds, ", "))
	}
	if p.Volume < 0 || p.Volume > 100 {
		return Preferences{}, invalid("volume must be 0 to 100")
	}
	if p.MutedUntil != nil {
		until := p.MutedUntil.UTC()
		if until.After(MutedForever) {
			until = MutedForever
		}
		if !until.After(s.now()) {
			until = time.Time{}
		}
		if until.IsZero() {
			p.MutedUntil = nil
		} else {
			p.MutedUntil = &until
		}
	}
	seen := map[string]bool{}
	for _, c := range p.Categories {
		if !slices.Contains(o.Categories, c.Category) || seen[c.Category] {
			return Preferences{}, invalid("category %q is not one of yours", c.Category)
		}
		seen[c.Category] = true
		category, _ := catalog.Notifications.Category(c.Category)
		if category.Mandatory && c.Muted {
			return Preferences{}, invalid("%s notifications cannot be muted", category.NameEn)
		}
	}
	now := s.now()
	err := s.store.Tx(ctx, func(q *sqlcdb.Queries, _ pgx.Tx) error {
		if err := q.UpsertPreference(ctx, sqlcdb.UpsertPreferenceParams{
			Realm: o.Realm, UserID: o.UserID, MutedUntil: p.MutedUntil, SoundEnabled: p.SoundEnabled, Sound: p.Sound,
			Volume: int16(p.Volume), PopupsEnabled: p.PopupsEnabled, DesktopEnabled: p.DesktopEnabled, Now: now, // #nosec G115 -- checked 0 to 100 above
		}); err != nil {
			return err
		}
		kept, err := q.CategorySettings(ctx, sqlcdb.CategorySettingsParams{Realm: o.Realm, UserID: o.UserID})
		if err != nil {
			return err
		}
		if err := q.DeleteCategorySettings(ctx, sqlcdb.DeleteCategorySettingsParams{Realm: o.Realm, UserID: o.UserID}); err != nil {
			return err
		}
		for _, c := range kept {
			if !slices.Contains(o.Categories, c.Category) {
				if err := q.InsertCategorySetting(ctx, sqlcdb.InsertCategorySettingParams{Realm: o.Realm, UserID: o.UserID,
					Category: c.Category, Muted: c.Muted, Sound: c.Sound}); err != nil {
					return err
				}
			}
		}
		for _, c := range p.Categories {
			if !c.Muted && c.Sound {
				continue // the default needs no row
			}
			if err := q.InsertCategorySetting(ctx, sqlcdb.InsertCategorySettingParams{Realm: o.Realm, UserID: o.UserID,
				Category: c.Category, Muted: c.Muted, Sound: c.Sound}); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return Preferences{}, err
	}
	s.hint(ctx, o.Realm, o.UserID, HintPreferences, map[string]string{})
	return s.Preferences(ctx, o)
}

// Mutes lists the records the owner muted that are still muted.
func (s *Service) Mutes(ctx context.Context, o Owner) ([]Mute, error) {
	if err := s.checkOwner(o); err != nil {
		return nil, err
	}
	now := s.now()
	rows, err := s.store.ListMutes(ctx, sqlcdb.ListMutesParams{Realm: o.Realm, UserID: o.UserID, Now: &now})
	if err != nil {
		return nil, err
	}
	out := make([]Mute, 0, len(rows))
	for _, r := range rows {
		out = append(out, Mute{EntityType: r.EntityType, EntityID: r.EntityID, Until: r.Until, CreatedAt: r.CreatedAt})
	}
	return out, nil
}

func checkEntity(entityType, entityID string) error {
	if entityType == "" || entityID == "" || len(entityType) > maxEntityField || len(entityID) > maxEntityField {
		return invalid("entityType and entityId are required, up to %d characters", maxEntityField)
	}
	return nil
}

// Mute silences future notifications about one record until a time, or until unmuted (until nil).
func (s *Service) Mute(ctx context.Context, o Owner, entityType, entityID string, until *time.Time) error {
	if err := s.checkOwner(o); err != nil {
		return err
	}
	if err := checkEntity(entityType, entityID); err != nil {
		return err
	}
	now := s.now()
	if until != nil && !until.After(now) {
		return invalid("until must be in the future")
	}
	if err := s.store.UpsertMute(ctx, sqlcdb.UpsertMuteParams{Realm: o.Realm, UserID: o.UserID, EntityType: entityType,
		EntityID: entityID, Until: utc(until), Now: now}); err != nil {
		return err
	}
	s.hint(ctx, o.Realm, o.UserID, HintPreferences, map[string]string{})
	return nil
}

// Unmute lets notifications about a record ring again.
func (s *Service) Unmute(ctx context.Context, o Owner, entityType, entityID string) error {
	if err := s.checkOwner(o); err != nil {
		return err
	}
	if err := checkEntity(entityType, entityID); err != nil {
		return err
	}
	n, err := s.store.DeleteMute(ctx, sqlcdb.DeleteMuteParams{Realm: o.Realm, UserID: o.UserID, EntityType: entityType, EntityID: entityID})
	if err != nil {
		return err
	}
	if n == 0 {
		return ErrNotFound
	}
	s.hint(ctx, o.Realm, o.UserID, HintPreferences, map[string]string{})
	return nil
}
