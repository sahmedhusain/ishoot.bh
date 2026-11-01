// Package api embeds the identity OpenAPI contract.
package api

import _ "embed"

// OpenAPI is the session lifecycle contract.
//
//go:embed openapi.yaml
var OpenAPI []byte
