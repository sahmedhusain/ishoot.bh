// Package audit keeps the platform's audit trail: every event the services publish (ADR 0003), append-only, for IT
// to search from the IT dashboard (ADR 0010).
package audit

//go:generate go run github.com/sqlc-dev/sqlc/cmd/sqlc@v1.31.1 generate
