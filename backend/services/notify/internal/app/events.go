package app

import "platform.local/backend/services/notify/internal/postgres/sqlcdb"

// Events the service announces (ADR 0003), with schemas in contracts/events. They never carry the recipient or the
// message itself.
const (
	EventSent    = "notify.message.sent"
	EventFailed  = "notify.message.failed"
	EventRetried = "notify.message.retried"
)

// Outcome is the payload of notify.message.sent and notify.message.failed.
type Outcome struct {
	MessageID string `json:"messageId"`
	Channel   string `json:"channel"`
	Caller    string `json:"caller"`
	// ActorID is who the message was sent for: <caller>:<person>, when the caller named one.
	ActorID  string `json:"actorId,omitempty"`
	Provider string `json:"provider,omitempty"`
	Reason   string `json:"reason,omitempty"`
}

// Retried is the payload of notify.message.retried.
type Retried struct {
	MessageID string `json:"messageId"`
	Channel   string `json:"channel"`
	ChangedBy string `json:"changedBy"`
}

func outcome(m sqlcdb.NotifyMessage, provider, reason string) Outcome {
	o := Outcome{MessageID: m.ID, Channel: m.Channel, Caller: m.Caller, Provider: provider, Reason: reason}
	if m.Actor != nil {
		o.ActorID = m.Caller + ":" + *m.Actor
	}
	return o
}
