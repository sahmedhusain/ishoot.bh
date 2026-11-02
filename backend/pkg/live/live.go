// Package live carries the small hints the realtime service pushes to browsers (ADR 0012). Services publish them on
// NATS core subjects, not on the EVENTS stream: they are not facts to keep, only a nudge to fetch what changed, so a
// lost hint costs nothing (every browser resyncs when it reconnects). Hints carry IDs and counts, never message text.
//
//	live.user.<realm>.<id>   one person (realm staff or it)
//	live.topic.<topic>       everyone whose stream includes the topic, e.g. live.topic.it.tickets
package live

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strings"

	"github.com/nats-io/nats.go"
)

// Subject prefixes and the wildcards realtime subscribes to.
const (
	UserPrefix    = "live.user."
	TopicPrefix   = "live.topic."
	UserWildcard  = "live.user.>"
	TopicWildcard = "live.topic.>"
)

// Realms whose people receive hints.
const (
	RealmStaff = "staff"
	RealmIT    = "it"
)

// MaxData caps a hint's data; anything bigger belongs behind an API call.
const MaxData = 4096

// ErrInvalid means a subject part or a hint is not acceptable.
var ErrInvalid = errors.New("live: invalid hint")

// IDs and topic segments: letters, digits, '_', '-' and ':' (topics add '.' between segments).
var (
	idPattern    = regexp.MustCompile(`^[A-Za-z0-9_:-]{1,128}$`)
	topicPattern = regexp.MustCompile(`^[a-z0-9_-]+(\.[A-Za-z0-9_:-]+){0,5}$`)
)

// Event is one hint: a type the browser dispatches on ("notification.created") and a small JSON object.
type Event struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data,omitempty"`
}

// New returns an event with data marshalled to JSON.
func New(eventType string, data any) (Event, error) {
	ev := Event{Type: eventType}
	if data != nil {
		raw, err := json.Marshal(data)
		if err != nil {
			return Event{}, err
		}
		ev.Data = raw
	}
	return ev, ev.Validate()
}

// Validate checks the type and size.
func (e Event) Validate() error {
	if !topicPattern.MatchString(e.Type) {
		return fmt.Errorf("%w: type %q", ErrInvalid, e.Type)
	}
	if len(e.Data) > MaxData {
		return fmt.Errorf("%w: data over %d bytes", ErrInvalid, MaxData)
	}
	return nil
}

// ValidRealm reports whether realm receives hints.
func ValidRealm(realm string) bool { return realm == RealmStaff || realm == RealmIT }

// ValidID reports whether id can be a subject token.
func ValidID(id string) bool { return idPattern.MatchString(id) }

// ValidTopic reports whether topic can be published to.
func ValidTopic(topic string) bool { return topicPattern.MatchString(topic) }

// UserSubject is the subject of one person's hints.
func UserSubject(realm, id string) (string, error) {
	if !ValidRealm(realm) || !ValidID(id) {
		return "", fmt.Errorf("%w: user %s/%s", ErrInvalid, realm, id)
	}
	return UserPrefix + realm + "." + id, nil
}

// TopicSubject is the subject of a topic's hints.
func TopicSubject(topic string) (string, error) {
	if !ValidTopic(topic) {
		return "", fmt.Errorf("%w: topic %q", ErrInvalid, topic)
	}
	return TopicPrefix + topic, nil
}

// Target is whom a received hint is for: one person, or a topic.
type Target struct {
	Realm, ID, Topic string
}

// ParseSubject reads the target from a received subject.
func ParseSubject(subject string) (Target, bool) {
	if rest, ok := strings.CutPrefix(subject, UserPrefix); ok {
		realm, id, ok := strings.Cut(rest, ".")
		if !ok || !ValidRealm(realm) || !ValidID(id) {
			return Target{}, false
		}
		return Target{Realm: realm, ID: id}, true
	}
	if topic, ok := strings.CutPrefix(subject, TopicPrefix); ok && ValidTopic(topic) {
		return Target{Topic: topic}, true
	}
	return Target{}, false
}

// Publisher sends hints.
type Publisher interface {
	ToUser(ctx context.Context, realm, id string, ev Event) error
	ToTopic(ctx context.Context, topic string, ev Event) error
}

// NATS publishes hints on a NATS connection.
type NATS struct{ Conn *nats.Conn }

// ToUser publishes a hint to one person.
func (n NATS) ToUser(_ context.Context, realm, id string, ev Event) error {
	subject, err := UserSubject(realm, id)
	if err != nil {
		return err
	}
	return n.publish(subject, ev)
}

// ToTopic publishes a hint to a topic.
func (n NATS) ToTopic(_ context.Context, topic string, ev Event) error {
	subject, err := TopicSubject(topic)
	if err != nil {
		return err
	}
	return n.publish(subject, ev)
}

func (n NATS) publish(subject string, ev Event) error {
	if err := ev.Validate(); err != nil {
		return err
	}
	data, err := json.Marshal(ev)
	if err != nil {
		return err
	}
	return n.Conn.Publish(subject, data)
}

// Nop drops every hint: for processes without NATS (browsers then catch up when they resync).
type Nop struct{}

// ToUser does nothing.
func (Nop) ToUser(context.Context, string, string, Event) error { return nil }

// ToTopic does nothing.
func (Nop) ToTopic(context.Context, string, Event) error { return nil }

// Recorder keeps hints in memory, for tests.
type Recorder struct {
	Sent []Recorded
}

// Recorded is one hint a Recorder kept.
type Recorded struct {
	Target Target
	Event  Event
}

// ToUser records a hint to one person.
func (r *Recorder) ToUser(_ context.Context, realm, id string, ev Event) error {
	if _, err := UserSubject(realm, id); err != nil {
		return err
	}
	r.Sent = append(r.Sent, Recorded{Target: Target{Realm: realm, ID: id}, Event: ev})
	return nil
}

// ToTopic records a hint to a topic.
func (r *Recorder) ToTopic(_ context.Context, topic string, ev Event) error {
	if _, err := TopicSubject(topic); err != nil {
		return err
	}
	r.Sent = append(r.Sent, Recorded{Target: Target{Topic: topic}, Event: ev})
	return nil
}
