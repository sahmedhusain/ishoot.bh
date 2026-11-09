"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, Crown, Network, UserRound, Users } from "lucide-react";
import { formatMessage } from "@platform/locales";
import type { OrgChartNode } from "@platform/database";
import { ROUTES } from "../../constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { ContentImage } from "../shared/ContentImage";
import { PageHeader } from "../layout/PageHeader";

function Avatar({ name, url, size = "h-8 w-8" }: { name: string; url: string | null; size?: string }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
  return (
    <span className={`${size} shrink-0 rounded-full bg-accent/15 text-accent text-[11px] font-bold grid place-items-center overflow-hidden`}>
      {url ? <ContentImage src={url} alt="" className="h-full w-full object-cover" /> : initials}
    </span>
  );
}

export function OrgChartView({ departments, unassigned }: { departments: OrgChartNode[]; unassigned: number }) {
  const { t, locale } = useAdminLocale();
  const copy = t.orgChart;
  const ar = locale === "ar";
  const children = (parent: string | null) => departments.filter((d) => d.parent_id === parent || (parent === null && d.parent_id && !departments.some((p) => p.id === d.parent_id)));

  const renderNode = (node: OrgChartNode, depth: number): React.ReactNode => {
    const kids = children(node.id);
    return (
      <li key={node.id} className="relative">
        <details open={depth < 2} className="group">
          <summary className="list-none cursor-pointer">
            <div className="rounded-2xl border border-outline-variant bg-surface p-4 shadow-xs transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 motion-reduce:transform-none">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Network className="w-4 h-4 text-accent shrink-0" />
                  <span className="font-bold text-sm text-ink truncate">{ar ? node.name_ar : node.name_en}</span>
                </div>
                <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-muted">
                  <Users className="w-3.5 h-3.5" />
                  {formatMessage(copy.people, { count: node.count })}
                  {kids.length > 0 && <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-3">
                {node.head && (
                  <span className="inline-flex items-center gap-2">
                    <Avatar name={node.head.name} url={node.head.avatar_url} />
                    <span className="text-xs">
                      <span className="flex items-center gap-1 font-semibold text-ink"><Crown className="w-3 h-3 text-amber-500" /><bdi dir="auto">{node.head.name}</bdi></span>
                      <span className="text-ink-muted">{copy.head}</span>
                    </span>
                  </span>
                )}
                {node.deputy && (
                  <span className="inline-flex items-center gap-2">
                    <Avatar name={node.deputy.name} url={node.deputy.avatar_url} />
                    <span className="text-xs">
                      <span className="block font-semibold text-ink"><bdi dir="auto">{node.deputy.name}</bdi></span>
                      <span className="text-ink-muted">{copy.deputy}</span>
                    </span>
                  </span>
                )}
              </div>
              {node.people.length > 0 && (
                <div className="mt-3 flex items-center gap-1" aria-label={copy.members}>
                  {node.people.map((person, index) => (
                    <span key={index} title={ar && person.name_ar ? person.name_ar : person.name} className="-ms-1 first:ms-0 ring-2 ring-surface rounded-full">
                      <Avatar name={person.name} url={person.avatar_url} size="h-7 w-7" />
                    </span>
                  ))}
                  {node.count > node.people.length && (
                    <Link href={`${ROUTES.directory}?departmentId=${node.id}`} className="ms-2 text-[11px] font-semibold text-primary dark:text-mint">
                      {formatMessage(copy.more, { count: node.count - node.people.length })}
                    </Link>
                  )}
                </div>
              )}
            </div>
          </summary>
          {kids.length > 0 && (
            <ul className="mt-3 ms-6 ps-4 border-s border-dashed border-outline-variant space-y-3">{kids.map((kid) => renderNode(kid, depth + 1))}</ul>
          )}
        </details>
      </li>
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <PageHeader
        actions={<Link href={ROUTES.directory} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-outline-variant text-sm font-semibold text-ink hover:bg-ink/5">
          <UserRound className="w-4 h-4 text-accent" />
          {t.directory.title}
        </Link>}
      />
      {departments.length === 0 ? (
        <p className="p-12 text-center text-sm text-ink-muted rounded-3xl border border-outline-variant bg-surface">{copy.empty}</p>
      ) : (
        <ul className="space-y-3">{children(null).map((node) => renderNode(node, 0))}</ul>
      )}
      {unassigned > 0 && <p className="text-xs text-ink-muted">{formatMessage(copy.unassigned, { count: unassigned })}</p>}
    </div>
  );
}
