"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ArrowRight, type LucideIcon } from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { pageKeyForPath, pageSection, type PageKey } from "../../lib/page-registry";

interface PageHeaderProps {
  page?: PageKey;
  title?: React.ReactNode;
  description?: React.ReactNode | null;
  icon?: LucideIcon | null;
  eyebrow?: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label?: string };
  leading?: React.ReactNode;
  className?: string;
}

export function PageHeader({ page, title, description, icon, eyebrow, meta, actions, back, leading, className }: PageHeaderProps) {
  const headerRef = React.useRef<HTMLElement>(null);
  React.useEffect(() => {
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
