package providers
import (
	"context"
	"errors"
	"fmt"
)
type Attachment struct {
	Filename	string
	ContentType	string
	Content		[]byte
}
type Message struct {
	ID		string
	To		string
	Subject		string
	Text		string
	HTML		string
	Attachments	[]Attachment
}
type Result struct {
	Provider	string
	ProviderID	string
}
type Sender interface {
	Send(ctx context.Context, msg Message) (Result, error)
}
type PermanentError struct{ Err error }
func (e *PermanentError) Error() string	{ return e.Err.Error() }
func (e *PermanentError) Unwrap() error	{ return e.Err }
func Permanent(format string, args ...any) error {
	return &PermanentError{Err: fmt.Errorf(format, args...)}
}
func IsPermanent(err error) bool {
	var p *PermanentError
	return errors.As(err, &p)
}
func httpStatusError(provider string, status int, body string) error {
	err := fmt.Errorf("%s answered %d: %s", provider, status, truncate(body, 300))
	if status >= 400 && status < 500 && status != 408 && status != 429 {
		return &PermanentError{Err: err}
	}
	return err
}
func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n]
}
