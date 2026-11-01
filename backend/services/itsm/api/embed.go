// Package api embeds the itsm OpenAPI document.
package api

import _ "embed"

// OpenAPI is the service's contract.
//
//go:embed openapi.yaml
var OpenAPI []byte
