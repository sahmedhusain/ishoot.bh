// Package api embeds the realtime service's OpenAPI document.
package api

import _ "embed"

// OpenAPI is the service's HTTP contract.
//
//go:embed openapi.yaml
var OpenAPI []byte
