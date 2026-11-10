package sqlcdb
import (
	"encoding/json"
	"time"
)
type ItsmInbox struct {
	Consumer	string
	EventID		string
	HandledAt	time.Time
}
type ItsmOutbox struct {
	ID		string
	Subject		string
	Payload		json.RawMessage
	Headers		json.RawMessage
	CreatedAt	time.Time
	PublishedAt	*time.Time
	Attempts	int32
	NextTryAt	time.Time
	LastError	*string
}
type ItsmSlaPolicy struct {
	Priority	string
	ResponseMinutes	int32
	ResolveMinutes	int32
	UpdatedBy	*string
	UpdatedAt	time.Time
}
type ItsmTicket struct {
	ID		string
	Number		int64
	RequesterID	string
	RequesterName	string
	RequesterEmail	string
	Category	string
	Subcategory	string
	Priority	string
	Status		string
	Title		string
	Description	string
	AssetRef	*string
	AssigneeID	*string
	AssigneeName	*string
	RespondBy	time.Time
	ResolveBy	time.Time
	FirstResponseAt	*time.Time
	BreachedAt	*time.Time
	ResolvedAt	*time.Time
	ClosedAt	*time.Time
	CreatedAt	time.Time
	UpdatedAt	time.Time
	RemindedAt	*time.Time
}
type ItsmTicketAttachment struct {
	TicketID	string
	FileUrl		string
	FileName	string
	MimeType	string
	FileSize	int64
	AddedBy		string
	CreatedAt	time.Time
	CommentID	*string
}
type ItsmTicketComment struct {
	ID		string
	TicketID	string
	AuthorRealm	string
	AuthorID	string
	AuthorName	string
	Body		string
	Internal	bool
	CreatedAt	time.Time
}
type ItsmTicketEvent struct {
	ID		string
	TicketID	string
	ActorRealm	string
	ActorID		string
	Kind		string
	FromStatus	*string
	ToStatus	*string
	Detail		json.RawMessage
	CreatedAt	time.Time
}
