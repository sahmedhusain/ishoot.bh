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
  Languages,
  ListChecks,
  LogOut,
  Monitor,
  Printer,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Terminal,
  Timer,
  ToggleRight,
  User,
  Users,
  Wrench,
  PlaySquare,
  Server,
  Save,
  ArrowLeft,
  XCircle,
  CheckCircle2,
} from "lucide-react";
import { itAllowed } from "@platform/contracts";
import { setLocaleAction, signOutAction } from "../app/actions";
import { useCopy } from "./CopyProvider";
import { ItLive } from "./live/ItLive";
import { ItBell } from "./live/ItBell";
import { ItStatus } from "./live/ItStatus";

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  resource: string;
  tcode: string;
}

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "workspace",
    items: [
      { href: "/", icon: Gauge, label: "overview", resource: "tickets", tcode: "SM04" },
      { href: "/tickets", icon: ListChecks, label: "tickets", resource: "tickets", tcode: "SM37" },
      { href: "/sla", icon: Timer, label: "sla", resource: "ticket_settings", tcode: "ST03" },
    ],
  },
  {
    label: "platform",
    items: [
      { href: "/modules", icon: ToggleRight, label: "modules", resource: "modules", tcode: "RZ10" },
      { href: "/integrations", icon: Blocks, label: "integrations", resource: "integrations", tcode: "SM59" },
      { href: "/site", icon: Globe, label: "site", resource: "domains", tcode: "AL08" },
      { href: "/company", icon: Building2, label: "company", resource: "setup", tcode: "SPRO" },
      { href: "/setup", icon: Wrench, label: "setup", resource: "setup", tcode: "SIMG" },
    ],
  },
  {
    label: "access",
    items: [
      { href: "/staff-accounts", icon: Users, label: "staffAccounts", resource: "staff_accounts", tcode: "SU01" },
      { href: "/staff-roles", icon: ShieldCheck, label: "staffRoles", resource: "staff_roles", tcode: "PFCG" },
      { href: "/it-accounts", icon: Users, label: "itAccounts", resource: "it_accounts", tcode: "SU10" },
      { href: "/sessions", icon: Monitor, label: "sessions", resource: "sessions", tcode: "SM04S" },
      { href: "/audit", icon: History, label: "audit", resource: "audit", tcode: "SM20" },
    ],
  },
  {
    label: "operations",
    items: [
      { href: "/system-health", icon: Activity, label: "systemHealth", resource: "system_health", tcode: "ST06" },
      { href: "/logs", icon: Terminal, label: "logs", resource: "logs", tcode: "SM21" },
      { href: "/database", icon: Database, label: "database", resource: "database", tcode: "DB02" },
      { href: "/jobs", icon: Cpu, label: "jobs", resource: "jobs", tcode: "SM36" },
      { href: "/backups", icon: Archive, label: "backups", resource: "backups", tcode: "DB13" },
      { href: "/api-keys", icon: Key, label: "apiKeys", resource: "api_keys", tcode: "STRUST" },
      { href: "/notifications", icon: Bell, label: "notifications", resource: "notifications", tcode: "SOST" },
      { href: "/api-tester", icon: PlaySquare, label: "apiTester", resource: "system_health", tcode: "SE38" },
      { href: "/deployments", icon: Server, label: "deployments", resource: "system_health", tcode: "STMS" },
    ],
  },
];

