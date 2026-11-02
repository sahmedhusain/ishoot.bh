"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Card, Input, Select } from "@platform/ui";
import { IT_ROLES } from "@platform/contracts";
import { formatMessage } from "@platform/locales";
import type { ITAccountPage, ITProvisioning } from "@platform/api-client";
import {
  createITAccountAction,
  updateITAccountAction,
} from "../app/(desk)/it-accounts/actions";
import { useCopy } from "./CopyProvider";
import { PageTitle } from "./ticket-ui";

export function ITAccountsView({
  page,
  cursor,
  canCreate,
  canEdit,
}: {
  page: ITAccountPage;
  cursor: string;
  canCreate: boolean;
  canEdit: boolean;
}) {
  const { copy, role, date } = useCopy();
  const n = copy.itAccounts;
  const router = useRouter();
  const passwordId = React.useId();
  const [busy, setBusy] = React.useState(false);
  const [provisioning, setProvisioning] = React.useState<
    (ITProvisioning & { email: string }) | null
  >(null);
  const roles = IT_ROLES.map((value) => (
    <option key={value} value={value}>
      {role(value)}
    </option>
  ));

  const submit = async (
    event: React.FormEvent<HTMLFormElement>,
    id?: string,
  ) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    try {
      const outcome = id
        ? await updateITAccountAction(id, data)
        : await createITAccountAction(data);
      if (!outcome.ok) {
        toast.error(n.errors[outcome.reason]);
        if (id) form.reset();
        return;
      }
      if (outcome.provisioning)
        setProvisioning({
          ...outcome.provisioning,
          email: String(data.get("email")),
        });
      if (!id) form.reset();
      toast.success(id ? n.saved : n.created);
      router.refresh();
    } catch {
      toast.error(n.errors.unavailable);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageTitle title={n.title} description={n.description} />
      {provisioning && (
        <Card
          role="status"
          className="mb-6 p-6 rounded-3xl border border-outline-variant space-y-3"
        >
          <h2 className="font-semibold">{n.provisioning}</h2>
          <p dir="ltr">{provisioning.email}</p>
          <p className="text-sm text-ink-muted">{n.provisioningHint}</p>
          <p>
            {n.secret}:{" "}
            <code dir="ltr" className="break-all select-all">
              {provisioning.secret}
            </code>
          </p>
          <p>
            <a href={provisioning.otpAuthUrl} className="underline">
              {n.setupLink}
            </a>
          </p>
          <p className="font-semibold">{n.recoveryCodes}</p>
          <pre dir="ltr" className="select-all whitespace-pre-wrap">
            {provisioning.recoveryCodes.join("\n")}
          </pre>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setProvisioning(null)}
          >
            {n.dismiss}
          </Button>
        </Card>
      )}
      {canCreate && (
        <Card className="mb-6 p-6 rounded-3xl border border-outline-variant">
          <h2 className="font-semibold mb-4">{n.create}</h2>
          <form
            aria-label={n.create}
            onSubmit={(event) => void submit(event)}
            className="grid sm:grid-cols-2 gap-4"
            aria-busy={busy}
          >
            <label className="text-sm space-y-1">
              {n.email}
              <Input
                name="email"
                type="email"
                dir="ltr"
                autoComplete="off"
                required
                maxLength={254}
                disabled={busy}
              />
            </label>
            <div className="text-sm space-y-1">
              <label htmlFor={passwordId}>{n.password}</label>
              <Input
                id={passwordId}
                name="password"
                type="password"
                aria-describedby={`${passwordId}-hint`}
                autoComplete="new-password"
                required
                minLength={page.passwordMinLength}
                maxLength={1024}
                disabled={busy}
              />
              <span
                id={`${passwordId}-hint`}
                className="block text-xs text-ink-muted"
              >
                {formatMessage(n.passwordMin, {
                  count: page.passwordMinLength,
                })}
              </span>
            </div>
            <Select
              name="role"
              aria-label={n.role}
              defaultValue="it_support"
              disabled={busy}
            >
              {roles}
            </Select>
            <Button type="submit" disabled={busy}>
              {n.create}
            </Button>
          </form>
        </Card>
      )}
      <ul className="space-y-3" aria-label={n.title}>
        {page.items.map((account) => (
          <li
            key={`${account.id}:${account.roles.join(",")}:${account.active}`}
          >
            <Card className="p-5 rounded-3xl border border-outline-variant">
              <h2 className="font-semibold">
                <bdi dir="ltr">{account.email}</bdi>
              </h2>
              <p className="text-xs text-ink-muted my-2">
                {n.lastLogin}:{" "}
                {account.lastLoginAt ? date(account.lastLoginAt) : n.never} ·{" "}
                {account.mfaEnabled ? n.mfaEnabled : n.mfaMissing}
              </p>
              <form
                aria-label={account.email}
                onSubmit={(event) => void submit(event, account.id)}
                className="flex flex-wrap items-center gap-4"
                aria-busy={busy}
              >
                <Select
                  name="role"
                  aria-label={n.role}
                  defaultValue={account.roles[0]}
                  disabled={!canEdit || busy}
                >
                  {roles}
                </Select>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="active"
                    defaultChecked={account.active}
                    disabled={!canEdit || busy}
                  />
                  {n.active}
                </label>
                {canEdit && (
                  <Button type="submit" disabled={busy}>
                    {n.save}
                  </Button>
                )}
              </form>
            </Card>
          </li>
        ))}
      </ul>
      <div className="flex gap-4 mt-6 text-sm underline">
        {cursor && <Link href="/it-accounts">{n.first}</Link>}
        {page.nextCursor && (
          <Link
            href={`/it-accounts?cursor=${encodeURIComponent(page.nextCursor)}`}
          >
            {n.next}
          </Link>
        )}
      </div>
    </>
  );
}
