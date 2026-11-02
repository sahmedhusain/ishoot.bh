package catalog

import (
	"fmt"
	"slices"
	"strings"
)

// NotificationCatalog is the in-app notification model (ADR 0012): realms, priorities, sounds and categories.
type NotificationCatalog struct {
	Realms           []string               `json:"realms"`
	Priorities       []string               `json:"priorities"`
	DefaultPriority  string                 `json:"defaultPriority"`
	Sounds           []string               `json:"sounds"`
	DefaultSound     string                 `json:"defaultSound"`
	DefaultVolume    int                    `json:"defaultVolume"`
	FallbackCategory string                 `json:"fallbackCategory"`
	Categories       []NotificationCategory `json:"categories"`
}

// NotificationCategory groups notifications people configure together. A category with permissions reaches only
// people holding one of them ("resource:action" in the realm's access model); one without is personal.
type NotificationCategory struct {
	Key                string   `json:"key"`
	Realms             []string `json:"realms"`
	NameEn             string   `json:"nameEn"`
	NameAr             string   `json:"nameAr"`
	DescriptionEn      string   `json:"descriptionEn"`
	DescriptionAr      string   `json:"descriptionAr"`
	Mandatory          bool     `json:"mandatory"`
	Priority           string   `json:"priority"`
	Permissions        []string `json:"permissions"`
	MessageKeyPrefixes []string `json:"messageKeyPrefixes"`
	EntityTypes        []string `json:"entityTypes"`
}

// PresenceCatalog is the status model realtime applies (ADR 0012).
type PresenceCatalog struct {
	Tones            []string         `json:"tones"`
	Statuses         []PresenceStatus `json:"statuses"`
	WindowKinds      []WindowKind     `json:"windowKinds"`
	Durations        []string         `json:"durations"`
	MessageMaxLength int              `json:"messageMaxLength"`
}

// PresenceStatus is one status. Manual statuses can be chosen; Automatic names what sets it without a choice
// (connected, idle, calendar, leave, disconnected). Silences means notifications stay quiet while it holds.
type PresenceStatus struct {
	Key       string `json:"key"`
	Tone      string `json:"tone"`
	Manual    bool   `json:"manual"`
	Automatic string `json:"automatic"`
	Silences  bool   `json:"silences"`
	NameEn    string `json:"nameEn"`
	NameAr    string `json:"nameAr"`
}

// WindowKind is a kind of scheduled time (a meeting, leave) and the status it gives while it lasts.
type WindowKind struct {
	Key    string `json:"key"`
	Status string `json:"status"`
}

// The loaded notification and presence catalogues.
var (
	Notifications NotificationCatalog
	Presence      PresenceCatalog
)

func init() {
	must(decode("notifications.json", &Notifications))
	must(decode("presence.json", &Presence))
	must(Notifications.validate())
	must(Presence.validate())
}

// Category returns a category by key.
func (n NotificationCatalog) Category(key string) (NotificationCategory, bool) {
	for _, c := range n.Categories {
		if c.Key == key {
			return c, true
		}
	}
	return NotificationCategory{}, false
}

// InRealm reports whether the category is used in realm.
func (c NotificationCategory) InRealm(realm string) bool { return slices.Contains(c.Realms, realm) }

// AllowedFor reports whether a person in realm whose permission check is allows may receive the category.
func (c NotificationCategory) AllowedFor(realm string, allows func(resource, action string) bool) bool {
	if !c.InRealm(realm) {
		return false
	}
	if len(c.Permissions) == 0 {
		return true
	}
	for _, p := range c.Permissions {
		resource, action, _ := strings.Cut(p, ":")
		if allows(resource, action) {
			return true
		}
	}
	return false
}

// CategoryFor picks the category of a notification that did not name one: by message key, then entity type, then
// the fallback. Only categories of realm are considered.
func (n NotificationCatalog) CategoryFor(realm, messageKey, entityType string) string {
	for _, c := range n.Categories {
		if !c.InRealm(realm) {
			continue
		}
		for _, prefix := range c.MessageKeyPrefixes {
			if messageKey != "" && strings.HasPrefix(messageKey, prefix) {
				return c.Key
			}
		}
	}
	for _, c := range n.Categories {
		if c.InRealm(realm) && entityType != "" && slices.Contains(c.EntityTypes, entityType) {
			return c.Key
		}
	}
	return n.FallbackCategory
}

