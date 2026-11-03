// Catalogue keys shared by the identity service and its IT editors.
import access from "../catalog/staff-access.json";
import scopes from "../catalog/data-scopes.json";
export const STAFF_RESOURCES: readonly string[] = access.resources;
export const STAFF_ACTIONS: readonly string[] = access.actions;
export const STAFF_SCOPE_AREAS: readonly string[] = scopes.areas;
export const STAFF_SCOPES: readonly string[] = scopes.scopes;
