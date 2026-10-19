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
    production_manager: [
      "workspace",
      "operations",
      "sales",
      "people",
      "personal",
      "communications",
    ],
    producer: [
      "workspace",
      "operations",
      "sales",
      "personal",
      "communications",
    ],
    editor: ["workspace", "operations", "personal", "communications"],
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
