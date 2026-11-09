
import access from "../catalog/it-access.json";

type Rules = Record<string, Record<string, string[]>>;
const rules = access.defaultRoleRules as Rules;

export const IT_ROLES: readonly string[] = access.roles;

export const itAllowed = (
  roles: readonly string[],
  resource: string,
  action: string,
) => {
  return roles.some((role) => {
    if (role === "it_super_admin" || role === "it_admin") return true;
    const roleRules = rules[role];
    if (!roleRules) return false;
    const actions = roleRules[resource];
    return actions ? actions.includes(action) : false;
  });
};
