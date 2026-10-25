"use client";

import { ROUTES } from "../../constants/routes";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Laptop,
  Bell,
  Megaphone,
  ChevronDown,
  Settings,
  ArrowRightLeft,
  LayoutDashboard,
  Package,
  FolderTree,
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
  ToggleLeft,
  Key,
  Globe,
  FileSignature,
  ShieldAlert,
  TrendingUp,
  HandCoins,
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
  Code2,
} from "lucide-react";
import { usePermissions, PermissionResource } from "../../hooks/usePermissions";
import { useSidebar } from "./SidebarContext";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import {
  sidebarGroupOrder,
  activeNavigationHref,
} from "../../lib/sidebar-navigation";
import { useFeatureToggles } from "../../hooks/useFeatureToggles";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  resource?: PermissionResource;
  /** Permission needed on the resource (default read). */
  action?: "read" | "edit";
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
  const { isMobileOpen, setIsMobileOpen } = useSidebar();
  const { t } = useAdminLocale();
  const { isFeatureEnabled } = useFeatureToggles();
  const [folded, setFolded] = React.useState<Record<string, boolean>>({});
  const storageKey = `platform_navigation_${user?.id ?? "guest"}`;
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
  }, [storageKey]);

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
            href: ROUTES.cms.code,
            label: t.nav.siteCode,
            icon: Code2,
            resource: "cms_code",
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
            href: ROUTES.settings.modules,
            label: t.nav.modules,
            icon: ToggleLeft,
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
        items: take([
          ROUTES.home,
          ROUTES.approvals(),
          ROUTES.calendar,
          ROUTES.team,
        ]),
      },
      {
        id: "sales",
        title: t.navigationGroups.sales,
        items: take([
          ROUTES.crm.deals,
          ROUTES.crm.contacts,
          ROUTES.requests.list,
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
        title: t.nav.finance,
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
          {
            href: ROUTES.settings.integrations,
            label: t.navigationGroups.integrations,
            icon: Settings,
            resource: "settings",
            action: "edit",
          },
          ...take([
            ROUTES.cms.code,
            ROUTES.settings.web,
            ROUTES.settings.modules,
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

  const visibleSections = React.useMemo(() => {
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
      .sort(
        (a, b) =>
          sidebarGroupOrder(role).indexOf(a.id) -
          sidebarGroupOrder(role).indexOf(b.id),
      );
  }, [sections, can, isFeatureEnabled, managesTeam, role]);

  const activeHref = activeNavigationHref(
    visibleSections.flatMap((section) =>
      section.items.map((item) => item.href),
    ),
    pathname,
  );
  const toggleSection = (id: string, current: boolean) => {
    const next = { ...folded, [id]: !current };
    setFolded(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {}
  };

  const navContent = (
    <nav
      aria-label={t.topbar.toggleNavigationMenu}
      className="h-full overflow-y-auto overscroll-contain py-3 space-y-2 select-none"
    >
      {visibleSections.map((section, idx) => {
        const active = section.items.some((item) => item.href === activeHref);
        const collapsed = folded[section.id] ?? (!active && idx > 3);
        return (
          <div
            key={section.id}
            className={
              idx > 0
                ? "pt-2 border-t border-slate-100 dark:border-neutral-800"
                : ""
            }
          >
            <button
              type="button"
              onClick={() => toggleSection(section.id, collapsed)}
              aria-expanded={!collapsed}
              className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
            >
              <span>{section.title}</span>
              <ChevronDown
                aria-hidden
                className={`h-3 w-3 transition-transform ${collapsed ? "-rotate-90 rtl:rotate-90" : ""}`}
              />
            </button>
            <div hidden={collapsed} className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = item.href === activeHref;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    title={item.label}
                    onClick={() => setIsMobileOpen(false)}
                    className={`flex items-center gap-3 mx-2 px-3 h-9 rounded-xl text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                      isActive
                        ? "bg-tone-95 text-primary dark:bg-tone-15/40 dark:text-mint font-semibold"
                        : "text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive
                          ? "text-primary dark:text-mint"
                          : "text-slate-500 dark:text-neutral-400"
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Desktop Fixed Google Navigation Drawer (w-60, 240px) */}
      <aside className="hidden lg:block shrink-0 h-full w-60 bg-white dark:bg-surface-raised border-e border-ink/15 dark:border-ink/15 z-20">
        {navContent}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 top-14 z-50 flex">
          <div
            className="fixed inset-0 top-14 modal-scrim"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="relative w-64 max-w-[80vw] h-full bg-white dark:bg-surface-raised border-e border-ink/15 dark:border-ink/15 shadow-xl flex flex-col z-10 animate-in slide-in-from-start duration-150">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
