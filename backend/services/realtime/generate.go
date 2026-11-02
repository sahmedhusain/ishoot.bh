// Package realtime pushes live updates to the apps' browsers over Server-Sent Events and works out people's statuses
// (ADR 0012): services publish small hints on NATS core subjects, every replica writes them to its own connections.
package realtime

//go:generate go run github.com/sqlc-dev/sqlc/cmd/sqlc@v1.31.1 generate
