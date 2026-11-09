"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, Filter, X } from "lucide-react";
import type {
  StaffAccountPage,
  StaffAccountDraft,
  StaffRoleDraft,
  StaffAccessTemplate,
} from "@platform/api-client";
import {
  copyStaffAccessAction,
  previewStaffAccessAction,
  saveStaffAccountAction,
  inviteStaffAccountAction,
  resetStaffMFAAction,
  suspendStaffAccountAction,
  unsuspendStaffAccountAction,
} from "../app/(desk)/staff-accounts/actions";
import { useCopy } from "./CopyProvider";
import { PageTitle } from "./ticket-ui";
import { StaffAccessEditor, StaffEffectiveAccess } from "./StaffAccessEditor";
import { CriticalActionModal } from "./CriticalActionModal";

const empty = (role: string): StaffAccountDraft => ({
  email: "",
  displayName: "",
  role,
  active: true,
  overrides: {},
  dataScopes: {},
});

export function StaffAccountsView({
  page,
  roles,
  initial,
  editId,
  cursor,
  canCreate,
  canEdit,
  canExecute,
}: {
  page: StaffAccountPage;
  roles: StaffRoleDraft[];
  initial?: StaffAccountDraft;
  editId?: string;
  cursor: string;
  canCreate: boolean;
  canEdit: boolean;
  canExecute: boolean;
}) {
  const { copy, locale, date } = useCopy();
  const n = copy.staffAccounts;
  const router = useRouter();
  const [draft, setDraft] = React.useState<StaffAccountDraft>(
    initial ?? empty(roles[0]?.id ?? ""),
  );
  const [busy, setBusy] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = React.useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = React.useState("");
  const [actionModal, setActionModal] = React.useState<{
    type: "suspend" | "unsuspend" | "resetMfa" | "invite";
    accountId: string;
  } | null>(null);

  const [preview, setPreview] = React.useState<{
    permissions: Record<string, boolean>;
    dataScopes: Record<string, string>;
  } | null>(null);
  const editable = editId ? canEdit : canCreate;
  const change = (patch: Partial<StaffAccountDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setPreview(null);
  };
  const policy = (): StaffAccessTemplate => ({
    role: draft.role,
    overrides: draft.overrides ?? {},
    dataScopes: draft.dataScopes ?? {},
  });
  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    try {
      await work();
    } catch {
      toast.error(n.failed);
    } finally {
      setBusy(false);
    }
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!preview) return;
    void run(async () => {
      const result = await saveStaffAccountAction(editId, draft);
      if (!result.ok) {
        toast.error(n[result.reason]);
        return;
      }
      toast.success(n.saved);
      router.replace(
        `/staff-accounts?edit=${encodeURIComponent(result.value.subjectId)}`,
      );
      router.refresh();
    });
  };

  const filteredAccounts = React.useMemo(() => {
    return page.items.filter((account) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          (account.displayName && account.displayName.toLowerCase().includes(q)) ||
          (account.email && account.email.toLowerCase().includes(q));
        if (!matches) return false;
      }
      if (selectedRoleFilter && !account.roles.includes(selectedRoleFilter)) {
        return false;
      }
      if (selectedStatusFilter === "active" && !account.active) {
        return false;
      }
      if (selectedStatusFilter === "suspended" && account.active) {
        return false;
      }
      return true;
    });
  }, [page.items, searchQuery, selectedRoleFilter, selectedStatusFilter]);

  return (
    <div className="space-y-4">
      <PageTitle title={n.title} description={n.description} />

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] font-mono text-xs">

        <div className="it-card space-y-3 p-3">
          <div className="flex items-center justify-between border-b border-slate-300 dark:border-slate-700 pb-2">
            <span className="font-bold uppercase tracking-wider text-ink">STAFF DIRECTORY</span>
            {canCreate && (
              <Link
                href="/staff-accounts"
                className="it-btn-3d py-0.5 px-2 text-[10px] text-emerald-800 dark:text-emerald-300 font-bold"
              >
                + {n.new}
              </Link>
            )}
          </div>

          <div className="space-y-2 border-b border-slate-300 dark:border-slate-700 pb-2">
            <div className="relative">
              <Search className="absolute left-2 top-2 size-3.5 text-slate-400" />
              <input
                type="text"
                placeholder={n.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="it-field-sunken w-full pl-7 pr-7 py-1 text-xs font-mono"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <select
                value={selectedRoleFilter}
                onChange={(e) => setSelectedRoleFilter(e.target.value)}
                className="it-field-sunken w-full font-mono text-[11px] py-1"
              >
                <option value="">{n.filterRole}: {n.filterAll}</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {locale === "ar" ? r.nameAr : r.nameEn}
                  </option>
                ))}
              </select>
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="it-field-sunken w-full font-mono text-[11px] py-1"
              >
                <option value="">{n.filterStatus}: {n.filterAll}</option>
                <option value="active">{n.filterActive}</option>
                <option value="suspended">{n.filterSuspended}</option>
              </select>
            </div>
          </div>

          {!filteredAccounts.length && (
            <p className="text-xs text-ink-muted py-4 text-center">{n.none}</p>
          )}

          <div className="space-y-2">
            {filteredAccounts.map((account) => (
              <div
                key={account.id}
                className={`border p-2.5 transition ${
                  editId === account.id
                    ? "border-sky-600 bg-sky-50/50 dark:bg-sky-950/30"
                    : "border-slate-300 dark:border-slate-700 bg-surface hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <Link
                  href={`/staff-accounts?edit=${encodeURIComponent(account.id)}`}
                  className="block font-bold text-ink hover:underline"
                >
                  {account.displayName || account.email}
                </Link>
                <p dir="ltr" className="break-all text-[11px] text-ink-muted">
                  {account.email}
                </p>
                <div className="flex items-center justify-between text-[10px] text-ink-muted mt-1">
                  <span>
                    {account.lastLoginAt
                      ? date(account.lastLoginAt)
                      : account.roles.join(", ")}
                  </span>
                  <span
                    className={`px-1 py-0.2 border text-[9px] font-bold ${
                      account.active
                        ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40"
                        : "border-rose-600 text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40"
                    }`}
                  >
                    {account.active ? n.filterActive : n.filterSuspended}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <nav className="flex gap-2 text-xs pt-2 border-t border-slate-300 dark:border-slate-700">
            {cursor && (
              <Link href="/staff-accounts" className="it-btn-3d py-1 px-3">
                {n.first}
              </Link>
            )}
            {page.nextCursor && (
              <Link
                href={`/staff-accounts?cursor=${encodeURIComponent(page.nextCursor)}`}
                className="it-btn-3d py-1 px-3"
              >
                {n.next}
              </Link>
            )}
          </nav>
        </div>

        <div className="it-card space-y-4 p-4">
          <div className="border-b border-slate-300 dark:border-slate-700 pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink font-mono">
              {editId ? n.edit : n.new}
            </h2>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <fieldset disabled={busy || !editable} className="space-y-3 font-sans text-xs">
              {!editId && (
                <label className="block space-y-1">
                  <span className="font-bold text-ink-muted font-mono">{n.copyFrom}</span>
                  <select
                    value={draft.copiedFrom ?? ""}
                    onChange={(event) => {
                      const id = event.target.value;
                      if (!id) {
                        change({ copiedFrom: undefined });
                        return;
                      }
                      void run(async () => {
                        const result = await copyStaffAccessAction(id);
                        if (!result.ok) {
                          toast.error(n[result.reason]);
                          return;
                        }
                        change({ ...result.value, copiedFrom: id });
                      });
                    }}
                    className="it-field-sunken w-full font-mono text-xs"
                  >
                    <option value="">{n.noCopy}</option>
                    {page.items.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.displayName || account.email}
                      </option>
                    ))}
                  </select>
                  <span className="block text-[11px] text-ink-muted font-mono">
                    {n.copyHint}
                  </span>
                </label>
              )}
              <label className="block space-y-1">
                <span className="font-bold text-ink-muted font-mono">{n.name}</span>
                <input
                  required
                  maxLength={120}
                  value={draft.displayName}
                  onChange={(event) =>
                    change({ displayName: event.target.value })
                  }
                  className="it-field-sunken w-full font-sans text-xs"
                />
              </label>
              <label className="block space-y-1">
                <span className="font-bold text-ink-muted font-mono">{n.email}</span>
                <input
                  required
                  type="email"
                  maxLength={254}
                  dir="ltr"
                  value={draft.email}
                  onChange={(event) => change({ email: event.target.value })}
                  className="it-field-sunken w-full font-mono text-xs"
                />
              </label>
              <label className="block space-y-1">
                <span className="font-bold text-ink-muted font-mono">{n.role}</span>
                <select
                  required
                  value={draft.role}
                  onChange={(event) => change({ role: event.target.value })}
                  className="it-field-sunken w-full font-mono text-xs"
                >
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {locale === "ar" ? role.nameAr : role.nameEn}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 font-mono text-xs">
                <input
                  type="checkbox"
                  checked={draft.active}
                  onChange={(event) => change({ active: event.target.checked })}
                  className="size-4"
                />
                <span className="font-bold">{n.active}</span>
              </label>
            </fieldset>

            <StaffAccessEditor
              grants={draft.overrides ?? {}}
              scopes={draft.dataScopes ?? {}}
              inherit
              disabled={busy || !editable}
              onChange={(overrides, dataScopes) =>
                change({ overrides, dataScopes })
              }
            />

            <p className="text-[11px] text-ink-muted font-mono">{n.previewHint}</p>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-300 dark:border-slate-700">
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    const result = await previewStaffAccessAction(policy());
                    if (!result.ok) {
                      toast.error(n[result.reason]);
                      return;
                    }
                    setPreview(result.value);
                  })
                }
                className="it-btn-3d py-1 px-3 font-mono font-bold text-sky-800 dark:text-sky-300"
              >
                {n.preview}
              </button>

              {editable && (
                <button
                  type="submit"
                  disabled={busy || !preview}
                  className="it-btn-3d py-1 px-4 font-mono font-bold text-emerald-800 dark:text-emerald-300 disabled:opacity-40"
                >
                  {n.save}
                </button>
              )}
            </div>

            {preview && (
              <div className="mt-3">
                <StaffEffectiveAccess
                  permissions={preview.permissions}
                  scopes={preview.dataScopes}
                />
              </div>
            )}
          </form>

          {editId && canExecute && (
            <div className="flex flex-wrap gap-2 border-t border-slate-300 dark:border-slate-700 pt-3 font-mono text-xs">
              <button
                type="button"
                disabled={busy}
                onClick={() => setActionModal({ type: "invite", accountId: editId })}
                className="it-btn-3d py-1 px-2.5"
              >
                {n.invite}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setActionModal({ type: "resetMfa", accountId: editId })}
                className="it-btn-3d py-1 px-2.5 text-amber-800 dark:text-amber-400 font-bold"
              >
                {n.resetMfa}
              </button>
              {draft.active ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setActionModal({ type: "suspend", accountId: editId })}
                  className="it-btn-3d py-1 px-2.5 text-rose-700 dark:text-rose-400 font-bold"
                >
                  {n.suspend}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setActionModal({ type: "unsuspend", accountId: editId })}
                  className="it-btn-3d py-1 px-2.5 text-emerald-800 dark:text-emerald-300 font-bold"
                >
                  {n.unsuspend}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {actionModal && (
        <CriticalActionModal
          open={true}
          title={
            actionModal.type === "suspend"
              ? n.suspendModalTitle
              : actionModal.type === "unsuspend"
              ? n.unsuspendModalTitle
              : actionModal.type === "resetMfa"
              ? n.resetMfaModalTitle
              : n.invite
          }
          description={
            actionModal.type === "suspend"
              ? n.suspendModalDesc
              : actionModal.type === "unsuspend"
              ? n.unsuspendModalDesc
              : actionModal.type === "resetMfa"
              ? n.resetMfaModalDesc
              : n.invitationConfirm
          }
          requiredConfirmationText={
            actionModal.type === "suspend"
              ? "LOCK"
              : actionModal.type === "resetMfa"
              ? "RESET"
              : "CONFIRM"
          }
          dangerLevel={actionModal.type === "unsuspend" || actionModal.type === "invite" ? "warning" : "critical"}
          busy={busy}
          onCancel={() => setActionModal(null)}
          onConfirm={async () => {
            const currentModal = actionModal;
            setActionModal(null);
            if (currentModal.type === "suspend") {
              await run(async () => {
                const result = await suspendStaffAccountAction(currentModal.accountId, draft);
                if (result.ok) {
                  toast.success(n.suspended);
                  change({ active: false });
                  router.refresh();
                } else {
                  toast.error(n[result.reason]);
                }
              });
            } else if (currentModal.type === "unsuspend") {
              await run(async () => {
                const result = await unsuspendStaffAccountAction(currentModal.accountId, draft);
                if (result.ok) {
                  toast.success(n.unsuspended);
                  change({ active: true });
                  router.refresh();
                } else {
                  toast.error(n[result.reason]);
                }
              });
            } else if (currentModal.type === "resetMfa") {
              await run(async () => {
                const result = await resetStaffMFAAction(currentModal.accountId);
                toast[result.ok ? "success" : "error"](
                  result.ok ? n.mfaReset : n[result.reason],
                );
                router.refresh();
              });
            } else if (currentModal.type === "invite") {
              await run(async () => {
                const result = await inviteStaffAccountAction(currentModal.accountId);
                toast[result.ok ? "success" : "error"](
                  result.ok ? n.invited : n[result.reason],
                );
              });
            }
          }}
        />
      )}
    </div>
  );
}
