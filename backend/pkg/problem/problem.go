// Package problem writes errors as RFC 9457 problem details (application/problem+json), the one error shape every
// service returns.
package problem

import (
	"errors"
	"fmt"
	"net/http"
)

// ContentType is the media type of a problem response.
const ContentType = "application/problem+json"

// TypeBase prefixes every problem type URI. Types are stable identifiers, not links that must resolve.
const TypeBase = "urn:platform:problem:"

// Problem is an RFC 9457 problem detail. Code is a stable machine-readable reason the front ends translate.
type Problem struct {
	Type      string         `json:"type"`
	Title     string         `json:"title"`
	Status    int            `json:"status"`
	Detail    string         `json:"detail,omitempty"`
	Instance  string         `json:"instance,omitempty"`
	Code      string         `json:"code"`
	RequestID string         `json:"requestId,omitempty"`
	Errors    []FieldError   `json:"errors,omitempty"`
	Extra     map[string]any `json:"extra,omitempty"`
}

// FieldError describes one invalid input field.
type FieldError struct {
	Field string `json:"field"`
	Code  string `json:"code"`
}

func (p *Problem) Error() string {
	if p.Detail != "" {
		return fmt.Sprintf("%s: %s", p.Code, p.Detail)
	}
	return p.Code
}

// New returns a problem with the given status and code.
func New(status int, code, detail string) *Problem {
	return &Problem{
		Type:   TypeBase + code,
		Title:  http.StatusText(status),
		Status: status,
		Detail: detail,
		Code:   code,
	}
}

// Codes shared by every service. Domain-specific codes are declared by the service that returns them.
const (
	CodeBadRequest      = "bad_request"
	CodeValidation      = "validation_failed"
	CodeUnauthenticated = "unauthenticated"
	CodeForbidden       = "forbidden"
	CodeNotFound        = "not_found"
	CodeConflict        = "conflict"
	CodeTooLarge        = "payload_too_large"
	CodeRateLimited     = "rate_limited"
	CodeUnavailable     = "service_unavailable"
	CodeBadGateway      = "bad_gateway"
	CodeTimeout         = "timeout"
	CodeInternal        = "internal_error"
)

// Convenience constructors for the common cases.
func BadRequest(detail string) *Problem { return New(http.StatusBadRequest, CodeBadRequest, detail) }
func Unauthenticated(detail string) *Problem {
	return New(http.StatusUnauthorized, CodeUnauthenticated, detail)
}
func Forbidden(detail string) *Problem { return New(http.StatusForbidden, CodeForbidden, detail) }
func NotFound(detail string) *Problem  { return New(http.StatusNotFound, CodeNotFound, detail) }
func Conflict(detail string) *Problem  { return New(http.StatusConflict, CodeConflict, detail) }
func Internal() *Problem               { return New(http.StatusInternalServerError, CodeInternal, "") }

// Validation returns a 422 problem listing the invalid fields.
func Validation(fields ...FieldError) *Problem {
	p := New(http.StatusUnprocessableEntity, CodeValidation, "")
	p.Errors = fields
	return p
}

// From converts any error to a problem. Unknown errors become a bare 500 so internals never leak to clients.
func From(err error) *Problem {
	var p *Problem
	if errors.As(err, &p) {
		return p
	}
	return Internal()
}
