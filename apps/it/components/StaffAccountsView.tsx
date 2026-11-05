"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Card, Input, Select } from "@platform/ui";
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
  return (
    <>
      <PageTitle title={n.title} description={n.description} />
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Card className="min-w-0 space-y-3 rounded-3xl p-5">
          {canCreate && (
            <Link
              href="/staff-accounts"
              className="inline-block text-sm font-semibold text-primary"
            >
              {n.new}
            </Link>
          )}
          {!page.items.length && (
            <p className="text-sm text-ink-muted">{n.none}</p>
          )}
          {page.items.map((account) => (
            <div
              key={account.id}
              className="rounded-2xl border border-outline-variant p-3"
            >
              <Link
                href={`/staff-accounts?edit=${encodeURIComponent(account.id)}`}
                className="block break-words font-medium"
              >
                {account.displayName || account.email}
              </Link>
              <p dir="ltr" className="break-all text-xs text-ink-muted">
                {account.email}
              </p>
              <p className="text-xs text-ink-muted">
                {account.lastLoginAt
                  ? date(account.lastLoginAt)
                  : account.roles.join(", ")}
              </p>
            </div>
          ))}
          <nav className="flex gap-4 text-sm">
            {cursor && <Link href="/staff-accounts">{n.first}</Link>}
            {page.nextCursor && (
              <Link
                href={`/staff-accounts?cursor=${encodeURIComponent(page.nextCursor)}`}
              >
                {n.next}
              </Link>
            )}
          </nav>
        </Card>
        <Card className="min-w-0 space-y-5 rounded-3xl p-5">
          <h2 className="font-semibold">{editId ? n.edit : n.new}</h2>
          <form onSubmit={submit} className="min-w-0 space-y-5">
            <fieldset disabled={busy || !editable} className="space-y-4">
              {!editId && (
                <label className="block space-y-1 text-sm">
                  <span>{n.copyFrom}</span>
                  <Select
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
                  >
                    <option value="">{n.noCopy}</option>
                    {page.items.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.displayName || account.email}
                      </option>
                    ))}
                  </Select>
                  <span className="block text-xs text-ink-muted">
                    {n.copyHint}
                  </span>
                </label>
              )}
              <label className="block space-y-1 text-sm">
                <span>{n.name}</span>
                <Input
                  required
                  maxLength={120}
                  value={draft.displayName}
                  onChange={(event) =>
                    change({ displayName: event.target.value })
                  }
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span>{n.email}</span>
                <Input
                  required
                  type="email"
                  maxLength={254}
                  dir="ltr"
                  value={draft.email}
                  onChange={(event) => change({ email: event.target.value })}
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span>{n.role}</span>
                <Select
                  required
                  value={draft.role}
                  onChange={(event) => change({ role: event.target.value })}
                >
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {locale === "ar" ? role.nameAr : role.nameEn}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.active}
                  onChange={(event) => change({ active: event.target.checked })}
                />
                {n.active}
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
            <p className="text-xs text-ink-muted">{n.previewHint}</p>
            <Button
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
            >
              {n.preview}
            </Button>
            {preview && (
              <StaffEffectiveAccess
                permissions={preview.permissions}
                scopes={preview.dataScopes}
              />
            )}
            {editable && (
              <Button type="submit" disabled={busy || !preview}>
                {n.save}
              </Button>
            )}
          </form>
          {editId && canExecute && (
            <div className="flex flex-wrap gap-3 border-t border-outline-variant pt-4">
              <Button
                disabled={busy}
                onClick={() => {
                  if (window.confirm(n.invitationConfirm))
                    void run(async () => {
                      const result = await inviteStaffAccountAction(editId);
                      toast[result.ok ? "success" : "error"](
                        result.ok ? n.invited : n[result.reason],
                      );
                    });
                }}
              >
                {n.invite}
              </Button>
              <Button
                disabled={busy}
                onClick={() => {
                  if (window.confirm(n.resetConfirm))
                    void run(async () => {
                      const result = await resetStaffMFAAction(editId);
                      toast[result.ok ? "success" : "error"](
                        result.ok ? n.mfaReset : n[result.reason],
                      );
                      router.refresh();
                    });
                }}
              >
                {n.resetMfa}
              </Button>
              {draft.active ? (
                <Button
                  disabled={busy}
                  variant="outline"
                  className="border-rose-300 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/20"
                  onClick={() => {
                    if (window.confirm(n.suspendConfirm))
                      void run(async () => {
                        const result = await suspendStaffAccountAction(editId, draft);
                        if (result.ok) {
                          toast.success(n.suspended);
                          change({ active: false });
                          router.refresh();
                        } else {
                          toast.error(n[result.reason]);
                        }
                      });
                  }}
                >
                  {n.suspend}
                </Button>
              ) : (
                <Button
                  disabled={busy}
                  variant="outline"
                  className="border-emerald-300 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/20"
                  onClick={() => {
                    if (window.confirm(n.unsuspendConfirm))
                      void run(async () => {
                        const result = await unsuspendStaffAccountAction(editId, draft);
                        if (result.ok) {
                          toast.success(n.unsuspended);
                          change({ active: true });
                          router.refresh();
                        } else {
                          toast.error(n[result.reason]);
                        }
                      });
                  }}
                >
                  {n.unsuspend}
                </Button>
              )}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
