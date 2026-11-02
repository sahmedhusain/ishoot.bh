"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Card, Input } from "@platform/ui";
import type { StaffRolePage, StaffRoleDraft } from "@platform/api-client";
import {
  saveStaffRoleAction,
  deleteStaffRoleAction,
} from "../app/(desk)/staff-roles/actions";
import { useCopy } from "./CopyProvider";
import { PageTitle } from "./ticket-ui";
import { StaffAccessEditor } from "./StaffAccessEditor";
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
  return (
    <>
      <PageTitle title={n.title} description={n.description} />
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Card className="min-w-0 space-y-3 rounded-3xl p-5">
          {canCreate && (
            <Link
              href="/staff-roles"
              className="block text-sm font-semibold text-primary"
            >
              {n.new}
            </Link>
          )}
          {!page.items.length && (
            <p className="text-sm text-ink-muted">{n.none}</p>
          )}
          {page.items.map((role) => (
            <Link
              key={role.id}
              href={`/staff-roles?edit=${encodeURIComponent(role.id)}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`}
              className="block rounded-2xl border border-outline-variant p-3 text-sm"
            >
              {locale === "ar" ? role.nameAr : role.nameEn}
            </Link>
          ))}
          <nav className="flex gap-4 text-sm">
            {cursor && <Link href="/staff-roles">{a.first}</Link>}
            {page.nextCursor && (
              <Link
                href={`/staff-roles?cursor=${encodeURIComponent(page.nextCursor)}`}
              >
                {a.next}
              </Link>
            )}
          </nav>
        </Card>
        <Card className="min-w-0 rounded-3xl p-5">
          <form
            className="space-y-5"
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
            <fieldset disabled={busy || !editable} className="space-y-4">
              <label className="block space-y-1 text-sm">
                <span>{n.id}</span>
                <Input
                  required
                  maxLength={200}
                  dir="ltr"
                  disabled={!!initial}
                  value={draft.id}
                  onChange={(event) =>
                    setDraft({ ...draft, id: event.target.value })
                  }
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span>{n.nameEn}</span>
                <Input
                  required
                  maxLength={120}
                  dir="ltr"
                  value={draft.nameEn}
                  onChange={(event) =>
                    setDraft({ ...draft, nameEn: event.target.value })
                  }
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span>{n.nameAr}</span>
                <Input
                  required
                  maxLength={120}
                  dir="rtl"
                  value={draft.nameAr}
                  onChange={(event) =>
                    setDraft({ ...draft, nameAr: event.target.value })
                  }
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
            {editable && (
              <Button type="submit" disabled={busy}>
                {n.save}
              </Button>
            )}
            {initial && !initial.system && canDelete && (
              <Button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (window.confirm(n.deleteConfirm))
                    void run(async () => {
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
              >
                {n.delete}
              </Button>
            )}
          </form>
        </Card>
      </div>
    </>
  );
}
