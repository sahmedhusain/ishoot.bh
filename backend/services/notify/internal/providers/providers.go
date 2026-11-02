// Package providers sends messages through e-mail and WhatsApp providers. Each error says whether trying again can
// help: a permanent one (a refused recipient, missing credentials) fails the message at once.
package providers

import (
	"context"
	"errors"
	"fmt"
)

// Attachment is a file sent with an e-mail.
type Attachment struct {
	Filename    string
	ContentType string
	Content     []byte
}

// Message is one message to deliver.
type Message struct {
	ID          string
	To          string
	Subject     string
	Text        string
	HTML        string
	Attachments []Attachment
}

// Result is the provider's acceptance.
type Result struct {
	Provider   string
	ProviderID string
}

// Sender delivers messages of one channel.
type Sender interface {
	Send(ctx context.Context, msg Message) (Result, error)
}

// PermanentError is a failure retrying cannot fix.
type PermanentError struct{ Err error }

func (e *PermanentError) Error() string { return e.Err.Error() }
func (e *PermanentError) Unwrap() error { return e.Err }

// Permanent wraps err as a failure retrying cannot fix.
func Permanent(format string, args ...any) error {
	return &PermanentError{Err: fmt.Errorf(format, args...)}
}

// IsPermanent reports whether err is permanent.
func IsPermanent(err error) bool {
	var p *PermanentError
	return errors.As(err, &p)
}

// httpStatusError classifies a provider's HTTP answer: 4xx other than 408 and 429 are permanent.
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
