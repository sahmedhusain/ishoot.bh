// IT roles and what they may do (catalog/it-access.json). The services check the same rules (backend/pkg/authz);
// the IT dashboard uses them only to show the actions a person can take.
import access from "../catalog/it-access.json";

type Rules = Record<string, Record<string, string[]>>;
const rules = access.defaultRoleRules as Rules;

export const IT_ROLES: readonly string[] = access.roles;

/** True when one of the roles allows the action on the resource. */
export const itAllowed = (
  roles: readonly string[],
  resource: string,
  action: string,
) => roles.some((role) => rules[role]?.[resource]?.includes(action) ?? false);
