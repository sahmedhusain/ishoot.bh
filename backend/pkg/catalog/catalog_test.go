package catalog

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestDataMatchesContracts fails when contracts/catalog changed but `go generate ./pkg/catalog` was not run.
func TestDataMatchesContracts(t *testing.T) {
	sources, err := filepath.Glob("../../../contracts/catalog/*.json")
	require.NoError(t, err)
	require.NotEmpty(t, sources)
	copies, err := filepath.Glob("data/*.json")
	require.NoError(t, err)
	assert.Len(t, copies, len(sources), "run: go generate ./pkg/catalog")
	for _, source := range sources {
		want, err := os.ReadFile(source)
		require.NoError(t, err)
		got, err := os.ReadFile(filepath.Join("data", filepath.Base(source)))
		require.NoError(t, err, "run: go generate ./pkg/catalog")
		assert.Equal(t, string(want), string(got), "%s is stale; run: go generate ./pkg/catalog", filepath.Base(source))
	}
}

func TestStaffAccess(t *testing.T) {
	assert.True(t, StaffAccess.DefaultAllows("super_admin", "invoices", "delete"))
	assert.True(t, StaffAccess.DefaultAllows("admin", "invoices", "create"))
	assert.False(t, StaffAccess.DefaultAllows("viewer", "invoices", "delete"))
	assert.Equal(t, "operations_manager", StaffAccess.CanonicalRole("production_manager"))
	module, ok := StaffAccess.ModuleOf("invoices")
	assert.True(t, ok)
	assert.Equal(t, "invoicing", module)
}

func TestITAccessHasNoImplicitSuperUser(t *testing.T) {
	assert.False(t, ITAccess.DefaultAllows("super_admin", "logs", "read"))
	assert.True(t, ITAccess.DefaultAllows("it_admin", "integrations", "edit"))
	assert.False(t, ITAccess.DefaultAllows("it_auditor", "integrations", "edit"))
}

func TestModulesAndScopes(t *testing.T) {
	assert.True(t, ModuleEnabledByDefault("invoicing"))
	assert.False(t, ModuleEnabledByDefault("store"))
	assert.True(t, ModuleEnabledByDefault("not-listed"))
	assert.Equal(t, "own", Scopes.DefaultScope("employee", "leave"))
	assert.Equal(t, "all", Scopes.DefaultScope("super_admin", "leave"))
	assert.Equal(t, "all", Scopes.DefaultScope("sales", "deals"))
}

func TestTicketWorkflow(t *testing.T) {
	next, ok := Tickets.Next("new", "triage")
	assert.True(t, ok)
	assert.Equal(t, "triaged", next)
	_, ok = Tickets.Next("closed", "start")
	assert.False(t, ok)
	assert.True(t, Tickets.IsOpen("in_progress"))
	assert.False(t, Tickets.IsOpen("resolved"))
	hardware, ok := Tickets.Category("hardware")
	require.True(t, ok)
	assert.True(t, hardware.LinksAsset)
	assert.Len(t, Tickets.Categories, 4)
}

func TestValidationCatchesBrokenData(t *testing.T) {
	broken := Access{Resources: []string{"a"}, Actions: []string{"read"}, Roles: []string{"r"},
		DefaultRoleRules: map[string]map[string][]string{"r": {"b": {"read"}}}}
	assert.Error(t, broken.validate("test"))

	tickets := Tickets
	tickets.Transitions = map[string]Transition{"x": {From: []string{"new"}, To: "nowhere"}}
	assert.Error(t, tickets.validate())
}
