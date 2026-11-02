// Package api embeds the cms OpenAPI document.
package api

import _ "embed"

// OpenAPI is the service's contract.
//
//go:embed openapi.yaml
var OpenAPI []byte
