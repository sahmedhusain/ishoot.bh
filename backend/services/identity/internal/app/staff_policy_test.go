package app

import (
	"encoding/json"
	"os"
	"testing"

	"github.com/stretchr/testify/require"

	"platform.local/backend/pkg/catalog"
)

func TestStaffPolicyParity(t *testing.T) {
	raw, err := os.ReadFile("../../../../contracts/fixtures/staff-access.v1.json")
	require.NoError(t, err)
	var cases []struct {
		Name         string
		Role         string
		Stored       map[string]bool
		Overrides    map[string]bool
		Modules      map[string]bool
		StoredScopes map[string]string
		Permissions  map[string]bool
		Scopes       map[string]string
		Absent       []string
	}
	require.NoError(t, json.Unmarshal(raw, &cases))
	require.NotEmpty(t, cases)
	for _, tc := range cases {
		t.Run(tc.Name, func(t *testing.T) {
			permissions := StaffPermissions(tc.Role, tc.Stored, tc.Overrides, tc.Modules)
			scopes := StaffScopes(tc.Role, tc.StoredScopes)
			require.Len(t, permissions, len(catalog.StaffAccess.Resources)*len(catalog.StaffAccess.Actions))
			require.Len(t, scopes, len(catalog.Scopes.Areas))
			for key, want := range tc.Permissions {
				require.Contains(t, permissions, key)
				require.Equal(t, want, permissions[key], key)
			}
			for key, want := range tc.Scopes {
				require.Equal(t, want, scopes[key], key)
			}
			for _, key := range tc.Absent {
				require.NotContains(t, permissions, key)
			}
			if tc.Role == catalog.SuperAdminRole {
				for key, allowed := range permissions {
					require.True(t, allowed, key)
				}
			}
		})
	}
}

func TestStaffPolicyProvisionedTemplates(t *testing.T) {
	modules := map[string]bool{}
	for _, module := range catalog.Modules {
		modules[module.Key] = true
	}
	for _, role := range catalog.StaffAccess.Roles {
		t.Run(role, func(t *testing.T) {
			stored := map[string]bool{}
			for _, resource := range catalog.StaffAccess.Resources {
				for _, action := range catalog.StaffAccess.Actions {
					stored[resource+":"+action] = catalog.StaffAccess.DefaultAllows(role, resource, action)
				}
			}
			require.Equal(t, stored, StaffPermissions(role, stored, nil, modules))
			for key, allowed := range StaffPermissions(role, nil, nil, modules) {
				require.Equal(t, role == catalog.SuperAdminRole, allowed, key)
			}
		})
	}
}
