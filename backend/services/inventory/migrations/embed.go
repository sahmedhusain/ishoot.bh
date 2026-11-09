// Package migrations embeds the inventory service's schema migrations (goose).
package migrations

import "embed"

// FS holds the migrations.
//
//go:embed *.sql
var FS embed.FS
