"use client";

import { ROUTES } from "../../constants/routes";
import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useAdminTheme } from "../../hooks/useAdminTheme";
import { Button, useDialog } from "@platform/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Laptop,
  Bell,
  Megaphone,
  ChevronDown,
  ArrowRightLeft,
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingBag,
  FileBarChart,
  Scale,
  Users2,
  Timer,
  ListTodo,
  FolderKanban,
  MapPinned,
  Navigation,
  Route,
  Coins,
  CarFront,
  ScanLine,
  Store,
  FileQuestion,
  ShoppingCart,
  Truck,
  Boxes,
  History,
  ClipboardCheck,
  Warehouse,
  Calendar,
  Kanban,
  Users,
  FileText,
  CreditCard,
  Receipt,
  PieChart,
  Film,
  Building2,
  ShieldCheck,
  Sparkles,
  FolderOpen,
  MessageSquareQuote,
  HelpCircle,
  BarChart,
  Key,
  Globe,
  FileSignature,
  ShieldAlert,
  TrendingUp,
  HandCoins,
  Headset,
  CalendarCheck,
  Settings2,
  BadgeDollarSign,
  Contact,
  Gauge,
  Landmark,
  HandHeart,
  FileCheck2,
  ClipboardList,
  Newspaper,
  Menu,
  
  SlidersHorizontal,
  Star,
  X,
} from "lucide-react";
import { usePermissions, PermissionResource } from "../../hooks/usePermissions";
import { useSidebar } from "./SidebarContext";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import {
  sidebarGroupOrder,
  activeNavigationHref,
  defaultSidebarCustomization,
  normalizeSidebarCustomization,
  type SidebarCustomizationConfig,
} from "../../lib/sidebar-navigation";
import { useFeatureToggles } from "../../hooks/useFeatureToggles";
import { SidebarCustomizerModal } from "./SidebarCustomizerModal";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  resource?: PermissionResource;
  /** Permission needed on the resource (default read). */
  action?: "read" | "edit" | "create" | "assign";
  moduleKey?: string;
  /** Only for people who manage a team. */
  managersOnly?: boolean;
  /** Only for super administrators (governance pages). */
  superAdminOnly?: boolean;
}

interface NavSection {
  id: string;
  title: string;
  items: NavItem[];
}

