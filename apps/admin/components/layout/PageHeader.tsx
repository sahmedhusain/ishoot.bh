"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ArrowRight, type LucideIcon } from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { pageKeyForPath, pageSection, type PageKey } from "../../lib/page-registry";

interface PageHeaderProps {
  /** The page whose title, description, icon and group are used; defaults to the current route. */
  page?: PageKey;
  /** Replaces the page's title, e.g. with a record's number or name. */
  title?: React.ReactNode;
  /** Replaces the page's description; null hides it. */
  description?: React.ReactNode | null;
  /** Replaces the page's icon; null hides it. */
  icon?: LucideIcon | null;
  /** Replaces the sidebar group shown above the title. */
  eyebrow?: React.ReactNode;
  /** Chips and badges under the description (status, counts, links). */
  meta?: React.ReactNode;
  /** Buttons at the end of the header. */
  actions?: React.ReactNode;
  /** Shows a back button before the title. */
  back?: { href: string; label?: string };
  /** Anything else placed before the title, such as a custom back link. */
  leading?: React.ReactNode;
  className?: string;
}

/**
 * The header every dashboard page starts with: the sidebar group, an icon, the title and a short description,
 * with the page's actions at the end. Copy comes from `pages.<route>` in the admin dictionaries.
 */
export function PageHeader({ page, title, description, icon, eyebrow, meta, actions, back, leading, className }: PageHeaderProps) {
  const headerRef = React.useRef<HTMLElement>(null);
  React.useEffect(() => {
    // The page's client tree has committed. DOM enhancers must not alter its
    // streamed server markup before this point.
    headerRef.current?.setAttribute("data-overlay-scroll-ready", "");
  }, []);
  const pathname = usePathname();
  const { t, isRTL } = useAdminLocale();
  const key = page ?? pageKeyForPath(pathname ?? "");
  const copy = key !== null ? t.pages[(key || "home") as keyof typeof t.pages] : undefined;
  const section = key !== null ? pageSection(key) : null;
  const Icon = icon === null ? null : icon ?? section?.icon;
  const group = eyebrow ?? (section ? t.navigationGroups[section.group] : null);
  const text = description === null ? null : description ?? copy?.description;
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <header ref={headerRef} data-page-header className={className}>
      <div className="flex min-w-0 items-start gap-4">
        {back ? (
          <Link
            href={back.href}
            aria-label={back.label ?? t.pageHeader.back}
            title={back.label ?? t.pageHeader.back}
            className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-full print:hidden text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            <BackIcon className="size-5" aria-hidden />
          </Link>
        ) : null}
        {leading}
        {Icon ? (
          <span
            aria-hidden
            className="hidden size-12 shrink-0 place-items-center rounded-2xl bg-secondary-container text-on-secondary-container sm:grid print:hidden"
          >
            <Icon className="size-6" />
          </span>
        ) : null}
        <div className="min-w-0">
          {group ? (
            <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-primary print:hidden">{group}</span>
          ) : null}
          <h1 className="text-on-surface">{title ?? copy?.title}</h1>
          {text ? <p>{text}</p> : null}
          {meta ? <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div> : null}
        </div>
      </div>
      {actions ? <div className="print:hidden">{actions}</div> : null}
    </header>
  );
}
