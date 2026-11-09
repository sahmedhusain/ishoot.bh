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
      <div className="flex items-center justify-between border-b border-slate-300 dark:border-slate-700 pb-2 mb-4">
        <PageTitle title={n.title} description={n.description} />
        <span className="it-status-pane font-bold text-amber-700 dark:text-amber-400">
          T-CODE: SM04S [SESSIONS]
        </span>
      </div>
      <p className="text-xs font-mono text-ink-muted mb-4">{n.coverage}</p>
      <div className="it-card p-4 mb-4">
        <form
          method="get"
          action="/sessions"
          className="flex flex-wrap items-end gap-3 text-xs font-mono"
        >
          <label className="grid gap-1">
            <span className="uppercase font-bold text-[10px] text-ink-muted">{n.realm}</span>
            <select
              name="realm"
              aria-label={n.realm}
              defaultValue={filter.realm}
              className="it-field-sunken"
            >
              <option value="">{n.realms.all}</option>
              {(["staff", "customer", "it"] as const).map((realm) => (
                <option key={realm} value={realm}>
                  {n.realms[realm]}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 min-w-0 flex-1">
            <span className="uppercase font-bold text-[10px] text-ink-muted">{n.accountId}</span>
            <input
              name="subjectId"
              defaultValue={filter.subjectId}
              maxLength={200}
              dir="ltr"
              className="it-field-sunken w-full"
            />
          </label>
          <button type="submit" className="it-btn-3d py-1.5 px-4 font-bold text-emerald-800 dark:text-emerald-300">
            {n.filter}
          </button>
          <Link href="/sessions" className="it-btn-3d py-1.5 px-3">
            {n.clear}
          </Link>
        </form>
      </div>
      {ended && (
        <div role="status" className="p-2 mb-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-mono">
          ✔ {n.ended}
        </div>
      )}
      <div className="it-card p-0 overflow-x-auto">
        {page.items.length === 0 ? (
          <p className="p-6 text-xs font-mono text-ink-muted">{n.empty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="it-table w-full font-mono text-xs">
              <thead>
                <tr>
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
                      className="whitespace-nowrap uppercase"
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
                    >
                      <td>
                        <span dir="ltr" className="font-semibold text-ink">
                          {session.email || session.subjectId}
                        </span>
                        <div className="text-[10px] text-ink-muted" dir="ltr">
                          {session.subjectId}
                        </div>
                      </td>
                      <td className="whitespace-nowrap uppercase">
                        {n.realms[session.realm]}
                      </td>
                      <td className="whitespace-nowrap text-[10px] text-ink-muted">
                        {date(session.createdAt)}
                      </td>
                      <td className="whitespace-nowrap text-[10px] text-ink-muted">
                        {date(session.expiresAt)}
                      </td>
                      <td className="whitespace-nowrap font-bold">
                        <span className={`it-badge ${state === "active" ? "it-badge-active" : "it-badge-neutral"}`}>
                          {n[state]}
                        </span>
                      </td>
                      <td>
                        <code dir="ltr" className="text-[10px]">
                          {session.id}
                        </code>
                        {session.id === currentSessionId && (
                          <div className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                            [{n.current}]
                          </div>
                        )}
                      </td>
                      <td className="text-center">
                        {canRevoke && state === "active" && (
                          <button
                            type="button"
                            onClick={() => {
                              setEnded(false);
                              setSelected(session.id);
                            }}
                            className="it-btn-3d py-0.5 px-2 text-[10px] text-rose-700 dark:text-rose-400 font-bold"
                          >
                            {n.revoke}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="flex gap-2 mt-4 text-xs font-mono">
        {filter.cursor && (
          <Link href={href(filter, "")} className="it-btn-3d py-1 px-3">
            {n.first}
          </Link>
        )}
        {page.nextCursor && (
          <Link href={href(filter, page.nextCursor)} className="it-btn-3d py-1 px-3">
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
