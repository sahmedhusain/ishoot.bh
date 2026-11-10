package app
import "platform.local/backend/services/notify/internal/postgres/sqlcdb"
const (
	EventSent	= "notify.message.sent"
	EventFailed	= "notify.message.failed"
	EventRetried	= "notify.message.retried"
)
type Outcome struct {
	MessageID	string	`json:"messageId"`
	Channel		string	`json:"channel"`
	Caller		string	`json:"caller"`
	ActorID		string	`json:"actorId,omitempty"`
	Provider	string	`json:"provider,omitempty"`
	Reason		string	`json:"reason,omitempty"`
}
type Retried struct {
	MessageID	string	`json:"messageId"`
	Channel		string	`json:"channel"`
	ChangedBy	string	`json:"changedBy"`
}
func outcome(m sqlcdb.NotifyMessage, provider, reason string) Outcome {
	o := Outcome{MessageID: m.ID, Channel: m.Channel, Caller: m.Caller, Provider: provider, Reason: reason}
	if m.Actor != nil {
		o.ActorID = m.Caller + ":" + *m.Actor
	}
	return o
}
