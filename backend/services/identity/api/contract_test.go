package api

import (
	"context"
	"testing"

	"github.com/getkin/kin-openapi/openapi3"
	"github.com/stretchr/testify/require"
)

func TestContract(t *testing.T) {
	loader := openapi3.NewLoader()
	spec, err := loader.LoadFromData(OpenAPI)
	require.NoError(t, err)
	require.NoError(t, spec.Validate(context.Background()))
}
