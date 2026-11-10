package api_test

import (
	"context"
	"testing"

	"github.com/getkin/kin-openapi/openapi3"
	"github.com/stretchr/testify/require"

	"platform.local/backend/services/itsm/api"
)

func TestOpenAPISpec(t *testing.T) {
	loader := openapi3.NewLoader()
	doc, err := loader.LoadFromData(api.OpenAPI)
	require.NoError(t, err, "failed to load OpenAPI spec")
	require.NotNil(t, doc, "parsed OpenAPI spec should not be nil")
	err = doc.Validate(context.Background())
	require.NoError(t, err, "OpenAPI spec validation failed")
}
