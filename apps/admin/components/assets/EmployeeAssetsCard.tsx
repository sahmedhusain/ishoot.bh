"use client";

import { formatMessage } from "@platform/locales";
import Link from "next/link";
import { Laptop, PenLine } from "lucide-react";
import { formatCurrencyValue } from "@platform/ui";
import type { AssetRecord } from "@platform/database";
import { ROUTES } from "../../constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";

/** Company assets an employee holds and handovers waiting for them (employee page and own profile). */
export function EmployeeAssetsCard({ held, pending, value, own, canOpenAssets }: {
  held: AssetRecord[];
  pending: Array<{ id: string; reference: string; kind: string; status: string; asset: string }>;
  value: number;
  own: boolean;
  canOpenAssets: boolean;
}) {
  const { t, locale } = useAdminLocale();
  const a = t.assets;
  const isAr = locale === "ar";
  if (!held.length && !pending.length && own) return null;
  return (
    <section className="rounded-3xl border border-outline-variant bg-surface-raised dark:bg-surface-raised p-5 sm:p-6 shadow-xs space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-ink"><Laptop className="h-4 w-4 text-accent" />{own ? a.myAssets : a.assetsHeld}</h2>
          <p className="text-xs text-ink-muted mt-0.5">{own ? a.myAssetsHint : a.assetsHeldHint}</p>
        </div>
        {value > 0 && !own ? <span className="text-xs text-ink-muted">{formatMessage(a.heldValue, { amount: formatCurrencyValue(value, "BHD", isAr) })}</span> : null}
      </div>
      {pending.length ? (
        <ul className="space-y-2">
          {pending.map((p) => (
            <li key={p.id}>
              <Link href={ROUTES.assets.handover(p.id)} className="flex items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm">
                <span className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-200"><PenLine className="h-4 w-4" />{p.kind === "issue" ? a.handover.issued : a.handover.returned}: {p.asset}</span>
                <span className="text-[11px] text-amber-800 dark:text-amber-200">{a.handoverStatuses[p.status as keyof typeof a.handoverStatuses]}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      {held.length ? (
        <ul className="divide-y divide-outline-variant rounded-2xl border border-outline-variant">
          {held.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0">
                {canOpenAssets ? (
                  <Link href={ROUTES.assets.detail(item.id)} className="text-sm font-semibold text-ink hover:text-accent">{item.name}</Link>
                ) : (
                  <span className="text-sm font-semibold text-ink"><bdi dir="auto">{item.name}</bdi></span>
                )}
                <div className="text-[11px] text-ink-muted"><bdi dir="ltr">{item.asset_tag}</bdi> · {isAr ? item.category.name_ar : item.category.name_en}{item.serial_number ? <> · <bdi dir="ltr">{item.serial_number}</bdi></> : null}</div>
              </div>
              <span className="text-[11px] text-ink-muted">{a.conditions[item.condition as keyof typeof a.conditions]}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-ink-muted">{a.noneHeld}</p>
      )}
    </section>
  );
}
