export type DashboardFocus =
  "executive" | "finance" | "hr" | "sales" | "production" | "staff";

export function dashboardFocus(
  role: string,
  grants: Record<string, boolean>,
): DashboardFocus {
  const can = (key: string) => grants[key] === true;
  if (
    role === "super_admin" ||
    role === "admin" ||
    (can("finance_analytics:read") && can("settings:read"))
  )
    return "executive";
  if (can("finance_analytics:read")) return "finance";
  if (can("employees:approve") || can("payroll:write")) return "hr";
  if (can("requests:assign")) return "production";
  if (can("deals:create") || can("quotations:write")) return "sales";
  return "staff";
}
