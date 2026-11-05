"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Archive,
  Bell,
  Blocks,
  Building2,
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
  Settings,
  ShieldCheck,
  Terminal,
  Timer,
  ToggleRight,
  Users,
  Wrench,
} from "lucide-react";
import { itAllowed } from "@platform/contracts";
import { setLocaleAction, signOutAction } from "../app/actions";
import { useCopy } from "./CopyProvider";
import { ItLive } from "./live/ItLive";
import { ItBell } from "./live/ItBell";
import { ItStatus } from "./live/ItStatus";

const NAV_GROUPS = [
  {
    label: "workspace",
    items: [
      { href: "/", icon: Gauge, label: "overview", resource: "tickets" },
      { href: "/tickets", icon: ListChecks, label: "tickets", resource: "tickets" },
      { href: "/sla", icon: Timer, label: "sla", resource: "ticket_settings" },
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
    label: "operations",
    items: [
      { href: "/system-health", icon: Activity, label: "systemHealth", resource: "system_health" },
      { href: "/logs", icon: Terminal, label: "logs", resource: "logs" },
      { href: "/database", icon: Database, label: "database", resource: "database" },
      { href: "/jobs", icon: Cpu, label: "jobs", resource: "jobs" },
      { href: "/backups", icon: Archive, label: "backups", resource: "backups" },
      { href: "/api-keys", icon: Key, label: "apiKeys", resource: "api_keys" },
      { href: "/notifications", icon: Bell, label: "notifications", resource: "notifications" },
    ],
  },
] as const;

export function Shell({
  email,
  roles,
  children,
}: {
  email: string;
  roles: string[];
  children: React.ReactNode;
}) {
  const { copy, role } = useCopy();
  const pathname = usePathname();
  const active = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <ItLive>
      <div className="it-shell">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:p-2 focus:bg-surface"
        >
          {copy.app.skipToContent}
        </a>
        <aside className="it-sidebar border-b p-3 lg:p-4">
          <Link
            href="/"
            aria-label={copy.app.openDashboard}
            className="it-brand flex items-center gap-2 px-2 py-2"
          >
            <ShieldCheck className="size-6 text-accent" aria-hidden />
            <span className="font-semibold">{copy.app.name}</span>
          </Link>
          <nav aria-label={copy.app.name} className="it-sidebar-nav">
            {NAV_GROUPS.map((group) => {
              const items = group.items.filter((item) =>
                itAllowed(roles, item.resource, "read"),
              );
              if (!items.length) return null;
              return (
                <section key={group.label} className="it-nav-group px-2 py-2">
                  <h2 className="it-nav-heading px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em]">
                    {copy.navGroups[group.label]}
                  </h2>
                  <div className="flex flex-col gap-0.5">
                    {items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={active(item.href) ? "page" : undefined}
                        className="it-nav-item flex items-center gap-2.5 rounded px-3 py-2 text-[13px] whitespace-nowrap"
                      >
                        <item.icon className="size-4 shrink-0" aria-hidden />
                        {copy.nav[item.label]}
                      </Link>
                    ))}
                  </div>
                </section>
              );
            })}
            <section className="it-nav-group px-2 py-2">
              <div className="flex flex-col gap-0.5">
                <Link
                  href="/settings"
                  aria-current={active("/settings") ? "page" : undefined}
                  className="it-nav-item flex items-center gap-2.5 rounded px-3 py-2 text-[13px] whitespace-nowrap"
                >
                  <Settings className="size-4 shrink-0" aria-hidden />
                  {copy.nav.settings}
                </Link>
              </div>
            </section>
          </nav>
        </aside>
        <div className="it-workspace min-w-0">
          <header className="it-topbar flex flex-wrap items-center justify-end gap-3 border-b px-4 py-3 sm:px-6">
            <ItStatus email={email} />
            <ItBell />
            <div className="text-end me-auto lg:me-0">
              <div className="text-xs text-ink-muted">
                {copy.app.signedInAs}
              </div>
              <div className="text-sm font-semibold text-ink" dir="ltr">
                {email}
              </div>
              <div className="text-[11px] text-ink-muted">
                {roles.map(role).join(" · ")}
              </div>
            </div>
            <form action={setLocaleAction.bind(null, copy.app.languageCode)}>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-outline-variant text-xs text-ink hover:bg-surface-container"
              >
                <Languages className="size-4" aria-hidden />
                {copy.app.language}
              </button>
            </form>
            <form action={signOutAction}>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-outline-variant text-xs text-ink hover:bg-surface-container"
              >
                <LogOut className="size-4" aria-hidden />
                {copy.app.signOut}
              </button>
            </form>
          </header>
          <main id="content" className="it-main">
            {children}
          </main>
        </div>
      </div>
    </ItLive>
  );
}
