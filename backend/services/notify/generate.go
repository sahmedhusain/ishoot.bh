// Package notify delivers the platform's e-mail and WhatsApp messages: callers queue a message, a worker sends it
// through the configured provider with retries, and each outcome is announced as an event (ADR 0003).
package notify

//go:generate go run github.com/sqlc-dev/sqlc/cmd/sqlc@v1.31.1 generate
