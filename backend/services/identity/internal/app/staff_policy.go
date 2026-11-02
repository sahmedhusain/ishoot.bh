package app

import (
	"slices"

	"platform.local/backend/pkg/catalog"
)

// StaffPermissions evaluates stored grants, user overrides and module availability using the legacy staff rules.
// Missing grants are denied; role-template grants must be persisted by provisioning, not inferred here.
// Callers must authenticate the live account and successfully load module availability before using the result.
func StaffPermissions(role string, stored, overrides, modules map[string]bool) map[string]bool {
	result := make(map[string]bool, len(catalog.StaffAccess.Resources)*len(catalog.StaffAccess.Actions))
	for _, resource := range catalog.StaffAccess.Resources {
		for _, action := range catalog.StaffAccess.Actions {
			key := resource + ":" + action
			if role == catalog.SuperAdminRole {
				result[key] = true
				continue
			}
			allowed, found := stored[key]
			if !found && (action == "create" || action == "edit") {
				allowed = stored[resource+":write"]
			}
			if override, found := overrides[key]; found {
				allowed = override
			}
			if module, gated := catalog.StaffAccess.ModuleOf(resource); gated {
				enabled, configured := modules[module]
				if !configured {
					enabled = catalog.ModuleEnabledByDefault(module)
				}
				allowed = allowed && enabled
			}
			result[key] = allowed
		}
	}
	return result
}

// StaffScopes returns the role's scope policy; resolving department membership belongs to the directory owner.
func StaffScopes(role string, stored map[string]string) map[string]string {
	result := make(map[string]string, len(catalog.Scopes.Areas))
	for _, area := range catalog.Scopes.Areas {
		scope := catalog.Scopes.DefaultScope(role, area)
		if role != catalog.SuperAdminRole && slices.Contains(catalog.Scopes.Scopes, stored[area]) {
			scope = stored[area]
		}
		result[area] = scope
	}
	return result
}
