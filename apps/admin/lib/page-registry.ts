import type { LucideIcon } from "lucide-react";
import {
  ArrowRightLeft, BadgeDollarSign, BarChart, Boxes, Building2, Calendar, CalendarCheck, CarFront,
  ClipboardCheck, ClipboardList, Code2, Coins, Contact, CreditCard, FileBarChart, FileCheck2, FileQuestion,
  FileSignature, FileText, Film, FolderKanban, FolderOpen, FolderTree, Gauge, Globe, HandCoins, HandHeart,
  Headset, HelpCircle, History, Kanban, Key, Landmark, Laptop, LayoutDashboard, ListTodo, MapPinned, Megaphone, Menu,
  MessageSquareQuote, Navigation, Network, Newspaper, Package, PieChart, Receipt, Route, Scale, ScanLine,
  Settings, Settings2, ShieldAlert, ShieldCheck, ShoppingBag, ShoppingCart, SlidersHorizontal, Sparkles, Store,
  Timer, ToggleLeft, TrendingUp, Truck, UserCircle, Users, Users2, Warehouse, Bell, Mail,
} from "lucide-react";

/** Sidebar group a page belongs to; its label (t.navigationGroups) is the eyebrow above the page title. */
type PageGroup =
  | "workspace" | "sales" | "store" | "products" | "procurement" | "delivery" | "work" | "operations"
  | "finance" | "people" | "personal" | "communications" | "marketing" | "legal" | "content" | "administration";

interface PageSection {
  icon: LucideIcon;
  group: PageGroup;
}

/**
 * Every dashboard section, keyed by its route under /dashboard ("" is the home page). Detail, new and edit pages
 * inherit the icon and group of the nearest section above them. Icons match the sidebar.
 */
