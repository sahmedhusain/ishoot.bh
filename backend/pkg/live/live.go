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
const (
	UserPrefix	= "live.user."
	TopicPrefix	= "live.topic."
	UserWildcard	= "live.user.>"
	TopicWildcard	= "live.topic.>"
)
const (
	RealmStaff	= "staff"
	RealmIT		= "it"
)
const MaxData = 4096
var ErrInvalid = errors.New("live: invalid hint")
var (
	idPattern	= regexp.MustCompile(`^[A-Za-z0-9_:-]{1,128}$`)
	topicPattern	= regexp.MustCompile(`^[a-z0-9_-]+(\.[A-Za-z0-9_:-]+){0,5}$`)
)
type Event struct {
	Type	string		`json:"type"`
	Data	json.RawMessage	`json:"data,omitempty"`
}
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
func (e Event) Validate() error {
	if !topicPattern.MatchString(e.Type) {
		return fmt.Errorf("%w: type %q", ErrInvalid, e.Type)
	}
	if len(e.Data) > MaxData {
		return fmt.Errorf("%w: data over %d bytes", ErrInvalid, MaxData)
	}
	return nil
}
func ValidRealm(realm string) bool	{ return realm == RealmStaff || realm == RealmIT }
func ValidID(id string) bool	{ return idPattern.MatchString(id) }
func ValidTopic(topic string) bool	{ return topicPattern.MatchString(topic) }
func UserSubject(realm, id string) (string, error) {
	if !ValidRealm(realm) || !ValidID(id) {
		return "", fmt.Errorf("%w: user %s/%s", ErrInvalid, realm, id)
	}
	return UserPrefix + realm + "." + id, nil
}
func TopicSubject(topic string) (string, error) {
	if !ValidTopic(topic) {
		return "", fmt.Errorf("%w: topic %q", ErrInvalid, topic)
	}
	return TopicPrefix + topic, nil
}
type Target struct {
	Realm, ID, Topic string
}
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
type Publisher interface {
	ToUser(ctx context.Context, realm, id string, ev Event) error
	ToTopic(ctx context.Context, topic string, ev Event) error
}
type NATS struct{ Conn *nats.Conn }
func (n NATS) ToUser(_ context.Context, realm, id string, ev Event) error {
	subject, err := UserSubject(realm, id)
	if err != nil {
		return err
	}
	return n.publish(subject, ev)
}
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
type Nop struct{}
func (Nop) ToUser(context.Context, string, string, Event) error	{ return nil }
func (Nop) ToTopic(context.Context, string, Event) error	{ return nil }
type Recorder struct {
	Sent []Recorded
}
type Recorded struct {
	Target	Target
	Event	Event
}
func (r *Recorder) ToUser(_ context.Context, realm, id string, ev Event) error {
	if _, err := UserSubject(realm, id); err != nil {
		return err
	}
	r.Sent = append(r.Sent, Recorded{Target: Target{Realm: realm, ID: id}, Event: ev})
	return nil
}
func (r *Recorder) ToTopic(_ context.Context, topic string, ev Event) error {
	if _, err := TopicSubject(topic); err != nil {
		return err
	}
	r.Sent = append(r.Sent, Recorded{Target: Target{Topic: topic}, Event: ev})
	return nil
}
