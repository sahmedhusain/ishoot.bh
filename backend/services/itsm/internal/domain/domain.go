package domain
import (
	"errors"
	"fmt"
	"slices"
	"strings"
	"time"
	"unicode/utf8"
	"github.com/riverqueue/river"
	"platform.local/backend/pkg/catalog"
)
var (
	ErrNotFound	= errors.New("ticket not found")
	ErrTransition	= errors.New("transition not allowed from the current status")
	ErrForbidden	= errors.New("not allowed for this caller")
)
type ValidationError struct{ Field, Code string }
func (e *ValidationError) Error() string	{ return fmt.Sprintf("invalid %s: %s", e.Field, e.Code) }
func invalid(field, code string) error	{ return &ValidationError{Field: field, Code: code} }
type Limits struct {
	MaxAttachments		int
	MaxAttachmentSize	int64
}
type Attachment struct {
	FileURL, FileName, MIMEType	string
	Size				int64
	CommentID			*string
}
func ValidateAttachment(a Attachment, limits Limits) error {
	maxSize := limits.MaxAttachmentSize
	if maxSize <= 0 {
		maxSize = 10 << 20
	}
	if !strings.HasPrefix(a.FileURL, catalog.Files.URLPrefix) || a.FileName == "" || len(a.FileName) > 200 {
		return invalid("attachments", "invalid")
	}
	if a.Size <= 0 || a.Size > maxSize {
		return invalid("attachments", "size")
	}
	if a.MIMEType != "" {
		if _, ok := catalog.Files.Type(a.MIMEType); !ok {
			return invalid("attachments", "type")
		}
	}
	return nil
}
type NewTicket struct {
	RequesterID, RequesterName, RequesterEmail	string
	Category, Subcategory, Priority			string
	Title, Description, AssetRef			string
	Attachments					[]Attachment
}
func (n *NewTicket) Normalize(limits Limits) error {
	n.Title, n.Description = strings.TrimSpace(n.Title), strings.TrimSpace(n.Description)
	n.AssetRef = strings.TrimSpace(n.AssetRef)
	if n.Priority == "" {
		n.Priority = catalog.Tickets.DefaultPriority
	}
	switch {
	case n.RequesterID == "" || n.RequesterName == "" || n.RequesterEmail == "":
		return invalid("requester", "required")
	case !slices.Contains(catalog.Tickets.Priorities, n.Priority):
		return invalid("priority", "oneof")
	case !textLength(n.Title, 1, 200):
		return invalid("title", "length")
	case !textLength(n.Description, 1, 10000):
		return invalid("description", "length")
	case len(n.Attachments) > limits.MaxAttachments:
		return invalid("attachments", "max")
	}
	category, ok := catalog.Tickets.Category(n.Category)
	if !ok {
		return invalid("category", "oneof")
	}
	if !slices.ContainsFunc(category.Subcategories, func(s catalog.Subcategory) bool { return s.Key == n.Subcategory }) {
		return invalid("subcategory", "oneof")
	}
	if n.AssetRef != "" && (!category.LinksAsset || len(n.AssetRef) > 100) {
		return invalid("assetRef", "not_allowed")
	}
	for _, a := range n.Attachments {
		if err := ValidateAttachment(a, limits); err != nil {
			return err
		}
	}
	return nil
}
type NewComment struct {
	Body		string
	Internal	bool
	Attachments	[]Attachment
}
func (c *NewComment) Normalize(limits Limits) error {
	c.Body = strings.TrimSpace(c.Body)
	if !textLength(c.Body, 1, 10000) {
		return invalid("body", "length")
	}
	if len(c.Attachments) > limits.MaxAttachments {
		return invalid("attachments", "max")
	}
	for _, a := range c.Attachments {
		if err := ValidateAttachment(a, limits); err != nil {
			return err
		}
	}
	return nil
}
func textLength(s string, minLen, maxLen int) bool {
	n := utf8.RuneCountInString(s)
	return utf8.ValidString(s) && n >= minLen && n <= maxLen
}
func InitialStatus() string	{ return catalog.Tickets.Statuses[0] }
type Policy struct {
	Priority			string
	ResponseMinutes, ResolveMinutes	int32
}
func (p Policy) Deadlines(at time.Time) (respondBy, resolveBy time.Time) {
	return at.Add(time.Duration(p.ResponseMinutes) * time.Minute), at.Add(time.Duration(p.ResolveMinutes) * time.Minute)
}
func (p Policy) Validate() error {
	switch {
	case !slices.Contains(catalog.Tickets.Priorities, p.Priority):
		return invalid("priority", "oneof")
	case p.ResponseMinutes <= 0 || p.ResponseMinutes > 525600:
		return invalid("responseMinutes", "range")
	case p.ResolveMinutes < p.ResponseMinutes || p.ResolveMinutes > 525600:
		return invalid("resolveMinutes", "range")
	}
	return nil
}
type State struct {
	Status				string
	AssigneeID, AssigneeName	*string
	FirstResponseAt			*time.Time
	ResolvedAt, ClosedAt		*time.Time
}
const (
	TransitionAssign	= "assign"
	TransitionResolve	= "resolve"
	TransitionClose		= "close"
	TransitionCancel	= "cancel"
	TransitionReopen	= "reopen"
)
func Apply(s State, transition string, byRequester bool, assigneeID, assigneeName string, now time.Time) (State, error) {
	if byRequester && !slices.Contains(catalog.Tickets.RequesterTransitions, transition) {
		return State{}, ErrForbidden
	}
	next, ok := catalog.Tickets.Next(s.Status, transition)
	if !ok {
		return State{}, ErrTransition
	}
	out := s
	out.Status = next
	switch transition {
	case TransitionAssign:
		if assigneeID == "" || assigneeName == "" {
			return State{}, invalid("assigneeId", "required")
		}
		out.AssigneeID, out.AssigneeName = &assigneeID, &assigneeName
	case TransitionResolve:
		out.ResolvedAt = &now
	case TransitionClose, TransitionCancel:
		out.ClosedAt = &now
	case TransitionReopen:
		out.ResolvedAt = nil
	}
	if !byRequester && out.FirstResponseAt == nil {
		out.FirstResponseAt = &now
	}
	return out, nil
}
const Queue = "itsm"
type NotificationArgs struct {
	TicketID	string	`json:"ticketId"`
	EventID		string	`json:"eventId"`
	EventKind	string	`json:"kind"`
	Detail		string	`json:"detail,omitempty"`
	ActorID		string	`json:"actorId,omitempty"`
	ActorRealm	string	`json:"actorRealm,omitempty"`
	RequesterID	string	`json:"requesterId"`
	RequesterEmail	string	`json:"requesterEmail"`
	AssigneeID	string	`json:"assigneeId,omitempty"`
	TicketNumber	int64	`json:"ticketNumber"`
	TicketTitle	string	`json:"ticketTitle"`
}
func (NotificationArgs) Kind() string	{ return "itsm.send_ticket_notification" }
func (NotificationArgs) InsertOpts() river.InsertOpts {
	return river.InsertOpts{Queue: Queue}
}
