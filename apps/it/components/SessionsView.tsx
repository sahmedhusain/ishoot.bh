"use client";

import * as React from "react";
import Link from "next/link";
import { Button, Card, ConfirmDialog, Input, Select } from "@platform/ui";
import type { IdentitySessionPage, Realm } from "@platform/api-client";
import { revokeSessionAction } from "../app/(desk)/sessions/actions";
import { useCopy } from "./CopyProvider";
import { PageTitle } from "./ticket-ui";

export type SessionFilter = {
  realm: Realm | "";
  subjectId: string;
  cursor: string;
};
function href(filter: SessionFilter, cursor: string) {
  const query = new URLSearchParams();
  if (filter.realm) query.set("realm", filter.realm);
  if (filter.subjectId) query.set("subjectId", filter.subjectId);
  if (cursor) query.set("cursor", cursor);
  return `/sessions${query.size ? `?${query}` : ""}`;
}

export function SessionsView({
  page,
  filter,
  currentSessionId,
  now,
  canRevoke,
}: {
  page: IdentitySessionPage;
  filter: SessionFilter;
  currentSessionId: string;
  now: number;
  canRevoke: boolean;
}) {
  const { copy, date } = useCopy();
  const n = copy.sessions;
  const [selected, setSelected] = React.useState<string | null>(null);
  const [ended, setEnded] = React.useState(false);
  return (
    <>
      <PageTitle title={n.title} description={n.description} />
      <p className="text-sm text-ink-muted mb-5">{n.coverage}</p>
      <Card className="p-4 mb-5">
        <form
          method="get"
          action="/sessions"
          className="flex flex-wrap items-end gap-3"
        >
          <label className="grid gap-1 text-sm">
            <span>{n.realm}</span>
            <Select
              name="realm"
              aria-label={n.realm}
              defaultValue={filter.realm}
            >
              <option value="">{n.realms.all}</option>
              {(["staff", "customer", "it"] as const).map((realm) => (
                <option key={realm} value={realm}>
                  {n.realms[realm]}
                </option>
              ))}
            </Select>
          </label>
          <label className="grid gap-1 text-sm min-w-0 flex-1">
            <span>{n.accountId}</span>
            <Input
              name="subjectId"
              defaultValue={filter.subjectId}
              maxLength={200}
              dir="ltr"
            />
          </label>
          <Button type="submit">{n.filter}</Button>
          <Link href="/sessions" className="text-sm underline">
            {n.clear}
          </Link>
        </form>
      </Card>
      {ended && (
        <p role="status" className="text-sm text-ink mb-4">
          {n.ended}
        </p>
      )}
      <Card className="overflow-hidden">
        {page.items.length === 0 ? (
          <p className="p-6 text-sm text-ink-muted">{n.empty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-start">
              <thead>
                <tr className="border-b border-outline-variant">
                  {[
                    n.account,
                    n.realm,
                    n.created,
                    n.expires,
                    n.status,
                    n.sessionId,
                    n.actions,
                  ].map((label) => (
                    <th
                      key={label}
                      className="p-3 text-start font-medium whitespace-nowrap"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {page.items.map((session) => {
                  const state = session.revokedAt
                    ? "revoked"
                    : Date.parse(session.expiresAt) <= now
                      ? "expired"
                      : "active";
                  return (
                    <tr
                      key={session.id}
                      data-testid={`identity-session-${session.id}`}
                      className="border-b last:border-0 border-outline-variant"
                    >
                      <td className="p-3">
                        <span dir="ltr">
                          {session.email || session.subjectId}
                        </span>
                        <div className="text-xs text-ink-muted" dir="ltr">
                          {session.subjectId}
                        </div>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {n.realms[session.realm]}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {date(session.createdAt)}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {date(session.expiresAt)}
                      </td>
                      <td className="p-3 whitespace-nowrap">{n[state]}</td>
                      <td className="p-3">
                        <code dir="ltr" className="text-xs">
                          {session.id}
                        </code>
                        {session.id === currentSessionId && (
                          <div className="text-xs text-ink-muted">
                            {n.current}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        {canRevoke && state === "active" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEnded(false);
                              setSelected(session.id);
                            }}
                          >
                            {n.revoke}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <div className="flex gap-4 mt-4 text-sm">
        {filter.cursor && (
          <Link href={href(filter, "")} className="underline">
            {n.first}
          </Link>
        )}
        {page.nextCursor && (
          <Link href={href(filter, page.nextCursor)} className="underline">
            {n.next}
          </Link>
        )}
      </div>
      <ConfirmDialog
        isOpen={selected !== null}
        onClose={() => setSelected(null)}
        title={n.confirmTitle}
        description={n.confirmBody}
        confirmLabel={n.revoke}
        cancelLabel={n.cancel}
        errorLabel={n.failed}
        variant="warning"
        onConfirm={async () => {
          if (!selected || !(await revokeSessionAction(selected)).ok)
            throw new Error(n.failed);
          setEnded(true);
        }}
      />
    </>
  );
}
