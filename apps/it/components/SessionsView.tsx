"use client";

import * as React from "react";
import Link from "next/link";
import { Button, Card, ConfirmDialog, Input, Select } from "@platform/ui";
import { formatMessage } from "@platform/locales";
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
  const [bulkSubject, setBulkSubject] = React.useState<{ subjectId: string; sessionIds: string[] } | null>(null);
  const [ended, setEnded] = React.useState(false);
  const [bulkEndedCount, setBulkEndedCount] = React.useState<number | null>(null);

  const activeSessionsBySubject = React.useMemo(() => {
    const map = new Map<string, string[]>();
    for (const s of page.items) {
      const isActive = !s.revokedAt && Date.parse(s.expiresAt) > now;
      if (!isActive) continue;
      const arr = map.get(s.subjectId) ?? [];
      arr.push(s.id);
      map.set(s.subjectId, arr);
    }
    return map;
  }, [page.items, now]);
  return (
    <>
      <PageTitle title={n.title} description={n.description} />
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
      {bulkEndedCount !== null && (
        <div role="status" className="p-2 mb-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-mono">
          ✔ {formatMessage(n.bulkEnded, { count: bulkEndedCount })}
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
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span dir="ltr" className="font-semibold text-ink">
                            {session.email || session.subjectId}
                          </span>
                          {(activeSessionsBySubject.get(session.subjectId)?.length ?? 0) >= 2 && state === "active" && (
                            <span className="it-badge it-badge-warn text-[9px]">
                              {formatMessage(n.anomalyMulti, {
                                count: activeSessionsBySubject.get(session.subjectId)?.length ?? 0,
                              })}
                            </span>
                          )}
                        </div>
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
                          <div className="flex flex-wrap items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEnded(false);
                                setBulkEndedCount(null);
                                setSelected(session.id);
                              }}
                              className="it-btn-3d py-0.5 px-2 text-[10px] text-rose-700 dark:text-rose-400 font-bold"
                            >
                              {n.revoke}
                            </button>
                            {(() => {
                              const others = (activeSessionsBySubject.get(session.subjectId) ?? []).filter(
                                (id) => id !== currentSessionId,
                              );
                              if (others.length < 2) return null;
                              return (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEnded(false);
                                    setBulkEndedCount(null);
                                    setBulkSubject({ subjectId: session.subjectId, sessionIds: others });
                                  }}
                                  className="it-btn-3d py-0.5 px-2 text-[10px] text-amber-800 dark:text-amber-300 font-bold"
                                >
                                  {formatMessage(n.revokeAllForAccount, { count: others.length })}
                                </button>
                              );
                            })()}
                          </div>
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
      <ConfirmDialog
        isOpen={bulkSubject !== null}
        onClose={() => setBulkSubject(null)}
        title={n.bulkConfirmTitle}
        description={n.bulkConfirmBody}
        confirmLabel={n.revoke}
        cancelLabel={n.cancel}
        errorLabel={n.failed}
        variant="warning"
        onConfirm={async () => {
          if (!bulkSubject) return;
          let count = 0;
          for (const id of bulkSubject.sessionIds) {
            const res = await revokeSessionAction(id);
            if (res.ok) count++;
          }
          if (count === 0) throw new Error(n.failed);
          setBulkEndedCount(count);
        }}
      />
    </>
  );
}
