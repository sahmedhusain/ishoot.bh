// Package domain holds the IT ticket rules: what a valid ticket is, which transitions each party may make, and how
// SLA deadlines are set. Categories, priorities, statuses and transitions come from the catalogue (itsm.json).
package domain

import (
	"errors"
	"fmt"
	"slices"
	"strings"
	"time"
	"unicode/utf8"

	"platform.local/backend/pkg/catalog"
)

// Errors the use cases return; the HTTP layer maps each one to a problem.
var (
	ErrNotFound   = errors.New("ticket not found")
	ErrTransition = errors.New("transition not allowed from the current status")
	ErrForbidden  = errors.New("not allowed for this caller")
)

// ValidationError names the invalid input field.
type ValidationError struct{ Field, Code string }

func (e *ValidationError) Error() string { return fmt.Sprintf("invalid %s: %s", e.Field, e.Code) }

func invalid(field, code string) error { return &ValidationError{Field: field, Code: code} }

// Limits are configured per installation.
type Limits struct {
	MaxAttachments int
}

// Attachment is a file already claimed in the files service.
type Attachment struct {
	FileURL, FileName, MIMEType string
	Size                        int64
}

// NewTicket is what an employee submits.
type NewTicket struct {
	RequesterID, RequesterName, RequesterEmail string
	Category, Subcategory, Priority            string
	Title, Description, AssetRef               string
	Attachments                                []Attachment
}

// Normalize trims text, applies the default priority and validates against the catalogue.
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
		if !strings.HasPrefix(a.FileURL, catalog.Files.URLPrefix) || a.FileName == "" || a.Size <= 0 {
			return invalid("attachments", "invalid")
		}
	}
	return nil
}

func textLength(s string, minLen, maxLen int) bool {
	n := utf8.RuneCountInString(s)
	return utf8.ValidString(s) && n >= minLen && n <= maxLen
}

// InitialStatus is the status every new ticket starts in.
func InitialStatus() string { return catalog.Tickets.Statuses[0] }

// Policy is the SLA for one priority.
type Policy struct {
	Priority                        string
	ResponseMinutes, ResolveMinutes int32
}

// Deadlines returns the response and resolution deadlines for a ticket created at.
func (p Policy) Deadlines(at time.Time) (respondBy, resolveBy time.Time) {
	return at.Add(time.Duration(p.ResponseMinutes) * time.Minute), at.Add(time.Duration(p.ResolveMinutes) * time.Minute)
}

// Validate checks an SLA change.
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

// State is the part of a ticket transitions change.
type State struct {
	Status                   string
	AssigneeID, AssigneeName *string
	FirstResponseAt          *time.Time
	ResolvedAt, ClosedAt     *time.Time
}

// Transition names from the catalogue that need special handling.
const (
	TransitionAssign  = "assign"
	TransitionResolve = "resolve"
	TransitionClose   = "close"
	TransitionCancel  = "cancel"
	TransitionReopen  = "reopen"
)

// Apply returns the state after transition. Requesters may only use the catalogue's requester transitions; IT
// may use every transition except none. assign needs an assignee.
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
