"use client";

import { formatMessage } from "@ishoot/locales";
import { errorMessage } from "../../lib/error-text";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Clock, KeyRound, Lock, Pencil } from "lucide-react";
import { Button, Card, DateDisplay } from "@ishoot/ui";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { AccountSettingsDialog, type AccountSettingsValue } from "../shared/AccountSettingsDialog";
import { cancelAccountChangeAction } from "../../app/actions/account-settings";

export interface AccountRequestView {
  id: string;
  changes: Record<string, unknown>;
  before: Record<string, unknown>;
  reason: string | null;
  status: string;
  reviewNotes: string | null;
  requestedBy: string;
  createdAt: string;
}

/** The employee's login settings, shown in HR. Admins edit directly; HR's edits go to an admin for approval. */
export function EmployeeAccountCard({
  account,
  email,
  isSuperAdmin,
  roles,
  managers,
  requests,
  canManageUsers,
  canEditEmployees,
  canViewPay,
}: {
  account: AccountSettingsValue | null;
  email: string | null;
  isSuperAdmin: boolean;
  roles: Array<{ id: string; name: string }>;
  managers: Array<{ id: string; name: string }>;
  requests: AccountRequestView[];
  canManageUsers: boolean;
  canEditEmployees: boolean;
  canViewPay: boolean;
}) {
  const { t, locale } = useAdminLocale();
  const a = t.accountSettings;
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const pending = requests.find((r) => r.status === "pending");
  const showPay = canViewPay || canManageUsers;
  const canEdit = !!account && !isSuperAdmin && (canManageUsers || canEditEmployees) && !pending;

  const localRoles = roles.map((r) => ({ id: r.id, name: (t.roles as Record<string, string>)[r.id] ?? r.name }));
  const roleName = (id: unknown) => localRoles.find((r) => r.id === id)?.name ?? String(id ?? "—");
  const managerName = (id: unknown) => (id ? managers.find((m) => m.id === id)?.name ?? "—" : a.noManager);
  const percent = (v: unknown, empty: string) => (v == null ? empty : `${v}%`);
  const fieldLabel: Record<string, string> = { role: a.role, managerId: a.manager, status: a.status, discountLimitPercent: a.discountLimit, commissionRatePercent: a.commissionRate };
  const show = (field: string, v: unknown) =>
    field === "role" ? roleName(v)
      : field === "managerId" ? managerName(v)
        : field === "status" ? a.statuses[v as keyof typeof a.statuses] ?? String(v)
          : field === "discountLimitPercent" ? percent(v, a.discountDefault)
            : field === "commissionRatePercent" ? percent(v, a.noCommission)
              : String(v ?? "—");

  const withdraw = async (id: string) => {
    try {
      await cancelAccountChangeAction(id);
      toast.success(a.withdrawn);
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error, t, a.withdraw));
    }
  };

  const rows: Array<[string, React.ReactNode]> = account
    ? [
        [a.email, <bdi key="e" dir="ltr">{email}</bdi>],
        [a.role, roleName(account.role)],
        [a.manager, managerName(account.managerId)],
        [a.status, a.statuses[account.status]],
        ...(showPay
          ? ([
              [a.discountLimit, isSuperAdmin ? t.usersManagement.unlimited : percent(account.discountLimitPercent, a.discountDefault)],
              [a.commissionRate, percent(account.commissionRatePercent, a.noCommission)],
            ] as Array<[string, React.ReactNode]>)
          : []),
      ]
    : [];

  return (
    <Card className="space-y-4 p-5 dark:bg-surface-raised">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white"><KeyRound className="w-4 h-4" />{a.title}</h2>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{a.subtitle}</p>
        </div>
        {isSuperAdmin ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-ink/5 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300" title={a.protectedHint}>
            <Lock className="w-3 h-3" />{a.protected}
          </span>
        ) : canEdit ? (
          <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil className="w-3.5 h-3.5" />{a.edit}</Button>
        ) : null}
      </div>

      {!account ? (
        <p className="text-sm text-slate-600 dark:text-slate-300">{a.noAccount}</p>
      ) : (
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-[11px] text-slate-500 dark:text-slate-400">{label}</dt>
              <dd className="truncate text-sm font-medium text-slate-900 dark:text-white">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {pending && (
        <div className="space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
            <Clock className="w-3.5 h-3.5" />{a.pendingTitle}
            <span className="font-normal">· {formatMessage(a.pendingBy, { name: pending.requestedBy })} · <DateDisplay date={pending.createdAt} locale={locale} /></span>
            <Button type="button" size="sm" variant="ghost" className="ms-auto" onClick={() => withdraw(pending.id)}>{a.withdraw}</Button>
          </div>
          <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-200">
            {Object.entries(pending.changes).filter(([k]) => k in fieldLabel).map(([field, value]) => (
              <li key={field}>{fieldLabel[field]}: <span className="line-through opacity-60">{show(field, pending.before[field])}</span> → <strong>{show(field, value)}</strong></li>
            ))}
          </ul>
          {pending.reason && <p className="text-xs text-slate-600 dark:text-slate-300" dir="auto">{pending.reason}</p>}
        </div>
      )}

      {requests.filter((r) => r.status !== "pending").length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer font-medium text-slate-600 dark:text-slate-300">{a.history}</summary>
          <ul className="mt-2 space-y-1.5">
            {requests.filter((r) => r.status !== "pending").map((r) => (
              <li key={r.id} className="flex flex-wrap gap-x-2 text-slate-600 dark:text-slate-400">
                <DateDisplay date={r.createdAt} locale={locale} />
                <span className="font-medium">{a.requestStatuses[r.status as keyof typeof a.requestStatuses] ?? r.status}</span>
                <span>{Object.keys(r.changes).filter((k) => k in fieldLabel).map((k) => fieldLabel[k]).join(", ")}</span>
                <span>· {r.requestedBy}</span>
                {r.reviewNotes && <span dir="auto">· {r.reviewNotes}</span>}
              </li>
            ))}
          </ul>
        </details>
      )}

      {editing && account && (
        <AccountSettingsDialog
          value={account}
          fields={["role", "managerId", "status", ...(showPay ? (["discountLimitPercent", "commissionRatePercent"] as const) : [])]}
          roles={localRoles.filter((r) => r.id !== "super_admin")}
          managers={managers}
          requiresApproval={!canManageUsers}
          onClose={() => setEditing(false)}
        />
      )}
    </Card>
  );
}
