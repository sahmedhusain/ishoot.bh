// Package api embeds the system OpenAPI document.
package api

import _ "embed"

// OpenAPI is the service's contract.
//
//go:embed openapi.yaml
var OpenAPI []byte
