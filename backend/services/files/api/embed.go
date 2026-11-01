// Package api embeds the files service's OpenAPI document.
package api

import _ "embed"

// OpenAPI is the service's contract (served at /v1/files/openapi.yaml and used by contract tests).
//
//go:embed openapi.yaml
var OpenAPI []byte
