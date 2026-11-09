// Package api embeds the inventory service's OpenAPI specification.
package api

import _ "embed"

// OpenAPI is the raw OpenAPI 3.1 YAML document for the inventory service.
//
//go:embed openapi.yaml
var OpenAPI []byte
