/** Role changes priority, while resource permissions always decide visibility. */
export function sidebarGroupOrder(role?: string): string[] {
  const all = [
    "workspace",
    "sales",
    "operations",
    "finance",
    "people",
    "personal",
    "communications",
    "content",
    "administration",
  ];
  const priorities: Record<string, string[]> = {
    super_admin: [
      "workspace",
      "sales",
      "finance",
      "people",
      "operations",
      "communications",
      "personal",
    ],
    admin: [
      "workspace",
      "people",
      "operations",
      "finance",
      "sales",
      "communications",
      "personal",
    ],
    finance_manager: [
      "workspace",
      "finance",
      "people",
      "personal",
      "communications",
    ],
    accountant: ["workspace", "finance", "personal", "communications"],
    sales: ["workspace", "sales", "personal", "communications", "operations"],
    operations_manager: [
      "workspace",
      "operations",
      "sales",
      "people",
      "personal",
      "communications",
    ],
    project_lead: [
      "workspace",
      "operations",
      "sales",
      "personal",
      "communications",
    ],
    department_manager: ["workspace", "people", "operations", "sales", "communications", "personal"],
    hr_manager: ["workspace", "people", "communications", "personal"],
    hr_officer: ["workspace", "people", "communications", "personal"],
    sales_manager: ["workspace", "sales", "finance", "communications", "personal"],
    pr_officer: ["workspace", "content", "communications", "personal"],
    legal_counsel: ["workspace", "sales", "communications", "personal"],
    procurement_officer: ["workspace", "operations", "finance", "personal", "communications"],
    warehouse_keeper: ["workspace", "operations", "personal", "communications"],
    delivery_coordinator: ["workspace", "operations", "personal", "communications"],
    driver: ["workspace", "personal", "communications"],
    customer_service: ["workspace", "sales", "communications", "personal"],
    employee: ["workspace", "personal", "communications"],
    editor: ["workspace", "content", "operations", "personal", "communications"],
    marketing: ["workspace", "content", "sales", "communications", "personal"],
    viewer: ["workspace", "communications", "personal"],
  };
  return Array.from(
    new Set([
      ...(priorities[role ?? ""] ?? [
        "workspace",
        "personal",
        "communications",
      ]),
      ...all,
    ]),
  );
}
export function activeNavigationHref(
  hrefs: string[],
  pathname: string,
): string | undefined {
  return hrefs
    .filter((href) => {
      const path = href.split("?")[0];
      return (
        pathname === path ||
        (path !== "/dashboard" && pathname.startsWith(path + "/"))
      );
    })
    .sort((a, b) => b.split("?")[0].length - a.split("?")[0].length)[0];
}
