package api
import (
	"context"
	"testing"
	"github.com/getkin/kin-openapi/openapi3"
	"github.com/stretchr/testify/require"
	"platform.local/backend/pkg/catalog"
)
func TestContract(t *testing.T) {
	loader := openapi3.NewLoader()
	spec, err := loader.LoadFromData(OpenAPI)
	require.NoError(t, err)
	require.NoError(t, spec.Validate(context.Background()))
	roles := spec.Components.Schemas["ITRole"].Value.Enum
	require.Len(t, roles, len(catalog.ITAccess.Roles))
	for _, role := range catalog.ITAccess.Roles {
		require.Contains(t, roles, role)
	}
}