const SECTIONS: Record<string, PageSection> = {
  "": { icon: LayoutDashboard, group: "workspace" },
  notifications: { icon: Bell, group: "workspace" },
  calendar: { icon: Calendar, group: "workspace" },
  reports: { icon: FileBarChart, group: "workspace" },
  analytics: { icon: TrendingUp, group: "content" },
  approvals: { icon: ShieldAlert, group: "workspace" },
  directory: { icon: Contact, group: "people" },
  "directory/org": { icon: Network, group: "people" },
  team: { icon: Gauge, group: "people" },
  department: { icon: Building2, group: "people" },

  "crm/contacts": { icon: Users, group: "sales" },
  "crm/customers": { icon: Users, group: "sales" },
  "crm/deals": { icon: Kanban, group: "sales" },
  "crm/leads": { icon: Kanban, group: "sales" },
  requests: { icon: ShieldAlert, group: "sales" },
  "requests/settings": { icon: Timer, group: "sales" },
  quotations: { icon: FileSignature, group: "sales" },
  services: { icon: Sparkles, group: "sales" },
  moms: { icon: FileSignature, group: "sales" },

  invoices: { icon: FileText, group: "finance" },
  payments: { icon: CreditCard, group: "finance" },
  expenses: { icon: Receipt, group: "finance" },
  finance: { icon: PieChart, group: "finance" },
  "finance/reports": { icon: BarChart, group: "finance" },
  "finance/commissions": { icon: BadgeDollarSign, group: "finance" },

  products: { icon: Package, group: "products" },
  "products/categories": { icon: FolderTree, group: "products" },
  inventory: { icon: Boxes, group: "products" },
  "inventory/movements": { icon: History, group: "products" },
  "inventory/transfers": { icon: Truck, group: "products" },
  "inventory/counts": { icon: ClipboardCheck, group: "products" },
  "inventory/warehouses": { icon: Warehouse, group: "products" },

  orders: { icon: ShoppingBag, group: "store" },
  "orders/new": { icon: ScanLine, group: "store" },
  "orders/settings": { icon: Store, group: "store" },

  "procurement/requisitions": { icon: ClipboardList, group: "procurement" },
  "procurement/rfqs": { icon: FileQuestion, group: "procurement" },
  "procurement/orders": { icon: ShoppingCart, group: "procurement" },
  "procurement/bills": { icon: Receipt, group: "procurement" },
  "procurement/suppliers": { icon: Truck, group: "procurement" },

  delivery: { icon: Truck, group: "delivery" },
  driver: { icon: Navigation, group: "delivery" },
  "delivery/routes": { icon: Route, group: "delivery" },
  "delivery/cash": { icon: Coins, group: "delivery" },
  "delivery/fleet": { icon: CarFront, group: "delivery" },
  "delivery/agencies": { icon: Package, group: "delivery" },
  "delivery/settings": { icon: MapPinned, group: "delivery" },

  tasks: { icon: ListTodo, group: "work" },
  "tasks/projects": { icon: FolderKanban, group: "work" },

  assets: { icon: Laptop, group: "operations" },
  legal: { icon: Scale, group: "legal" },
  marketing: { icon: Megaphone, group: "marketing" },
  "marketing/audience": { icon: Users2, group: "marketing" },
  press: { icon: Newspaper, group: "marketing" },

  hr: { icon: Users, group: "people" },
  "hr/employees": { icon: Users, group: "people" },
  "hr/leave": { icon: Calendar, group: "people" },
  "hr/documents": { icon: FileText, group: "people" },
  "hr/requests": { icon: ClipboardList, group: "people" },
  "hr/handovers": { icon: ArrowRightLeft, group: "people" },
  "hr/attendance": { icon: CalendarCheck, group: "people" },
  "hr/payroll": { icon: CreditCard, group: "people" },
  "hr/gosi": { icon: Landmark, group: "people" },
  "hr/pensions": { icon: Landmark, group: "people" },
  "hr/supports": { icon: HandHeart, group: "people" },
  "hr/settlements": { icon: FileCheck2, group: "people" },
  "hr/settings": { icon: Settings2, group: "people" },

  claims: { icon: HandCoins, group: "personal" },
  "it-support": { icon: Headset, group: "personal" },
  profile: { icon: UserCircle, group: "personal" },

  announcements: { icon: Megaphone, group: "communications" },
  letters: { icon: Mail, group: "communications" },
  archive: { icon: FolderOpen, group: "communications" },
  "company/documents": { icon: FolderOpen, group: "communications" },

  "cms/website": { icon: Globe, group: "content" },
  "cms/pages": { icon: FileText, group: "content" },
  "cms/articles": { icon: Newspaper, group: "content" },
  "cms/menus": { icon: Menu, group: "content" },
  "cms/code": { icon: Code2, group: "content" },
  "cms/banners": { icon: Film, group: "content" },
  "cms/portfolio": { icon: FolderOpen, group: "content" },
  "cms/clients": { icon: Users, group: "content" },
  "cms/equipment": { icon: Building2, group: "content" },
  "cms/reviews": { icon: MessageSquareQuote, group: "content" },
  "cms/faqs": { icon: HelpCircle, group: "content" },
  "cms/stats": { icon: BarChart, group: "content" },

  settings: { icon: Settings, group: "administration" },
  "settings/web": { icon: Globe, group: "administration" },
  "settings/company": { icon: Building2, group: "administration" },
  "settings/modules": { icon: ToggleLeft, group: "administration" },
  "settings/roles": { icon: Key, group: "administration" },
  "settings/audit": { icon: FileText, group: "administration" },
  "settings/approvals": { icon: ShieldCheck, group: "administration" },
  "settings/departments": { icon: Building2, group: "administration" },
  "settings/pipeline": { icon: Kanban, group: "administration" },
  "settings/integrations": { icon: Settings, group: "administration" },
  "settings/security": { icon: ShieldCheck, group: "administration" },
  "settings/preferences": { icon: SlidersHorizontal, group: "personal" },
  users: { icon: ShieldCheck, group: "administration" },
};

/**
 * Route patterns of every dashboard page, as their folders are named ("invoices/[id]"); each has a title and a
 * description under `pages` in the admin dictionaries. A test keeps this list in step with app/dashboard.
 */
