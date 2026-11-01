// Package migrations embeds the files service's SQL migrations.
package migrations

import "embed"

// FS holds the migration files.
//
//go:embed *.sql
var FS embed.FS
