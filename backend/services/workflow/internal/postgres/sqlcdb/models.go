package sqlcdb
import (
	"encoding/json"
	"time"
	"github.com/jackc/pgx/v5/pgtype"
)
type WorkflowApprovalDecision struct {
	ID		string
	RequestID	string
	ApproverID	string
	Decision	string
	Comments	*string
	DecidedAt	time.Time
}
type WorkflowApprovalRequest struct {
	ID		string
	Kind		string
	EntityID	string
	RequesterID	string
	Status		string
	Priority	string
	Reason		*string
	CreatedAt	time.Time
	UpdatedAt	time.Time
}
type WorkflowCalendarEvent struct {
	ID		string
	Title		string
	Description	*string
	StartTime	time.Time
	EndTime		time.Time
	IsAllDay	bool
	Location	*string
	OrganizerID	string
	EventType	string
	CreatedAt	time.Time
}
type WorkflowInbox struct {
	Consumer	string
	EventID		string
	HandledAt	time.Time
}
type WorkflowLetterTemplate struct {
	ID		string
	NameEn		string
	NameAr		string
	TemplateBody	string
	SortOrder	int32
}
type WorkflowMinuteOfMeeting struct {
	ID		string
	MomNumber	string
	Title		string
	MeetingDate	pgtype.Date
	Attendees	[]string
	Discussion	string
	ActionItems	*string
	Status		string
	CreatedAt	time.Time
}
type WorkflowOfficialLetter struct {
	ID		string
	LetterNumber	string
	TemplateID	*string
	RecipientName	string
	RecipientTitle	*string
	Subject		string
	Body		string
	Status		string
	IssuedAt	*time.Time
	CreatedAt	time.Time
}
type WorkflowOutbox struct {
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
type WorkflowSignatureRequest struct {
	ID		string
	Title		string
	DocumentType	string
	DocumentID	string
	RequestedFrom	string
	Status		string
	SignatureUrl	*string
	SignedAt	*time.Time
	ExpiresAt	*time.Time
	CreatedAt	time.Time
}
type WorkflowTask struct {
	ID			string
	Title			string
	Description		*string
	AssignedTo		*string
	DueDate			*time.Time
	Status			string
	Priority		string
	RelatedEntityType	*string
	RelatedEntityID		*string
	CreatedAt		time.Time
	UpdatedAt		time.Time
}
