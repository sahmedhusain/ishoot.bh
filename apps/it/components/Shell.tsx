"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Blocks,
  Gauge,
  Languages,
  ListChecks,
  LogOut,
  ShieldCheck,
  Timer,
  ToggleRight,
} from "lucide-react";
import { itAllowed } from "@platform/contracts";
import { setLocaleAction, signOutAction } from "../app/actions";
import { useCopy } from "./CopyProvider";

const NAV = [
  { href: "/", icon: Gauge, label: "overview", resource: "tickets" },
  { href: "/tickets", icon: ListChecks, label: "tickets", resource: "tickets" },
  { href: "/sla", icon: Timer, label: "sla", resource: "ticket_settings" },
  {
    href: "/modules",
    icon: ToggleRight,
    label: "modules",
    resource: "modules",
  },
  {
    href: "/integrations",
    icon: Blocks,
    label: "integrations",
    resource: "integrations",
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
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:m-2 focus:p-2 focus:bg-surface"
      >
        {copy.app.skipToContent}
      </a>
      <aside className="border-b lg:border-b-0 lg:border-e border-outline-variant bg-surface-container-low p-4 lg:min-h-screen flex lg:flex-col gap-4">
        <div className="flex items-center gap-2 px-2 py-1">
          <ShieldCheck className="size-6 text-accent" aria-hidden />
          <span className="font-bold text-ink">{copy.app.name}</span>
        </div>
        <nav
          aria-label={copy.app.name}
          className="flex lg:flex-col gap-1 overflow-x-auto"
        >
          {NAV.filter((item) => itAllowed(roles, item.resource, "read")).map(
            (item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active(item.href) ? "page" : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-full text-sm whitespace-nowrap ${active(item.href) ? "bg-secondary-container text-on-secondary-container font-semibold" : "text-ink-muted hover:text-ink hover:bg-surface-container"}`}
              >
                <item.icon className="size-4" aria-hidden />
                {copy.nav[item.label]}
              </Link>
            ),
          )}
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="flex items-center justify-end gap-3 px-6 py-4 border-b border-outline-variant">
          <div className="text-end me-auto lg:me-0">
            <div className="text-xs text-ink-muted">{copy.app.signedInAs}</div>
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
        <main id="content" className="p-6 max-w-6xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