func (n NotificationCatalog) validate() error {
	if !slices.Contains(n.Priorities, n.DefaultPriority) {
		return fmt.Errorf("catalog: notifications: default priority %q is not a priority", n.DefaultPriority)
	}
	if !slices.Contains(n.Sounds, n.DefaultSound) {
		return fmt.Errorf("catalog: notifications: default sound %q is not a sound", n.DefaultSound)
	}
	if n.DefaultVolume < 0 || n.DefaultVolume > 100 {
		return fmt.Errorf("catalog: notifications: default volume must be 0 to 100")
	}
	seen := map[string]bool{}
	for _, c := range n.Categories {
		if c.Key == "" || seen[c.Key] {
			return fmt.Errorf("catalog: notifications: empty or duplicate category %q", c.Key)
		}
		seen[c.Key] = true
		if len(c.Realms) == 0 {
			return fmt.Errorf("catalog: notifications: category %q has no realm", c.Key)
		}
		for _, r := range c.Realms {
			if !slices.Contains(n.Realms, r) {
				return fmt.Errorf("catalog: notifications: category %q names unknown realm %q", c.Key, r)
			}
		}
		if !slices.Contains(n.Priorities, c.Priority) {
			return fmt.Errorf("catalog: notifications: category %q has unknown priority %q", c.Key, c.Priority)
		}
		for _, p := range c.Permissions {
			resource, action, ok := strings.Cut(p, ":")
			if !ok {
				return fmt.Errorf("catalog: notifications: category %q permission %q is not resource:action", c.Key, p)
			}
			for _, realm := range c.Realms {
				access := StaffAccess
				if realm == "it" {
					access = ITAccess
				}
				if !slices.Contains(access.Resources, resource) || !slices.Contains(access.Actions, action) {
					return fmt.Errorf("catalog: notifications: category %q permission %q is unknown in %s", c.Key, p, realm)
				}
			}
		}
	}
	fallback, ok := n.Category(n.FallbackCategory)
	if !ok || len(fallback.Permissions) > 0 || !slices.Equal(fallback.Realms, n.Realms) {
		return fmt.Errorf("catalog: notifications: fallback %q must be a personal category of every realm", n.FallbackCategory)
	}
	return nil
}

// Status returns a status by key.
func (p PresenceCatalog) Status(key string) (PresenceStatus, bool) {
	for _, s := range p.Statuses {
		if s.Key == key {
			return s, true
		}
	}
	return PresenceStatus{}, false
}

// Automatic returns the status set automatically by trigger (connected, idle, calendar, leave, disconnected).
func (p PresenceCatalog) Automatic(trigger string) string {
	for _, s := range p.Statuses {
		if s.Automatic == trigger {
			return s.Key
		}
	}
	return ""
}

// WindowStatus returns the status a window of kind gives.
func (p PresenceCatalog) WindowStatus(kind string) (string, bool) {
	for _, w := range p.WindowKinds {
		if w.Key == kind {
			return w.Status, true
		}
	}
	return "", false
}

func (p PresenceCatalog) validate() error {
	seen := map[string]bool{}
	for _, s := range p.Statuses {
		if s.Key == "" || seen[s.Key] {
			return fmt.Errorf("catalog: presence: empty or duplicate status %q", s.Key)
		}
		seen[s.Key] = true
		if !slices.Contains(p.Tones, s.Tone) {
			return fmt.Errorf("catalog: presence: status %q has unknown tone %q", s.Key, s.Tone)
		}
	}
	for _, trigger := range []string{"connected", "idle", "calendar", "leave", "disconnected"} {
		if p.Automatic(trigger) == "" {
			return fmt.Errorf("catalog: presence: no status is set automatically when %s", trigger)
		}
	}
	for _, w := range p.WindowKinds {
		if !seen[w.Status] {
			return fmt.Errorf("catalog: presence: window kind %q gives unknown status %q", w.Key, w.Status)
		}
	}
	if p.MessageMaxLength <= 0 {
		return fmt.Errorf("catalog: presence: messageMaxLength must be positive")
	}
	return nil
}