export function Sidebar() {
  const pathname = usePathname();
  const { can, managesTeam, role, user } = usePermissions();
  const { isMobileOpen, setIsMobileOpen, isCollapsed } = useSidebar();
  const { t, isRTL } = useAdminLocale();
  const { appearance } = useAdminTheme();
  const systemReducedMotion = useReducedMotion();
  const reduceMotion = systemReducedMotion || appearance.motion !== "system";
  const mobileDialog = useDialog(isMobileOpen, () => setIsMobileOpen(false));
  React.useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const close = () => { if (desktop.matches) setIsMobileOpen(false); };
    close(); desktop.addEventListener("change", close);
    return () => desktop.removeEventListener("change", close);
  }, [setIsMobileOpen]);
  const { isFeatureEnabled } = useFeatureToggles();
  const [folded, setFolded] = React.useState<Record<string, boolean>>({});
  const [customizerOpen, setCustomizerOpen] = React.useState(false);
  const storageKey = `platform_navigation_${user?.id ?? "guest"}`;
  const customStorageKey = `platform_sidebar_custom_${user?.id ?? "guest"}`;
  const [customConfig, setCustomConfig] = React.useState<SidebarCustomizationConfig>(() =>
    defaultSidebarCustomization(role),
  );
  React.useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "{}");
      setFolded(
        saved && typeof saved === "object" && !Array.isArray(saved)
          ? (Object.fromEntries(
            Object.entries(saved).filter(
              ([, value]) => typeof value === "boolean",
            ),
          ) as Record<string, boolean>)
          : {},
      );
    } catch {
      setFolded({});
    }
    try {
      const rawCustom = localStorage.getItem(customStorageKey);
      if (rawCustom) {
        setCustomConfig(normalizeSidebarCustomization(JSON.parse(rawCustom), role));
      } else {
        setCustomConfig(defaultSidebarCustomization(role));
      }
    } catch {
      setCustomConfig(defaultSidebarCustomization(role));
    }
  }, [storageKey, customStorageKey, role]);

  const handleSaveCustomConfig = (next: SidebarCustomizationConfig) => {
    const normalized = normalizeSidebarCustomization(next, role);
    setCustomConfig(normalized);
    try {
      localStorage.setItem(customStorageKey, JSON.stringify(normalized));
    } catch { }
  };

  const sections = React.useMemo<NavSection[]>(() => {
    const existing: Omit<NavSection, "id">[] = [
      {
        title: t.nav.overview,
        items: [
          { href: ROUTES.home, label: t.nav.dashboard, icon: LayoutDashboard },
          {
            href: ROUTES.notifications(),
            label: t.communications.notifications,
            icon: FileText,
          },
          {
            href: ROUTES.announcements.list(),
            label: t.communications.announcements,
            icon: FileText,
            resource: "announcements",
          },
          {
            href: ROUTES.letters.list(),
            label: t.communications.letters,
            icon: FileSignature,
            resource: "letters",
          },
          {
            href: ROUTES.directory,
            label: t.directory.title,
            icon: Contact,
          },
          {
            href: ROUTES.team,
            label: t.team.title,
            icon: Gauge,
            managersOnly: true,
          },
          {
            href: ROUTES.calendar,
            label: t.nav.calendar,
            icon: Calendar,
            resource: "calendar",
            moduleKey: "calendar",
          },
        ],
      },
      {
        title: t.nav.crm,
        items: [
          {
            href: ROUTES.crm.contacts,
            label: t.nav.contacts,
            icon: Users,
            resource: "contacts",
            moduleKey: "crm_deals",
          },
          {
            href: ROUTES.crm.deals,
            label: t.nav.deals,
            icon: Kanban,
            resource: "deals",
            moduleKey: "crm_deals",
          },
          {
            href: ROUTES.requests.list,
            label: t.requestInbox.title,
            icon: ShieldAlert,
            resource: "requests",
            moduleKey: "crm_deals",
          },
          {
            href: ROUTES.requests.settings,
            label: t.serviceDesk.nav,
            icon: Timer,
            resource: "requests",
            action: "edit",
            moduleKey: "crm_deals",
          },
          {
            href: ROUTES.moms.list,
            label: t.sidebar.minutesOfMeetingsMom,
            icon: FileSignature,
            resource: "moms",
            moduleKey: "crm_deals",
          },
        ],
      },
      {
        title: t.nav.finance,
        items: [
          {
            href: ROUTES.quotations.list,
            label: t.sidebar.quotations,
            icon: FileSignature,
            resource: "quotations",
            moduleKey: "invoicing",
          },
          {
            href: ROUTES.invoices.list,
            label: t.nav.invoices,
            icon: FileText,
            resource: "invoices",
            moduleKey: "invoicing",
          },
          {
            href: ROUTES.payments.list,
            label: t.nav.payments,
            icon: CreditCard,
            resource: "payments",
            moduleKey: "invoicing",
          },
          {
            href: ROUTES.expenses.list(),
            label: t.nav.expenses,
            icon: Receipt,
            resource: "expenses",
            moduleKey: "invoicing",
          },
          {
            href: ROUTES.services,
            label: t.nav.services,
            icon: Sparkles,
            resource: "invoices",
          },
          {
            href: ROUTES.finance.reports,
            label: t.sidebar.financialReports,
            icon: BarChart,
            resource: "reports",
            moduleKey: "invoicing",
          },
          {
            href: ROUTES.finance.commissions(),
            label: t.commissions.title,
            icon: BadgeDollarSign,
            resource: "reports",
          },
          {
            href: ROUTES.finance.overview,
            label: t.nav.analytics,
            icon: PieChart,
            resource: "finance_analytics",
            moduleKey: "invoicing",
          },
        ],
      },
      {
        title: t.sidebar.humanResources,
        items: [
          {
            href: ROUTES.hr.employees,
            label: t.sidebar.employeeDirectory,
            icon: Users,
            resource: "employees",
            moduleKey: "hrms",
          },
          // Leave and salary documents are self-service: every staff member files their own.
          {
            href: ROUTES.hr.leave(),
            label: t.sidebar.leaveManagement,
            icon: Calendar,
            resource: "self_service",
            moduleKey: "hrms",
          },
          {
            href: ROUTES.hr.documents(),
            label: t.hrExtensions.salaryDocuments,
            icon: FileText,
            resource: "self_service",
            moduleKey: "hrms",
          },
          {
            href: ROUTES.claims.list(),
            label: t.claims.title,
            icon: HandCoins,
            resource: "self_service",
          },
          {
            href: ROUTES.itSupport.list(),
            label: t.itSupport.title,
            icon: Headset,
            resource: "it_support",
          },
          {
            href: ROUTES.assets.list(),
            label: t.assets.navTitle,
            icon: Laptop,
            resource: "assets",
          },
          {
            href: ROUTES.hr.requests(),
            label: t.hrRequests.navTitle,
            icon: ClipboardList,
            resource: "employees",
            moduleKey: "hrms",
          },
          {
            href: ROUTES.hr.handovers(),
            label: t.employeeHandovers.navTitle,
            icon: ArrowRightLeft,
            resource: "employees",
            moduleKey: "hrms",
          },
          {
            href: ROUTES.hr.attendance,
            label: t.nav.attendance,
            icon: CalendarCheck,
            resource: "employees",
            moduleKey: "hrms",
          },
          {
            href: ROUTES.hr.payroll(),
            label: t.sidebar.payrollAndGosi,
            icon: CreditCard,
            resource: "payroll",
            moduleKey: "payroll",
          },
          {
            href: ROUTES.hr.gosi,
            label: t.gosi.title,
            icon: Landmark,
            resource: "payroll",
            moduleKey: "payroll",
          },
          {
            href: ROUTES.hr.supports(),
            label: t.supports.title,
            icon: HandHeart,
            resource: "payroll",
            moduleKey: "payroll",
          },
          {
            href: ROUTES.hr.settlements(),
            label: t.settlements.title,
            icon: FileCheck2,
            resource: "payroll",
            moduleKey: "payroll",
          },
          {
            href: ROUTES.hr.settings,
            label: t.nav.hrSettings,
            icon: Settings2,
            resource: "employees",
            action: "edit",
            moduleKey: "hrms",
          },
        ],
      },
      {
        title: t.sidebar.governance,
        items: [
          {
            href: ROUTES.approvals(),
            label: t.sidebar.approvalCenter,
            icon: ShieldAlert,
          },
          {
            href: ROUTES.profile(),
            label: t.sidebar.myProfile,
            icon: Users,
          },
        ],
      },
      {
        title: t.nav.cms,
        items: [
          {
            href: ROUTES.cms.website,
            label: t.sidebar.websitePublishing,
            icon: Globe,
            resource: "settings",
            moduleKey: "cms",
          },
          {
            href: ROUTES.cms.pages,
            label: t.nav.pages,
            icon: FileText,
            resource: "pages",
            moduleKey: "cms",
          },
          {
            href: ROUTES.cms.articles,
            label: t.nav.articles,
            icon: Newspaper,
            resource: "articles",
            moduleKey: "cms",
          },
          {
            href: ROUTES.cms.menus,
            label: t.nav.menus,
            icon: Menu,
            resource: "pages",
            action: "edit",
            moduleKey: "cms",
          },
          {
            href: ROUTES.cms.banners,
            label: t.nav.banners,
            icon: Film,
            resource: "banners",
            moduleKey: "cms",
          },
          {
            href: ROUTES.cms.portfolio,
            label: t.nav.portfolio,
            icon: FolderOpen,
            resource: "portfolio",
            moduleKey: "cms",
          },
          {
            href: ROUTES.cms.clients,
            label: t.nav.clients,
            icon: Users,
            resource: "clients",
            moduleKey: "cms",
          },
          {
            href: ROUTES.cms.equipment,
            label: t.nav.equipment,
            icon: Building2,
            resource: "equipment",
            moduleKey: "equipment",
          },
          {
            href: ROUTES.cms.reviews,
            label: t.nav.reviews,
            icon: MessageSquareQuote,
            resource: "reviews",
            moduleKey: "reviews",
          },
          {
            href: ROUTES.cms.faqs,
            label: t.nav.faqs,
            icon: HelpCircle,
            resource: "faqs",
            moduleKey: "cms",
          },
          {
            href: ROUTES.cms.stats,
            label: t.nav.stats,
            icon: BarChart,
            resource: "stats",
            moduleKey: "cms",
          },
          {
            href: ROUTES.analytics,
            label: t.nav.socialAnalytics,
            icon: TrendingUp,
            resource: "social",
          },
        ],
      },
      {
        title: t.nav.system,
        items: [
          {
            href: ROUTES.settings.web,
            label: t.nav.webSettings,
            icon: Globe,
            resource: "settings",
          },
          {
            href: ROUTES.settings.company,
            label: t.nav.companySettings,
            icon: Building2,
            resource: "settings",
          },
          {
            href: ROUTES.settings.roles,
            label: t.nav.roles,
            icon: Key,
            resource: "users",
            superAdminOnly: true,
          },
          {
            href: ROUTES.users.list,
            label: t.nav.users,
            icon: ShieldCheck,
            resource: "users",
          },
          {
            href: ROUTES.settings.audit,
            label: t.nav.auditLogs,
            icon: FileText,
            resource: "audit_logs",
          },
        ],
      },
    ];
    const all = existing.flatMap((group) => group.items);
    const take = (urls: string[]) =>
      urls
        .map((href) => all.find((item) => item.href === href))
        .filter((item): item is NavItem => !!item);
    const groups: NavSection[] = [
      {
        id: "workspace",
        title: t.navigationGroups.workspace,
        items: [
          ...take([ROUTES.home, ROUTES.approvals(), ROUTES.calendar, ROUTES.team]),
          // Everyone sees Reports; the page lists only the reports their role may run.
          { href: ROUTES.reports.list, label: t.reports.nav, icon: FileBarChart },
        ],
      },
      {
        id: "sales",
        title: t.navigationGroups.sales,
        items: take([
          ROUTES.crm.deals,
          ROUTES.crm.contacts,
          ROUTES.requests.list,
          ROUTES.requests.settings,
          ROUTES.quotations.list,
          ROUTES.services,
        ]),
      },
      {
        id: "products",
        title: t.navigationGroups.products,
        items: [
          { href: ROUTES.products.list, label: t.products.navTitle, icon: Package, resource: "products", moduleKey: "products" },
          { href: ROUTES.products.categories, label: t.products.navCategories, icon: FolderTree, resource: "products", moduleKey: "products" },
          { href: ROUTES.inventory.stock, label: t.inventory.nav.stock, icon: Boxes, resource: "inventory", moduleKey: "products" },
          { href: ROUTES.inventory.movements(), label: t.inventory.nav.movements, icon: History, resource: "inventory", moduleKey: "products" },
          { href: ROUTES.inventory.transfers, label: t.stockTransfers.title, icon: Truck, resource: "inventory", moduleKey: "products" },
          { href: ROUTES.inventory.counts, label: t.inventory.nav.counts, icon: ClipboardCheck, resource: "inventory", moduleKey: "products" },
          { href: ROUTES.inventory.warehouses, label: t.inventory.nav.warehouses, icon: Warehouse, resource: "inventory", moduleKey: "products" },
        ],
      },
      {
        id: "store",
        title: (t.navigationGroups as Record<string, string>).store ?? t.orders.navGroup,
        items: [
          { href: ROUTES.orders.list, label: t.orders.nav.orders, icon: ShoppingBag, resource: "orders", moduleKey: "store" },
          { href: ROUTES.orders.new, label: t.orders.nav.newSale, icon: ScanLine, resource: "orders", action: "create", moduleKey: "store" },
          { href: ROUTES.orders.settings, label: t.orders.nav.settings, icon: Store, resource: "settings", moduleKey: "store" },
        ],
      },
      {
        id: "marketing",
        title: (t.navigationGroups as Record<string, string>).marketing ?? t.permissionLabels.groups.outreach,
        items: [
          { href: ROUTES.marketing.campaigns, label: t.marketing.nav.campaigns, icon: Megaphone, resource: "marketing", moduleKey: "marketing" },
          { href: ROUTES.marketing.audience, label: t.marketing.nav.audience, icon: Users2, resource: "marketing", moduleKey: "marketing" },
          { href: ROUTES.press.overview, label: t.press.nav.overview, icon: Newspaper, resource: "press", moduleKey: "pr" },
        ],
      },
      {
        id: "legal",
        title: (t.navigationGroups as Record<string, string>).legal ?? t.legal.navGroup,
        items: [{ href: ROUTES.legal.matters, label: t.legal.nav.matters, icon: Scale, resource: "legal", moduleKey: "legal" }],
      },
      {
        id: "work",
        title: (t.navigationGroups as Record<string, string>).work ?? t.tasks.navGroup,
        items: [
          { href: ROUTES.tasks.list, label: t.tasks.nav.tasks, icon: ListTodo, resource: "tasks", moduleKey: "tasks" },
          { href: ROUTES.tasks.projects, label: t.tasks.nav.projects, icon: FolderKanban, resource: "tasks", moduleKey: "tasks" },
        ],
      },
      {
        id: "delivery",
        title: (t.navigationGroups as Record<string, string>).delivery ?? t.delivery.navGroup,
        items: [
          { href: ROUTES.delivery.driver, label: t.delivery.nav.driver, icon: Navigation, resource: "deliveries", action: "edit", moduleKey: "delivery" },
          { href: ROUTES.delivery.shipments, label: t.delivery.nav.shipments, icon: Truck, resource: "deliveries", moduleKey: "delivery" },
          { href: ROUTES.delivery.routes, label: t.delivery.nav.routes, icon: Route, resource: "deliveries", action: "assign", moduleKey: "delivery" },
          { href: ROUTES.delivery.cash, label: t.delivery.nav.cash, icon: Coins, resource: "deliveries", action: "assign", moduleKey: "delivery" },
          { href: ROUTES.delivery.fleet, label: t.delivery.nav.fleet, icon: CarFront, resource: "deliveries", action: "assign", moduleKey: "delivery" },
          { href: ROUTES.delivery.agencies, label: t.delivery.nav.agencies, icon: Package, resource: "deliveries", action: "assign", moduleKey: "delivery" },
          { href: ROUTES.delivery.settings, label: t.delivery.nav.settings, icon: MapPinned, resource: "settings", moduleKey: "delivery" },
        ],
      },
      {
        id: "procurement",
        title: (t.navigationGroups as Record<string, string>).procurement ?? t.procurement.navGroup,
        items: [
          { href: ROUTES.procurement.requisitions, label: t.procurement.nav.requisitions, icon: ClipboardList, resource: "procurement", action: "create", moduleKey: "procurement" },
          { href: ROUTES.procurement.rfqs, label: t.procurement.nav.rfqs, icon: FileQuestion, resource: "procurement", moduleKey: "procurement" },
          { href: ROUTES.procurement.orders, label: t.procurement.nav.orders, icon: ShoppingCart, resource: "procurement", moduleKey: "procurement" },
          { href: ROUTES.procurement.bills, label: t.procurement.nav.bills, icon: Receipt, resource: "procurement", moduleKey: "procurement" },
          { href: ROUTES.procurement.suppliers, label: t.procurement.nav.suppliers, icon: Truck, resource: "procurement", moduleKey: "procurement" },
        ],
      },
      {
        id: "operations",
        title: t.navigationGroups.operations,
        items: take([
          ROUTES.moms.list,
          ROUTES.assets.list(),
          ROUTES.hr.handovers(),
          ROUTES.cms.equipment,
        ]),
      },
      {
        id: "finance",
        title: (t.navigationGroups as Record<string, string>).finance ?? t.nav.finance,
        items: take([
          ROUTES.finance.overview,
          ROUTES.invoices.list,
          ROUTES.payments.list,
          ROUTES.expenses.list(),
          ROUTES.finance.commissions(),
          ROUTES.finance.reports,
        ]),
      },
      {
        id: "people",
        title: t.navigationGroups.people,
        items: take([
          ROUTES.hr.employees,
          ROUTES.hr.attendance,
          ROUTES.hr.payroll(),
          ROUTES.hr.settlements(),
          ROUTES.hr.gosi,
          ROUTES.hr.supports(),
          ROUTES.hr.settings,
        ]),
      },
      {
        id: "personal",
        title: t.navigationGroups.personal,
        items: take([
          ROUTES.hr.leave(),
          ROUTES.hr.documents(),
          ROUTES.claims.list(),
          ROUTES.itSupport.list(),
        ]),
      },
      {
        id: "communications",
        title: t.navigationGroups.communications,
        items: [
          ...take([
            ROUTES.announcements.list(),
            ROUTES.notifications(),
            ROUTES.letters.list(),
            ROUTES.directory,
          ]),
          {
            href: ROUTES.archive,
            label: t.companyArchive.title,
            icon: FolderOpen,
          },
        ],
      },
      {
        id: "content",
        title: t.navigationGroups.content,
        items: take([
          ROUTES.analytics,
          ROUTES.cms.website,
          ROUTES.cms.pages,
          ROUTES.cms.articles,
          ROUTES.cms.menus,
          ROUTES.cms.portfolio,
          ROUTES.cms.banners,
          ROUTES.cms.clients,
          ROUTES.cms.reviews,
          ROUTES.cms.faqs,
          ROUTES.cms.stats,
        ]),
      },
      {
        id: "administration",
        title: t.navigationGroups.administration,
        items: [
          ...take([
            ROUTES.settings.company,
            ROUTES.users.list,
            ROUTES.settings.roles,
          ]),
          {
            href: ROUTES.settings.approvals,
            label: t.settingsTabs.approvals,
            icon: ShieldCheck,
            superAdminOnly: true,
            resource: "settings",
            action: "edit",
          },
          {
            href: ROUTES.settings.departments,
            label: t.nav.departments,
            icon: Building2,
            resource: "settings",
          },
          {
            href: ROUTES.settings.pipeline,
            label: t.nav.pipeline,
            icon: Kanban,
            resource: "settings",
            action: "edit",
            moduleKey: "crm_deals",
          },
          ...take([
            ROUTES.settings.web,
            ROUTES.settings.audit,
          ]),
        ],
      },
    ];
    // Use task-specific symbols for communication destinations.
    for (const group of groups)
      for (const item of group.items) {
        if (item.href === ROUTES.notifications()) item.icon = Bell;
        if (item.href === ROUTES.announcements.list()) item.icon = Megaphone;
      }
    return groups;
  }, [t]);

  const permittedSections = React.useMemo(() => {
    const order = sidebarGroupOrder(
      role,
      customConfig.departmentKey,
      customConfig.designationTier,
      customConfig.sectionOrder,
    );
    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          if (item.moduleKey && !isFeatureEnabled(item.moduleKey)) return false;
          if (item.managersOnly && !managesTeam) return false;
          if (item.superAdminOnly && role !== "super_admin") return false;
          if (!item.resource) return true;
          return can(item.resource, item.action ?? "read");
        }),
      }))
      .filter((section) => section.items.length > 0)
      .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  }, [sections, can, isFeatureEnabled, managesTeam, role, customConfig]);

  const visibleSections = React.useMemo(() => {
    const hiddenSet = new Set(customConfig.hiddenSections);
    const allPermittedItems = permittedSections.flatMap((s) => s.items);
    const pinnedItems = customConfig.pinnedHrefs
      .map((href) => allPermittedItems.find((item) => item.href === href))
      .filter((item): item is NavItem => !!item);

    const filtered = permittedSections.filter(
      (s) => s.id === "workspace" || !hiddenSet.has(s.id),
    );

    if (pinnedItems.length > 0) {
      return [
        {
          id: "pinned",
          title:
            ((t.navigationGroups as Record<string, string>).pinned ??
              "Pinned & Favorites"),
          items: pinnedItems,
        },
        ...filtered,
      ];
    }
    return filtered;
  }, [permittedSections, customConfig.hiddenSections, customConfig.pinnedHrefs, t.navigationGroups]);

  const activeHref = activeNavigationHref(
    permittedSections.flatMap((section) =>
      section.items.map((item) => item.href),
    ),
    pathname,
  );
  const toggleSection = (id: string, current: boolean) => {
    const next = { ...folded, [id]: !current };
    setFolded(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch { }
  };

  const customizerCopy = (t as Record<string, unknown>).sidebarCustomizer as Record<string, string> | undefined;
  const customizeLabel = customizerCopy?.openButton ?? "Customize sidebar";

  const navContent = (
    <nav
      aria-label={t.topbar.toggleNavigationMenu}
      className="h-full flex flex-col justify-between overflow-y-auto overscroll-contain py-3 select-none"
    >
      <div className="space-y-2">
        {visibleSections.map((section, idx) => {
          const active = section.items.some((item) => item.href === activeHref);
          const collapsed = folded[section.id] ?? (!active && idx > 3);
          return (
            <div
              key={section.id}
              className={idx > 0 ? "pt-2 border-t border-outline-variant/20" : ""}
            >
              <button
                type="button"
                onClick={() => toggleSection(section.id, collapsed)}
                aria-expanded={!collapsed}
                aria-label={section.title}
                data-nav-section
                className="w-full flex items-center justify-between px-4 py-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary rounded-lg m3-state-layer"
              >
                <span data-nav-label className="flex items-center gap-1.5 truncate">
                  {section.id === "pinned" && <Star className="w-3 h-3 text-amber-500 fill-amber-400 shrink-0" />}
                  <span className="truncate">{section.title}</span>
                </span>
                <ChevronDown
                  aria-hidden
                  className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ease-[cubic-bezier(0.2,0,0,1)] ${collapsed ? "-rotate-90 rtl:rotate-90" : ""}`}
                />
              </button>
              <div
                hidden={collapsed}
                className="space-y-1 mt-1"
              >
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.href === activeHref;

                  return (
                    <Link
                      key={`${section.id}-${item.href}`}
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      title={item.label}
                      aria-label={item.label}
                      onClick={() => setIsMobileOpen(false)}
                      className={`flex items-center gap-3.5 mx-3 px-4 h-10 rounded-full text-[13px] font-medium transition-all duration-150 ease-[cubic-bezier(0.2,0,0,1)] motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary m3-state-layer ${
                        isActive
                          ? "bg-secondary-container text-on-secondary-container font-semibold shadow-m3-0"
                          : "text-on-surface-variant hover:text-on-surface hover:bg-on-surface/[0.08] active:bg-on-surface/[0.12]"
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive
                            ? "text-on-secondary-container"
                            : "text-on-surface-variant"
                        }`}
                      />
                      <span data-nav-label className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-3 mt-3 px-3 border-t border-outline-variant/20 shrink-0">
        <button
          type="button"
          onClick={() => setCustomizerOpen(true)}
          title={customizeLabel}
          aria-label={customizeLabel}
          data-testid="sidebar-customize-button"
          className="w-full flex items-center justify-center gap-2 px-3 h-9 rounded-full text-xs font-semibold text-on-surface-variant hover:text-on-surface bg-surface-container-high/50 hover:bg-surface-container-high border border-outline-variant/40 transition-all duration-150 motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-primary shrink-0" />
          <span data-nav-label className="truncate">{customizeLabel}</span>
        </button>
      </div>
    </nav>
  );

  return (
    <>
      {/* Persistent drawer for the many admin destinations */}
      <aside data-collapsed={isCollapsed} className="admin-sidebar hidden lg:block">
        {navContent}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            aria-hidden="true"
            className="fixed inset-0 modal-scrim animate-in fade-in duration-base"
            onClick={() => setIsMobileOpen(false)}
          />
          <motion.div {...mobileDialog} initial={reduceMotion ? false : { transform: isRTL ? "translateX(48px)" : "translateX(-48px)", opacity: 0 }} animate={{ transform: "translateX(0px)", opacity: 1 }} transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 40, mass: 1 }} data-navigation-drawer aria-label={t.sidebar.mobileNavigation} className="relative w-80 max-w-[85vw] h-full bg-surface-container-low rounded-e-3xl shadow-m3-3 flex flex-col z-10">
            <div className="flex shrink-0 items-center justify-between border-b border-outline-variant/20 px-4 py-3">
              <span className="text-sm font-bold text-on-surface">{t.sidebar.mobileNavigation}</span>
              <Button type="button" size="icon" variant="ghost" onClick={() => setIsMobileOpen(false)} aria-label={t.actions.close}><X aria-hidden className="h-4 w-4" /></Button>
            </div>
            {navContent}
            <footer data-popup-footer className="shrink-0 border-t border-outline-variant px-4 py-4"><Button type="button" variant="outline" className="w-full" onClick={() => setIsMobileOpen(false)}>{t.actions.close}</Button></footer>
          </motion.div>
        </div>
      )}

      <SidebarCustomizerModal
        open={customizerOpen}
        onClose={() => setCustomizerOpen(false)}
        role={role}
        sections={permittedSections}
        config={customConfig}
        onSave={handleSaveCustomConfig}
      />
    </>
  );
}
