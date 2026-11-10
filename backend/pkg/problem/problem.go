package problem
import (
	"errors"
	"fmt"
	"net/http"
)
const ContentType = "application/problem+json"
const TypeBase = "urn:platform:problem:"
type Problem struct {
	Type		string		`json:"type"`
	Title		string		`json:"title"`
	Status		int		`json:"status"`
	Detail		string		`json:"detail,omitempty"`
	Instance	string		`json:"instance,omitempty"`
	Code		string		`json:"code"`
	RequestID	string		`json:"requestId,omitempty"`
	Errors		[]FieldError	`json:"errors,omitempty"`
	Extra		map[string]any	`json:"extra,omitempty"`
}
type FieldError struct {
	Field	string	`json:"field"`
	Code	string	`json:"code"`
}
func (p *Problem) Error() string {
	if p.Detail != "" {
		return fmt.Sprintf("%s: %s", p.Code, p.Detail)
	}
	return p.Code
}
func New(status int, code, detail string) *Problem {
	return &Problem{
		Type:	TypeBase + code,
		Title:	http.StatusText(status),
		Status:	status,
		Detail:	detail,
		Code:	code,
	}
}
const (
	CodeBadRequest		= "bad_request"
	CodeValidation		= "validation_failed"
	CodeUnauthenticated	= "unauthenticated"
	CodeForbidden		= "forbidden"
	CodeNotFound		= "not_found"
	CodeConflict		= "conflict"
	CodeTooLarge		= "payload_too_large"
	CodeRateLimited		= "rate_limited"
	CodeUnavailable		= "service_unavailable"
	CodeBadGateway		= "bad_gateway"
	CodeTimeout		= "timeout"
	CodeInternal		= "internal_error"
)
func BadRequest(detail string) *Problem	{ return New(http.StatusBadRequest, CodeBadRequest, detail) }
func Unauthenticated(detail string) *Problem {
	return New(http.StatusUnauthorized, CodeUnauthenticated, detail)
}
func Forbidden(detail string) *Problem	{ return New(http.StatusForbidden, CodeForbidden, detail) }
func NotFound(detail string) *Problem	{ return New(http.StatusNotFound, CodeNotFound, detail) }
func Conflict(detail string) *Problem	{ return New(http.StatusConflict, CodeConflict, detail) }
func Internal() *Problem		{ return New(http.StatusInternalServerError, CodeInternal, "") }
func Validation(fields ...FieldError) *Problem {
	p := New(http.StatusUnprocessableEntity, CodeValidation, "")
	p.Errors = fields
	return p
}
func From(err error) *Problem {
	var p *Problem
	if errors.As(err, &p) {
		return p
	}
	return Internal()
}