const PAGE_KEYS = [
  "", "analytics", "announcements", "announcements/[id]", "announcements/new", "approvals", "approvals/[type]/[id]",
  "archive", "assets", "assets/[id]", "assets/categories", "assets/handovers/[id]", "assets/new", "calendar", "claims",
  "claims/new", "cms/articles", "cms/articles/[id]", "cms/banners", "cms/clients", "cms/code", "cms/equipment",
  "cms/faqs", "cms/menus", "cms/pages", "cms/pages/[id]", "cms/portfolio", "cms/reviews", "cms/stats", "cms/website",
  "company/documents", "company/documents/new", "crm/contacts", "crm/customers/[id]", "crm/customers/[id]/edit",
  "crm/customers/new", "crm/deals", "crm/deals/[id]", "crm/deals/[id]/edit", "crm/deals/new", "crm/leads", "delivery",
  "delivery/[id]", "delivery/agencies", "delivery/cash", "delivery/fleet", "delivery/routes", "delivery/routes/[id]",
  "delivery/settings", "department", "directory", "directory/org", "driver", "expenses", "expenses/categories",
  "expenses/new", "expenses/recurring", "finance", "finance/commissions", "finance/reports", "hr", "hr/attendance",
  "hr/documents", "hr/employees", "hr/employees/[id]", "hr/employees/import", "hr/employees/new", "hr/gosi",
  "hr/handovers", "hr/handovers/[id]", "hr/leave", "hr/payroll", "hr/payroll/items/[id]", "hr/pensions",
  "hr/requests", "hr/settings", "hr/settlements", "hr/settlements/[id]", "hr/settlements/new", "hr/supports",
  "inventory", "inventory/counts", "inventory/counts/[id]", "inventory/movements", "inventory/transfers",
  "inventory/warehouses", "invoices", "invoices/[id]", "invoices/[id]/edit", "invoices/new", "it-support",
  "it-support/[id]", "it-support/new", "legal", "legal/[id]",
  "letters", "letters/[id]", "letters/new", "letters/templates", "marketing", "marketing/audience", "moms",
  "moms/[id]", "moms/new", "notifications", "orders", "orders/[id]", "orders/new", "orders/settings", "payments",
  "payments/[id]", "payments/new", "press", "procurement/bills", "procurement/bills/[id]", "procurement/bills/new",
  "procurement/orders", "procurement/orders/[id]", "procurement/orders/new", "procurement/requisitions",
  "procurement/requisitions/[id]", "procurement/requisitions/new", "procurement/rfqs", "procurement/rfqs/[id]",
  "procurement/suppliers", "products", "products/[id]", "products/categories", "products/new", "profile",
  "quotations", "quotations/[id]", "quotations/new", "reports", "reports/[key]", "requests", "requests/[id]",
  "requests/new", "requests/settings", "services", "settings", "settings/approvals", "settings/audit",
  "settings/company", "settings/departments", "settings/integrations", "settings/modules", "settings/pipeline",
  "settings/preferences", "settings/roles", "settings/security", "settings/web", "tasks", "tasks/[id]",
  "tasks/projects", "tasks/projects/[id]", "team", "users", "users/new",
] as const;

export type PageKey = (typeof PAGE_KEYS)[number];

const DASHBOARD = "/dashboard";
const dynamicSegment = /^\[[^\]]+\]$/;
// Literal routes first, so "orders/new" wins over "orders/[id]".
const MATCH_ORDER = [...PAGE_KEYS].sort(
  (a, b) => a.split("/").filter((s) => dynamicSegment.test(s)).length - b.split("/").filter((s) => dynamicSegment.test(s)).length,
);

/** The page pattern a dashboard pathname was served from, or null outside the dashboard. */
export function pageKeyForPath(pathname: string): PageKey | null {
  const clean = pathname.replace(/[?#].*$/, "").replace(/\/+$/, "");
  if (clean !== DASHBOARD && !clean.startsWith(`${DASHBOARD}/`)) return null;
  const parts = clean.slice(DASHBOARD.length).split("/").filter(Boolean);
  for (const key of MATCH_ORDER) {
    const pattern = key ? key.split("/") : [];
    if (pattern.length === parts.length && pattern.every((segment, i) => dynamicSegment.test(segment) || segment === parts[i]))
      return key;
  }
  return null;
}

/** Icon and sidebar group of a page: its own section, or the nearest section above it. */
export function pageSection(key: PageKey): PageSection {
  const parts = key ? key.split("/") : [];
  for (let length = parts.length; length >= 0; length--) {
    const section = SECTIONS[parts.slice(0, length).filter((segment) => !dynamicSegment.test(segment)).join("/")];
    if (section) return section;
  }
  return SECTIONS[""];
}