export function Shell({
  email,
  roles,
  dbRoles,
  children,
}: {
  email: string;
  roles: string[];
  dbRoles?: Array<{ id: string; nameEn?: string; nameAr?: string }>;
  children: React.ReactNode;
}) {
  const { copy, role } = useCopy();
  const pathname = usePathname();
  const router = useRouter();
  const [cmdText, setCmdText] = React.useState("");
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const [activeMenu, setActiveMenu] = React.useState<string | null>(null);

  const userMenuRef = React.useRef<HTMLDivElement>(null);
  const menuBarRef = React.useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setUserMenuOpen(false);
        setActiveMenu(null);
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

  // Determine current active transaction code
  const currentItem = React.useMemo(() => {
    for (const group of NAV_GROUPS) {
      for (const item of group.items) {
        if (active(item.href)) return item;
      }
    }
    if (active("/settings")) return { tcode: "RZ11", label: "settings" };
    return { tcode: "SYS00", label: "system" };
  }, [pathname]);

  const handleCommand = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cmd = cmdText.trim().toLowerCase();
    if (!cmd) return;

    const routeMap: Record<string, string> = {
      "/n logs": "/logs",
      "/n log": "/logs",
      "sm21": "/logs",
      "/n db": "/database",
      "/n database": "/database",
      "db02": "/database",
      "/n site": "/site",
      "/n domain": "/site",
      "al08": "/site",
      "/n tickets": "/tickets",
      "sm37": "/tickets",
      "/n team": "/it-accounts",
      "/n accounts": "/it-accounts",
      "su10": "/it-accounts",
      "/n health": "/system-health",
      "st06": "/system-health",
      "/n jobs": "/jobs",
      "sm36": "/jobs",
      "/n backup": "/backups",
      "db13": "/backups",
      "/n test": "/api-tester",
      "se38": "/api-tester",
      "/n deploy": "/deployments",
      "stms": "/deployments",
      "/n modules": "/modules",
      "rz10": "/modules",
      "/n integrations": "/integrations",
      "sm59": "/integrations",
      "/n audit": "/audit",
      "sm20": "/audit",
      "/n sessions": "/sessions",
      "sm04s": "/sessions",
      "/n settings": "/settings",
      "rz11": "/settings",
      "/n setup": "/setup",
      "simg": "/setup",
      "spro": "/company",
    };

    const target = routeMap[cmd] || (cmd.startsWith("/") ? cmd : `/${cmd}`);
    router.push(target);
    setCmdText("");
  };

  return (
    <ItLive>
      <div className="it-shell flex flex-col min-h-screen">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:p-2 focus:bg-surface"
        >
          {copy.app.skipToContent}
        </a>

        {/* 1. Authentic SAP GUI Menu Ribbon across the very top */}
        <div ref={menuBarRef} className="it-menubar relative z-40 select-none">
          {/* System Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveMenu(activeMenu === "system" ? null : "system")}
              className={`it-menu-item ${activeMenu === "system" ? "bg-slate-800 text-white" : ""}`}
            >
              {copy.app.menuSystem}
            </button>
            {activeMenu === "system" && (
              <div className="it-user-dropdown start-0 left-0">
                <Link
                  href="/"
                  onClick={() => setActiveMenu(null)}
                  className="it-user-dropdown-item"
                >
                  <Gauge className="size-3.5" />
                  <span>{copy.nav.overview} [SM04]</span>
                </Link>
                <Link
                  href="/system-health"
                  onClick={() => setActiveMenu(null)}
                  className="it-user-dropdown-item"
                >
                  <Activity className="size-3.5" />
                  <span>{copy.nav.systemHealth} [ST06]</span>
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setActiveMenu(null)}
                  className="it-user-dropdown-item"
                >
                  <Settings className="size-3.5" />
                  <span>{copy.userDropdown.mySettings}</span>
                </Link>
                <div className="border-t border-slate-300 dark:border-slate-700 my-1" />
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="it-user-dropdown-item text-rose-600 dark:text-rose-400 font-bold"
                  >
                    <LogOut className="size-3.5" />
                    <span>{copy.userDropdown.logOff}</span>
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Edit Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveMenu(activeMenu === "edit" ? null : "edit")}
              className={`it-menu-item ${activeMenu === "edit" ? "bg-slate-800 text-white" : ""}`}
            >
              {copy.app.menuEdit}
            </button>
            {activeMenu === "edit" && (
              <div className="it-user-dropdown start-0 left-0">
                <Link
                  href="/tickets"
                  onClick={() => setActiveMenu(null)}
                  className="it-user-dropdown-item"
                >
                  <ListChecks className="size-3.5" />
                  <span>{copy.nav.tickets} [SM37]</span>
                </Link>
                <Link
                  href="/sla"
                  onClick={() => setActiveMenu(null)}
                  className="it-user-dropdown-item"
                >
                  <Timer className="size-3.5" />
                  <span>{copy.nav.sla} [ST03]</span>
                </Link>
              </div>
            )}
          </div>

          {/* Goto Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveMenu(activeMenu === "goto" ? null : "goto")}
              className={`it-menu-item ${activeMenu === "goto" ? "bg-slate-800 text-white" : ""}`}
            >
              {copy.app.menuGoto}
            </button>
            {activeMenu === "goto" && (
              <div className="it-user-dropdown start-0 left-0">
                <Link
                  href="/site"
                  onClick={() => setActiveMenu(null)}
                  className="it-user-dropdown-item"
                >
                  <Globe className="size-3.5" />
                  <span>{copy.nav.site} [AL08]</span>
                </Link>
                <Link
                  href="/modules"
                  onClick={() => setActiveMenu(null)}
                  className="it-user-dropdown-item"
                >
                  <ToggleRight className="size-3.5" />
                  <span>{copy.nav.modules} [RZ10]</span>
                </Link>
                <Link
                  href="/integrations"
                  onClick={() => setActiveMenu(null)}
                  className="it-user-dropdown-item"
                >
                  <Blocks className="size-3.5" />
                  <span>{copy.nav.integrations} [SM59]</span>
                </Link>
                <Link
                  href="/database"
                  onClick={() => setActiveMenu(null)}
                  className="it-user-dropdown-item"
                >
                  <Database className="size-3.5" />
                  <span>{copy.nav.database} [DB02]</span>
                </Link>
                <Link
                  href="/sessions"
                  onClick={() => setActiveMenu(null)}
                  className="it-user-dropdown-item"
                >
                  <Monitor className="size-3.5" />
                  <span>{copy.nav.sessions} [SM04S]</span>
                </Link>
                <Link
                  href="/audit"
                  onClick={() => setActiveMenu(null)}
                  className="it-user-dropdown-item"
                >
                  <History className="size-3.5" />
                  <span>{copy.nav.audit} [SM20]</span>
                </Link>
              </div>
            )}
          </div>

          {/* Tools Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveMenu(activeMenu === "tools" ? null : "tools")}
              className={`it-menu-item ${activeMenu === "tools" ? "bg-slate-800 text-white" : ""}`}
            >
              {copy.app.menuTools}
            </button>
            {activeMenu === "tools" && (
              <div className="it-user-dropdown start-0 left-0">
                <Link
                  href="/api-tester"
                  onClick={() => setActiveMenu(null)}
                  className="it-user-dropdown-item"
                >
                  <PlaySquare className="size-3.5" />
                  <span>{copy.nav.apiTester} [SE38]</span>
                </Link>
                <Link
                  href="/deployments"
                  onClick={() => setActiveMenu(null)}
                  className="it-user-dropdown-item"
                >
                  <Server className="size-3.5" />
                  <span>{copy.nav.deployments} [STMS]</span>
                </Link>
                <Link
                  href="/logs"
                  onClick={() => setActiveMenu(null)}
                  className="it-user-dropdown-item"
                >
                  <Terminal className="size-3.5" />
                  <span>{copy.nav.logs} [SM21]</span>
                </Link>
                <Link
                  href="/jobs"
                  onClick={() => setActiveMenu(null)}
                  className="it-user-dropdown-item"
                >
                  <Cpu className="size-3.5" />
                  <span>{copy.nav.jobs} [SM36]</span>
                </Link>
                <Link
                  href="/backups"
                  onClick={() => setActiveMenu(null)}
                  className="it-user-dropdown-item"
                >
                  <Archive className="size-3.5" />
                  <span>{copy.nav.backups} [DB13]</span>
                </Link>
                <Link
                  href="/api-keys"
                  onClick={() => setActiveMenu(null)}
                  className="it-user-dropdown-item"
                >
                  <Key className="size-3.5" />
                  <span>{copy.nav.apiKeys} [STRUST]</span>
                </Link>
              </div>
            )}
          </div>

          {/* Help Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveMenu(activeMenu === "help" ? null : "help")}
              className={`it-menu-item ${activeMenu === "help" ? "bg-slate-800 text-white" : ""}`}
            >
              {copy.app.menuHelp}
            </button>
            {activeMenu === "help" && (
              <div className="it-user-dropdown start-0 left-0">
                <Link
                  href="/company"
                  onClick={() => setActiveMenu(null)}
                  className="it-user-dropdown-item"
                >
                  <Building2 className="size-3.5" />
                  <span>{copy.nav.company} [SPRO]</span>
                </Link>
                <Link
                  href="/setup"
                  onClick={() => setActiveMenu(null)}
                  className="it-user-dropdown-item"
                >
                  <Wrench className="size-3.5" />
                  <span>{copy.nav.setup} [SIMG]</span>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* 2. SAP Command & Navigation Bar */}
        <header className="it-cmd-bar flex flex-wrap items-center justify-between gap-2 z-30">
          {/* Left: Command Box and Classic SAP Action Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Command Prompt Box (Classic SAP OK-Code prompt) */}
            <form onSubmit={handleCommand} className="flex items-center">
              <input
                type="text"
                placeholder="/n transaction..."
                value={cmdText}
                onChange={(e) => setCmdText(e.target.value)}
                className="it-cmd-field"
                title="Enter /n logs, /n db, /n site, /n test, or T-Code (SM21, DB02, SE38...)"
              />
              <button
                type="submit"
                className="it-btn-3d px-2 text-emerald-700 dark:text-emerald-400 font-bold"
                title={copy.app.ok}
              >
                ✔
              </button>
            </form>

            <span className="h-4 border-e border-slate-400 dark:border-slate-600 mx-1" />

            {/* Classic 3D Toolbar Action Icons */}
            <button
              type="button"
              onClick={() => router.back()}
              className="it-btn-3d"
              title="Back (F3)"
            >
              <ArrowLeft className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="it-btn-3d"
              title="Exit to Root (Shift+F3)"
            >
              <XCircle className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="it-btn-3d"
              title="Print Screen (Ctrl+P)"
            >
              <Printer className="size-3.5" />
            </button>

            <span className="h-4 border-e border-slate-400 dark:border-slate-600 mx-1" />

            {/* System Identification Badges */}
            <span className="it-status-pane">
              {copy.app.sid}: ISHOOT-PRD
            </span>
            <span className="it-status-pane hidden sm:inline-flex">
              {copy.app.client}: 100
            </span>
            <span className="it-status-pane text-amber-700 dark:text-amber-400 font-bold hidden md:inline-flex">
              {copy.app.tcode}: {currentItem.tcode}
            </span>
          </div>

          {/* Right: Live Connection, Notifications & User Dropdown (NO Language button on topbar!) */}
          <div className="flex items-center gap-2 ms-auto">
            <ItStatus email={email} />
            <ItBell />

            {/* Interactive User Dropdown Trigger */}
            <div ref={userMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className={`it-btn-3d flex items-center gap-2 py-1 px-2.5 ${
                  userMenuOpen ? "border-slate-600 bg-slate-300 dark:bg-slate-700" : ""
                }`}
                aria-expanded={userMenuOpen}
                aria-label={copy.userDropdown.operatorProfile}
              >
                <User className="size-3.5 text-slate-700 dark:text-slate-300" />
                <div className="text-start leading-tight hidden lg:block">
                  <div className="font-mono text-[10px] font-bold text-slate-900 dark:text-slate-100 truncate max-w-40" dir="ltr">
                    {email}
                  </div>
                  <div className="text-[9px] text-sky-700 dark:text-sky-400 uppercase font-semibold">
                    {roles.map((r) => role(r, dbRoles)).join(" · ")}
                  </div>
                </div>
                <ChevronDown className="size-3 text-slate-500" />
              </button>

              {/* The User Dropdown Popover */}
              {userMenuOpen && (
                <div className="it-user-dropdown end-0 right-0 shadow-2xl">
                  {/* Operator Info Summary */}
                  <div className="p-3 border-b border-slate-300 dark:border-slate-700 bg-slate-200/60 dark:bg-slate-800/60 font-mono">
                    <div className="text-[10px] text-slate-500 uppercase font-bold">
                      {copy.userDropdown.operatorProfile}
                    </div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate" dir="ltr">
                      {email}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {roles.map((r) => (
                        <span key={r} className="text-[9px] px-1 py-0.5 bg-sky-500/20 text-sky-800 dark:text-sky-300 border border-sky-500/30 font-semibold">
                          {role(r, dbRoles)}
                        </span>
                      ))}
                    </div>
                    <div className="mt-2 text-[9px] text-slate-500 flex justify-between border-t border-slate-300 dark:border-slate-700 pt-1">
                      <span>{copy.userDropdown.sessionId}: SID-PRD-4412</span>
                      <span>{copy.userDropdown.nodeId}: BH-DC-01</span>
                    </div>
                  </div>

                  {/* Navigation Shortcuts */}
                  <div className="py-1">
                    <Link
                      href="/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="it-user-dropdown-item"
                    >
                      <Settings className="size-3.5 text-slate-500" />
                      <span>{copy.userDropdown.mySettings}</span>
                    </Link>
                    <Link
                      href="/audit"
                      onClick={() => setUserMenuOpen(false)}
                      className="it-user-dropdown-item"
                    >
                      <History className="size-3.5 text-slate-500" />
                      <span>{copy.userDropdown.auditTrail}</span>
                    </Link>
                  </div>

                  <div className="border-t border-slate-300 dark:border-slate-700 my-1" />

                  {/* Language Switcher Button (Inside User Dropdown) */}
                  <div className="px-1 py-0.5">
                    <form action={setLocaleAction.bind(null, copy.app.languageCode)}>
                      <button
                        type="submit"
                        className="it-user-dropdown-item font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between"
                      >
                        <span className="flex items-center gap-2">
                          <Languages className="size-3.5 text-amber-600" />
                          <span>{copy.userDropdown.switchLanguage}</span>
                        </span>
                        <span className="text-[9px] uppercase px-1 border border-slate-400">
                          {copy.app.languageCode}
                        </span>
                      </button>
                    </form>
                  </div>

                  <div className="border-t border-slate-300 dark:border-slate-700 my-1" />

                  {/* Log Off Button */}
                  <div className="px-1 py-0.5">
                    <form action={signOutAction}>
                      <button
                        type="submit"
                        className="it-user-dropdown-item text-rose-700 dark:text-rose-400 font-bold flex items-center gap-2"
                      >
                        <LogOut className="size-3.5" />
                        <span>{copy.userDropdown.logOff}</span>
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* 3. Main Split View: Sidebar + Main Content */}
        <div className="it-shell-grid flex-1 flex flex-col lg:flex-row min-h-0">
          {/* SAP / Oracle Utilitarian Sidebar */}
          <aside className="it-sidebar lg:w-60 shrink-0 flex flex-col">
            {/* System Identity Banner */}
            <div className="p-2 border-b border-slate-400 dark:border-slate-700 bg-slate-300/40 dark:bg-slate-900/40">
              <Link
                href="/"
                aria-label={copy.app.openDashboard}
                className="flex items-center gap-2"
              >
                <div className="p-1 bg-amber-600 text-white font-mono font-bold text-xs">
                  SAP
                </div>
                <div className="min-w-0 font-mono">
                  <div className="font-bold text-xs uppercase text-ink tracking-tight">
                    {copy.app.name}
                  </div>
                  <div className="text-[9px] text-ink-muted">
                    ERP/NETWEAVER 7.50
                  </div>
                </div>
              </Link>
            </div>

            {/* Navigation Tree */}
            <nav aria-label={copy.app.name} className="it-sidebar-nav flex-1 overflow-y-auto py-1">
              {NAV_GROUPS.map((group, groupIdx) => {
                const items = group.items.filter((item) =>
                  itAllowed(roles, item.resource, "read"),
                );
                if (!items.length) return null;
                return (
                  <section key={group.label} className="it-nav-group mb-1">
                    <h2 className="it-nav-heading">
                      [{String(groupIdx + 1).padStart(2, "0")}] {copy.navGroups[group.label as keyof typeof copy.navGroups] ?? group.label}
                    </h2>
                    <div className="flex flex-col">
                      {items.map((item) => {
                        const isCurrent = active(item.href);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            aria-current={isCurrent ? "page" : undefined}
                            className="it-nav-item"
                          >
                            <item.icon className="size-3.5 shrink-0" aria-hidden />
                            <span className="truncate flex-1 font-mono text-[11px]">
                              {copy.nav[item.label as keyof typeof copy.nav] ?? item.label}
                            </span>
                            <span className="it-tcode text-[10px] text-slate-500 font-mono">
                              [{item.tcode}]
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                );
              })}

              <section className="it-nav-group mb-1">
                <div className="flex flex-col">
                  <Link
                    href="/settings"
                    aria-current={active("/settings") ? "page" : undefined}
                    className="it-nav-item"
                  >
                    <Settings className="size-3.5 shrink-0" aria-hidden />
                    <span className="truncate flex-1 font-mono text-[11px]">{copy.nav.settings}</span>
                    <span className="it-tcode text-[10px] text-slate-500 font-mono">[RZ11]</span>
                  </Link>
                </div>
              </section>
            </nav>

            {/* Bottom Sidebar Status */}
            <div className="p-2 border-t border-slate-400 dark:border-slate-700 bg-slate-300/30 dark:bg-slate-900/30 text-[10px] font-mono text-ink-muted flex items-center justify-between">
              <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1 font-bold">
                <span className="size-1.5 bg-emerald-500 inline-block" />
                ONLINE
              </span>
              <span>NODE-BH-01</span>
            </div>
          </aside>

          {/* Main Content Workspace */}
          <main id="content" className="it-main flex-1 overflow-y-auto p-4 bg-canvas min-w-0">
            {children}
          </main>
        </div>

        {/* 4. Authentic SAP GUI Persistent Bottom Status Bar */}
        <footer className="it-statusbar select-none">
          <div className="flex items-center gap-1 overflow-x-auto w-full">
            <span className="it-status-pane text-emerald-700 dark:text-emerald-400 font-bold">
              ✔ {copy.app.ready}
            </span>
            <span className="it-status-pane">
              {copy.app.sid}: ISHOOT-PRD
            </span>
            <span className="it-status-pane hidden sm:inline-flex">
              {copy.app.client}: 100
            </span>
            <span className="it-status-pane hidden md:inline-flex">
              {copy.app.operator}: {email}
            </span>
            <span className="it-status-pane text-amber-700 dark:text-amber-400 font-bold">
              {copy.app.tcode}: {currentItem.tcode}
            </span>
            <span className="it-status-pane hidden lg:inline-flex">
              PGM: SAPMSYST
            </span>
            <span className="it-status-pane ms-auto font-mono text-[9px] text-slate-500">
              INS | MANAMA-DC | UTF-8
            </span>
          </div>
        </footer>
      </div>
    </ItLive>
  );
}
