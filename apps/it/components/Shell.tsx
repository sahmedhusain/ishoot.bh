"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Archive,
  Bell,
  Blocks,
  Building2,
  ChevronDown,
  Cpu,
  Database,
  Gauge,
  History,
  Globe,
  Key,
  ListChecks,
  LogOut,
  Monitor,
  Search,
  Settings,
  ShieldCheck,
  Terminal,
  Timer,
  ToggleRight,
  User,
  Users,
  Wrench,
  PlaySquare,
  Server,
  Plus,
  ExternalLink,
} from "lucide-react";
import { itAllowed } from "@platform/contracts";
import { signOutAction } from "../app/actions";
import { useCopy } from "./CopyProvider";
import { ItLive } from "./live/ItLive";
import { ItBell } from "./live/ItBell";
import { ItStatus } from "./live/ItStatus";

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  resource: string;
}

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "workspace",
    items: [
      { href: "/", icon: Gauge, label: "overview", resource: "tickets" },
      { href: "/tickets", icon: ListChecks, label: "tickets", resource: "tickets" },
      { href: "/sla", icon: Timer, label: "sla", resource: "ticket_settings" },
    ],
  },
  {
    label: "access",
    items: [
      { href: "/staff-accounts", icon: Users, label: "staffAccounts", resource: "staff_accounts" },
      { href: "/staff-roles", icon: ShieldCheck, label: "staffRoles", resource: "staff_roles" },
      { href: "/it-accounts", icon: Users, label: "itAccounts", resource: "it_accounts" },
      { href: "/sessions", icon: Monitor, label: "sessions", resource: "sessions" },
      { href: "/audit", icon: History, label: "audit", resource: "audit" },
    ],
  },
  {
    label: "platform",
    items: [
      { href: "/modules", icon: ToggleRight, label: "modules", resource: "modules" },
      { href: "/integrations", icon: Blocks, label: "integrations", resource: "integrations" },
      { href: "/site", icon: Globe, label: "site", resource: "domains" },
      { href: "/company", icon: Building2, label: "company", resource: "setup" },
      { href: "/setup", icon: Wrench, label: "setup", resource: "setup" },
    ],
  },
  {
    label: "operations",
    items: [
      { href: "/system-health", icon: Activity, label: "systemHealth", resource: "system_health" },
      { href: "/logs", icon: Terminal, label: "logs", resource: "logs" },
      { href: "/database", icon: Database, label: "database", resource: "database" },
      { href: "/jobs", icon: Cpu, label: "jobs", resource: "jobs" },
      { href: "/backups", icon: Archive, label: "backups", resource: "backups" },
      { href: "/deployments", icon: Server, label: "deployments", resource: "system_health" },
      { href: "/api-tester", icon: PlaySquare, label: "apiTester", resource: "system_health" },
      { href: "/api-keys", icon: Key, label: "apiKeys", resource: "api_keys" },
      { href: "/notifications", icon: Bell, label: "notifications", resource: "notifications" },
    ],
  },
];

