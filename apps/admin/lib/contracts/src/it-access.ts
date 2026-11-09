import access from "../catalog/it-access.json";

type Rules = Record<string, Record<string, string[]>>;
const rules = access.defaultRoleRules as Rules;

export const IT_ROLES: readonly string[] = access.roles;

export const itAllowed = (
  roles: readonly string[],
  resource: string,
  action: string,
) => roles.some((role) => rules[role]?.[resource]?.includes(action) ?? false);
