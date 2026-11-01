// Package migrations embeds the identity service's schema migrations.
package migrations

import "embed"

// FS contains goose migrations.
//
//go:embed *.sql
var FS embed.FS