export function Shell({
  email,
  roles,
  dbRoles,
  branding,
  children,
}: {
  email: string;
  roles: string[];
  dbRoles?: Array<{ id: string; nameEn?: string; nameAr?: string }>;
  branding?: {
    isSetup: boolean;
    name: string;
    iconUrl: string | null;
  };
  children: React.ReactNode;
}) {
  const { copy, role } = useCopy();
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);

  const userMenuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const active = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim().toLowerCase();
    if (!query) return;

    const quickLinks: Record<string, string> = {
      ticket: "/tickets",
      tickets: "/tickets",
      sla: "/sla",
      log: "/logs",
      logs: "/logs",
      db: "/database",
      database: "/database",
      account: "/it-accounts",
      accounts: "/it-accounts",
      staff: "/staff-accounts",
      roles: "/staff-roles",
      role: "/staff-roles",
      health: "/system-health",
      backup: "/backups",
      backups: "/backups",
      deploy: "/deployments",
      deployments: "/deployments",
      job: "/jobs",
      jobs: "/jobs",
      site: "/site",
      domain: "/site",
      domains: "/site",
      module: "/modules",
      modules: "/modules",
      integration: "/integrations",
      integrations: "/integrations",
      audit: "/audit",
      session: "/sessions",
      sessions: "/sessions",
      key: "/api-keys",
      keys: "/api-keys",
      api: "/api-tester",
      settings: "/settings",
      setup: "/setup",
    };

    for (const [key, path] of Object.entries(quickLinks)) {
      if (query.includes(key)) {
        router.push(path);
        setSearchQuery("");
        return;
      }
    }

    router.push(`/tickets?q=${encodeURIComponent(query)}`);
    setSearchQuery("");
  };

  const TOP_TABS = [
    { href: "/", label: copy.nav.overview, icon: Gauge },
    { href: "/tickets", label: copy.nav.tickets, icon: ListChecks },
    { href: "/sla", label: copy.nav.sla, icon: Timer },
    { href: "/it-accounts", label: copy.nav.itAccounts, icon: Users },
    { href: "/system-health", label: copy.nav.systemHealth, icon: Activity },
    { href: "/logs", label: copy.nav.logs, icon: Terminal },
    { href: "/database", label: copy.nav.database, icon: Database },
    { href: "/deployments", label: copy.nav.deployments, icon: Server },
    { href: "/settings", label: copy.nav.settings, icon: Settings },
  ];

  return (
    <ItLive>
      <div className="it-shell flex flex-col min-h-screen bg-[#f4f6f8] dark:bg-[#0b1320] text-slate-900 dark:text-slate-100 font-sans">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:p-2 focus:bg-white focus:text-slate-900 focus:shadow-lg focus:rounded-md"
        >
          {copy.app.skipToContent}
        </a>

        <header className="it-header flex items-center justify-between gap-4 z-30 shadow-sm">
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/"
              className="flex items-center gap-2 group text-white text-decoration-none"
              aria-label={copy.app.openDashboard}
            >
              <div className="flex items-center gap-2 font-bold tracking-tight">
                {branding?.isSetup && branding.iconUrl ? (
                  <img
                    src={branding.iconUrl}
                    alt={branding.name}
                    className="size-5 rounded object-contain shrink-0"
                  />
                ) : null}
                <span className="text-white font-semibold text-sm tracking-tight">
                  {branding?.name || copy.app.name}
                </span>
              </div>
              <span className="h-4 w-px bg-white/20 hidden sm:block" />
              <span className="text-xs text-slate-300 font-medium hidden sm:inline-block">
                {copy.app.operations}
              </span>
            </Link>
          </div>

          <div className="flex-1 max-w-md mx-2">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder={copy.app.globalSearchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="it-global-search"
                aria-label={copy.app.globalSearchPlaceholder}
              />
            </form>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{copy.app.production}</span>
            </div>

            <ItStatus email={email} />
            <ItBell />

            <Link
              href="/tickets"
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#0070d2] hover:bg-[#005fb2] text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <Plus className="size-3.5" />
              <span>Ticket</span>
            </Link>

            <div ref={userMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-1 rounded-md hover:bg-white/10 text-white transition-colors"
                aria-expanded={userMenuOpen}
                aria-label={copy.userDropdown.operatorProfile}
              >
                <div className="size-7 rounded-full bg-[#243756] border border-white/20 flex items-center justify-center text-xs font-bold text-white">
                  {email.charAt(0).toUpperCase()}
                </div>
                <div className="text-start leading-tight hidden xl:block">
                  <div className="text-xs font-semibold text-white truncate max-w-36">
                    {email.split("@")[0]}
                  </div>
                  <div className="text-[10px] text-slate-300 truncate max-w-36">
                    {roles.map((r) => role(r, dbRoles)).join(", ")}
                  </div>
                </div>
                <ChevronDown className="size-3 text-slate-300" />
              </button>

              {userMenuOpen && (
                <div className="it-user-dropdown shadow-xl">

                  <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {email}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {roles.map((r) => (
                        <span
                          key={r}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-medium"
                        >
                          {role(r, dbRoles)}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="py-1">
                    <Link
                      href="/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="it-user-dropdown-item"
                    >
                      <Settings className="size-3.5 text-slate-400" />
                      <span>{copy.nav.settings}</span>
                    </Link>
                    <Link
                      href="/audit"
                      onClick={() => setUserMenuOpen(false)}
                      className="it-user-dropdown-item"
                    >
                      <History className="size-3.5 text-slate-400" />
                      <span>{copy.nav.audit}</span>
                    </Link>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

                  <div className="p-1">
                    <form action={signOutAction}>
                      <button
                        type="submit"
                        className="it-user-dropdown-item text-rose-600 dark:text-rose-400 font-semibold"
                      >
                        <LogOut className="size-3.5" />
                        <span>{copy.app.signOut}</span>
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <nav aria-label="Primary tabs" className="it-tabbar">
          {TOP_TABS.map((tab) => {
            const isTabActive = active(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                data-active={isTabActive ? "true" : "false"}
                className={`it-tab ${isTabActive ? "active" : ""}`}
              >
                <tab.icon className="size-3.5" />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="it-shell-grid flex-1 flex flex-col lg:flex-row min-h-0">

          <aside className="it-sidebar lg:w-60 shrink-0 flex flex-col">
            <nav aria-label="Navigation menu" className="overflow-y-auto py-3 space-y-4 flex-1">
              {NAV_GROUPS.map((group) => {
                const items = group.items.filter((item) =>
                  itAllowed(roles, item.resource, "read"),
                );
                if (!items.length) return null;
                return (
                  <section key={group.label} className="space-y-0.5">
                    <h2 className="it-nav-heading">
                      {copy.navGroups[group.label as keyof typeof copy.navGroups] ?? group.label}
                    </h2>
                    <div>
                      {items.map((item) => {
                        const isCurrent = active(item.href);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            aria-current={isCurrent ? "page" : undefined}
                            className="it-nav-item"
                          >
                            <item.icon className="size-3.5 shrink-0 opacity-70" aria-hidden />
                            <span className="truncate flex-1">
                              {copy.nav[item.label as keyof typeof copy.nav] ?? item.label}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </nav>
          </aside>

          <main
            id="content"
            className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#f4f6f8] dark:bg-[#0b1320] min-w-0"
          >
            {children}
          </main>
        </div>
      </div>
    </ItLive>
  );
}
