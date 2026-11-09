"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, X } from "lucide-react";
import type { StaffRolePage, StaffRoleDraft } from "@platform/api-client";
import {
  saveStaffRoleAction,
  deleteStaffRoleAction,
} from "../app/(desk)/staff-roles/actions";
import { useCopy } from "./CopyProvider";
import { PageTitle } from "./ticket-ui";
import { StaffAccessEditor } from "./StaffAccessEditor";
import { CriticalActionModal } from "./CriticalActionModal";

export function StaffRolesView({
  page,
  initial,
  cursor,
  canCreate,
  canEdit,
  canDelete,
}: {
  page: StaffRolePage;
  initial?: StaffRoleDraft;
  cursor: string;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const { copy, locale } = useCopy();
  const n = copy.staffRoles;
  const a = copy.staffAccounts;
  const router = useRouter();
  const [draft, setDraft] = React.useState<StaffRoleDraft>(
    initial ?? { id: "", nameEn: "", nameAr: "", grants: {}, dataScopes: {} },
  );
  const [busy, setBusy] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);

  const editable = initial ? canEdit : canCreate;
  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    try {
      await work();
    } catch {
      toast.error(a.failed);
    } finally {
      setBusy(false);
    }
  };

  const filteredRoles = React.useMemo(() => {
    if (!searchQuery.trim()) return page.items;
    const q = searchQuery.toLowerCase();
    return page.items.filter(
      (r) =>
        r.id.toLowerCase().includes(q) ||
        r.nameEn.toLowerCase().includes(q) ||
        r.nameAr.toLowerCase().includes(q),
    );
  }, [page.items, searchQuery]);

  return (
    <div className="space-y-4">
      <PageTitle title={n.title} description={n.description} />

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] font-mono text-xs">

        <div className="it-card space-y-3 p-3">
          <div className="flex items-center justify-between border-b border-slate-300 dark:border-slate-700 pb-2">
            <span className="font-bold uppercase tracking-wider text-ink">STAFF ROLES</span>
            {canCreate && (
              <Link
                href="/staff-roles"
                className="it-btn-3d py-0.5 px-2 text-[10px] text-emerald-800 dark:text-emerald-300 font-bold"
              >
                + {n.new}
              </Link>
            )}
          </div>

          <div className="relative border-b border-slate-300 dark:border-slate-700 pb-2">
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

          {!filteredRoles.length && (
            <p className="text-xs text-ink-muted py-4 text-center">{n.none}</p>
          )}

          <div className="space-y-1.5">
            {filteredRoles.map((role) => (
              <Link
                key={role.id}
                href={`/staff-roles?edit=${encodeURIComponent(role.id)}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`}
                className={`block border p-2 text-xs font-bold transition ${
                  initial?.id === role.id
                    ? "border-sky-600 bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300"
                    : "border-slate-300 dark:border-slate-700 bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-ink"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{locale === "ar" ? role.nameAr : role.nameEn}</span>
                  {role.system && (
                    <span className="text-[9px] uppercase px-1 py-0.2 border border-amber-600 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30">
                      SYS
                    </span>
                  )}
                </div>
                <span className="block font-normal text-[10px] text-ink-muted mt-0.5 font-mono">
                  [{role.id}]
                </span>
              </Link>
            ))}
          </div>

          <nav className="flex gap-2 text-xs pt-2 border-t border-slate-300 dark:border-slate-700">
            {cursor && (
              <Link href="/staff-roles" className="it-btn-3d py-1 px-3">
                {a.first}
              </Link>
            )}
            {page.nextCursor && (
              <Link
                href={`/staff-roles?cursor=${encodeURIComponent(page.nextCursor)}`}
                className="it-btn-3d py-1 px-3"
              >
                {a.next}
              </Link>
            )}
          </nav>
        </div>

        <div className="it-card space-y-4 p-4">
          <div className="border-b border-slate-300 dark:border-slate-700 pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink font-mono">
              {initial ? (locale === "ar" ? initial.nameAr : initial.nameEn) : n.new}
            </h2>
          </div>

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void run(async () => {
                const result = await saveStaffRoleAction(draft, !initial);
                if (!result.ok) {
                  toast.error(a[result.reason]);
                  return;
                }
                toast.success(n.saved);
                router.replace("/staff-roles");
                router.refresh();
              });
            }}
          >
            <fieldset disabled={busy || !editable} className="space-y-3 font-mono text-xs">
              <label className="block space-y-1">
                <span className="font-bold text-ink-muted uppercase">{n.id}</span>
                <input
                  required
                  maxLength={200}
                  dir="ltr"
                  disabled={!!initial}
                  value={draft.id}
                  onChange={(event) =>
                    setDraft({ ...draft, id: event.target.value })
                  }
                  className="it-field-sunken w-full font-mono text-xs uppercase"
                />
              </label>
              <label className="block space-y-1">
                <span className="font-bold text-ink-muted uppercase">{n.nameEn}</span>
                <input
                  required
                  maxLength={120}
                  dir="ltr"
                  value={draft.nameEn}
                  onChange={(event) =>
                    setDraft({ ...draft, nameEn: event.target.value })
                  }
                  className="it-field-sunken w-full font-sans text-xs"
                />
              </label>
              <label className="block space-y-1">
                <span className="font-bold text-ink-muted uppercase">{n.nameAr}</span>
                <input
                  required
                  maxLength={120}
                  dir="rtl"
                  value={draft.nameAr}
                  onChange={(event) =>
                    setDraft({ ...draft, nameAr: event.target.value })
                  }
                  className="it-field-sunken w-full font-sans text-xs"
                />
              </label>
            </fieldset>

            <StaffAccessEditor
              grants={draft.grants}
              scopes={draft.dataScopes}
              disabled={busy || !editable}
              onChange={(grants, dataScopes) =>
                setDraft({ ...draft, grants, dataScopes })
              }
            />

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-300 dark:border-slate-700">
              {editable && (
                <button
                  type="submit"
                  disabled={busy}
                  className="it-btn-3d py-1 px-4 font-bold text-emerald-800 dark:text-emerald-300 font-mono"
                >
                  {n.save}
                </button>
              )}
              {initial && !initial.system && canDelete && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setShowDeleteModal(true)}
                  className="it-btn-3d py-1 px-3 text-rose-700 dark:text-rose-400 font-bold font-mono"
                >
                  {n.delete}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {showDeleteModal && initial && (
        <CriticalActionModal
          open={true}
          title={n.deleteModalTitle}
          description={n.deleteModalDesc}
          impactDetails={[
            `Role: ${locale === "ar" ? initial.nameAr : initial.nameEn} (${initial.id})`,
            n.systemRoleNotice,
          ]}
          requiredConfirmationText="DELETE"
          dangerLevel="critical"
          busy={busy}
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={async () => {
            setShowDeleteModal(false);
            await run(async () => {
              const result = await deleteStaffRoleAction(initial.id);
              if (!result.ok) {
                toast.error(a[result.reason]);
                return;
              }
              toast.success(n.deleted);
              router.replace("/staff-roles");
              router.refresh();
            });
          }}
        />
      )}
    </div>
  );
}
