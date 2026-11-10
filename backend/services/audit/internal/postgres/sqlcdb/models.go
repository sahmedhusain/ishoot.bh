package sqlcdb
import (
	"encoding/json"
	"time"
)
type AuditEvent struct {
	ID		string
	Subject		string
	Service		string
	Entity		string
	Verb		string
	Actor		*string
	OccurredAt	time.Time
	ReceivedAt	time.Time
	Payload		json.RawMessage
	TraceID		*string
}
