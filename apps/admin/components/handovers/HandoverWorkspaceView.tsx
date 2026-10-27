"use client";
import { useConfirmation } from "@platform/ui";

import { formatMessage } from "@platform/locales";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  Laptop,
  MinusCircle,
  RefreshCw,
  Send,
  Users,
  XCircle,
} from "lucide-react";
import { Button, Input, Select, formatDate } from "@platform/ui";
import type { AssetRecord, EmployeeHandoverDetail } from "@platform/database";
import { ROUTES } from "../../constants/routes";
import {
  applyHandoverCasesAction,
  cancelEmployeeHandoverAction,
  refreshHandoverCasesAction,
  setHandoverCaseModeAction,
  submitEmployeeHandoverAction,
  updateHandoverChecklistAction,
} from "../../app/actions/employee-handovers";
import { ApprovalDecisionPanel } from "../approvals/ApprovalDecisionPanel";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { HandoverForm } from "../assets/HandoverForm";
import { HANDOVER_STATUS_STYLE } from "./HandoversListView";

type User = { id: string; name: string };
const MODES = ["delegate", "spread", "manual"] as const;

/**
 * One exit or leave handover: the employee's open cases and who takes them over (one person, shared across a
 * team, or chosen case by case), the company assets to bring back, HR's checklist, and the approval.
 */
export function HandoverWorkspaceView({
  handover,
  held,
  users,
  canEdit,
  canReturnAssets,
  approvalId,
  signatureRequired = false,
}: {
  handover: EmployeeHandoverDetail;
  held: AssetRecord[];
  users: User[];
  canEdit: boolean;
  canReturnAssets: boolean;
  approvalId: string | null;
  /** Approvers draw their signature when approving. */
  signatureRequired?: boolean;
}) {
  const confirmAction = useConfirmation();
  const { t, locale } = useAdminLocale();
  const e = t.employeeHandovers;
  const router = useRouter();
  const isAr = locale === "ar";
  const editable = canEdit && handover.status === "open";
  const [mode, setMode] = React.useState(
    handover.cases_mode as (typeof MODES)[number],
  );
  const [delegate, setDelegate] = React.useState(
    handover.delegate_user_id ?? "",
  );
  const [team, setTeam] = React.useState<string[]>(handover.team_user_ids);
  const [choices, setChoices] = React.useState<Record<string, string>>({});
  const [returning, setReturning] = React.useState<AssetRecord | null>(null);
  const [notes, setNotes] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(handover.checklist.map((c) => [c.key, c.note ?? ""])),
  );
  const [busy, setBusy] = React.useState(false);
  const pending = handover.cases.filter((c) => c.status === "pending");
  const b = handover.blockers;
  const ready =
    !b.assetsHeld &&
    !b.returnsInProgress &&
    !b.casesPending &&
    !b.checklistOpen;
  const name = isAr ? handover.employee.name_ar : handover.employee.name_en;

  const run = async (work: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await work();
      toast.success(success);
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error, t, e.failed));
    } finally {
      setBusy(false);
    }
  };

  const reassign = () =>
    run(async () => {
      await setHandoverCaseModeAction(handover.id, {
        mode,
        ...(mode === "delegate" ? { delegate_user_id: delegate } : {}),
        ...(mode === "spread" ? { team_user_ids: team } : {}),
      });
      await applyHandoverCasesAction(
        handover.id,
        mode === "manual"
          ? Object.fromEntries(Object.entries(choices).filter(([, v]) => v))
          : {},
      );
    }, e.casesMoved);

  const caseLabel = (c: EmployeeHandoverDetail["cases"][number]) => {
    if (c.type !== "approval") return c.label;
    const type = c.label.split(":")[0] as keyof typeof t.approvals.types;
    return t.approvals.types[type] ?? c.label;
  };
  const caseHref = (c: EmployeeHandoverDetail["cases"][number]) =>
    c.type === "request"
      ? ROUTES.requests.detail(c.case_id)
      : c.type === "deal"
        ? ROUTES.crm.deal(c.case_id)
        : ROUTES.approvals();

  const card =
    "rounded-3xl border border-outline-variant bg-surface-raised dark:bg-surface-raised p-5 space-y-4";
  const heading = (
    icon: React.ReactNode,
    title: string,
    extra?: React.ReactNode,
  ) => (
    <div className="flex items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
        {icon}
        {title}
      </h2>
      {extra}
    </div>
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link
            href={ROUTES.hr.handovers()}
            aria-label={t.actions.back}
            className="mt-1 rounded-full border border-outline-variant p-2 text-ink-muted hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2" data-page-header>
              <h1 className="text-xl sm:text-2xl font-bold text-ink">
                {handover.kind === "exit" ? e.exitTitle : e.leaveTitle}
              </h1>
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${HANDOVER_STATUS_STYLE[handover.status] ?? ""}`}
              >
                {e.statuses[handover.status as keyof typeof e.statuses]}
              </span>
            </div>
            <p className="text-xs text-ink-muted mt-1 font-mono">
              <bdi dir="ltr">{handover.reference}</bdi>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 self-start">
          {handover.kind === "exit" && handover.status !== "cancelled" ? (
            // What the leaving employee is owed is settled in their final settlement.
            <Link
              href={ROUTES.hr.newSettlement({
                employeeId: handover.employee.id,
                handoverId: handover.id,
              })}
              className="inline-flex h-9 items-center rounded-full border border-outline-variant px-4 text-xs font-semibold text-ink hover:bg-ink/5"
            >
              {t.settlements.prepareFromHandover}
            </Link>
          ) : null}
          {canEdit &&
            (handover.status === "open" ||
              handover.status === "pending_approval") ? (
            <Button
              size="sm"
              variant="outline"
              className="self-start text-rose-600"
              disabled={busy}
              onClick={() => {
                confirmAction({
                  description: e.cancelConfirm, onConfirm: () => run(
                    () => cancelEmployeeHandoverAction(handover.id),
                    e.cancelled,
                  )
                });
              }}
            >
              {e.cancel}
            </Button>
          ) : null}
        </div>
      </div>

      <section className={card}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-[11px] text-ink-muted">{e.employee}</div>
            <Link
              href={ROUTES.hr.employee(handover.employee.id)}
              className="font-semibold text-ink hover:underline"
            >
              {name}
            </Link>
            <div className="text-[11px] text-ink-muted">
              {[
                handover.employee.number,
                isAr
                  ? handover.employee.job_title_ar
                  : handover.employee.job_title_en,
              ]
                .filter(Boolean)
                .join(" · ")}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-ink-muted">
              {handover.kind === "exit" ? e.lastDay : e.leaveStart}
            </div>
            <div className="font-semibold text-ink">
              {formatDate(handover.effective_date, locale)}
            </div>
          </div>
          {handover.return_date ? (
            <div>
              <div className="text-[11px] text-ink-muted">{e.returnDate}</div>
              <div className="font-semibold text-ink">
                {formatDate(handover.return_date, locale)}
              </div>
            </div>
          ) : null}
          <div>
            <div className="text-[11px] text-ink-muted">{e.openedBy}</div>
            <div className="font-semibold text-ink">
              {handover.created_by || "—"}
            </div>
          </div>
          {handover.reason ? (
            <div className="col-span-2 md:col-span-4">
              <div className="text-[11px] text-ink-muted">{e.reason}</div>
              <div className="text-ink">{handover.reason}</div>
            </div>
          ) : null}
        </div>
        {handover.decision_notes && handover.status === "open" ? (
          <p className="rounded-2xl bg-rose-500/10 px-4 py-3 text-xs text-rose-700 dark:text-rose-300">
            {formatMessage(e.returnedWithNote, { note: handover.decision_notes })}
          </p>
        ) : null}
      </section>

      {/* ---- open cases */}
      <section className={card}>
        {heading(
          <Briefcase className="h-4 w-4 text-accent" />,
          e.casesTitle,
          editable ? (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                run(
                  () => refreshHandoverCasesAction(handover.id),
                  e.casesRefreshed,
                )
              }
              className="inline-flex items-center gap-1 text-xs font-semibold text-accent"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {e.refresh}
            </button>
          ) : null,
        )}
        <p className="text-[11px] text-ink-muted">{e.casesHint}</p>

        {editable && pending.length ? (
          <div className="rounded-2xl border border-outline-variant bg-surface-sunken/40 p-4 space-y-3">
            <div className="text-xs font-semibold text-ink">{e.modeTitle}</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {MODES.map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={mode === m}
                  onClick={() => setMode(m)}
                  className={`rounded-2xl border p-3 text-start ${mode === m ? "border-accent bg-accent/10" : "border-outline-variant hover:border-ink/25"}`}
                >
                  <div className="text-sm font-semibold text-ink">
                    {e.modes[m]}
                  </div>
                  <div className="text-[11px] text-ink-muted mt-0.5">
                    {e.modeHints[m]}
                  </div>
                </button>
              ))}
            </div>
            {mode === "delegate" ? (
              <Select
                aria-label={e.delegate}
                value={delegate}
                onChange={(ev) => setDelegate(ev.target.value)}
              >
                <option value="">{e.select}</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Select>
            ) : null}
            {mode === "spread" ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto">
                {users.map((u) => (
                  <label
                    key={u.id}
                    className="flex items-center gap-2 text-xs text-ink"
                  >
                    <input
                      type="checkbox"
                      checked={team.includes(u.id)}
                      onChange={(ev) =>
                        setTeam((prev) =>
                          ev.target.checked
                            ? [...prev, u.id]
                            : prev.filter((id) => id !== u.id),
                        )
                      }
                    />
                    {u.name}
                  </label>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {handover.cases.length ? (
          <ul className="divide-y divide-outline-variant rounded-2xl border border-outline-variant">
            {handover.cases.map((c) => (
              <li
                key={c.id}
                className="grid grid-cols-1 sm:grid-cols-12 gap-2 px-4 py-3 items-center"
              >
                <div className="sm:col-span-6 min-w-0">
                  <span className="me-2 inline-flex rounded-full bg-ink/5 px-2 py-0.5 text-[10px] font-semibold text-ink-muted">
                    {e.caseTypes[c.type as keyof typeof e.caseTypes]}
                  </span>
                  <Link
                    href={caseHref(c)}
                    className="text-sm text-ink hover:underline break-words"
                  >
                    {caseLabel(c)}
                  </Link>
                </div>
                <div className="sm:col-span-6 text-xs">
                  {c.status === "pending" && editable && mode === "manual" ? (
                    <Select
                      aria-label={e.assignTo}
                      value={choices[c.id] ?? ""}
                      onChange={(ev) => {
                        const v = ev.target.value;
                        setChoices((prev) => ({ ...prev, [c.id]: v }));
                      }}
                    >
                      <option value="">{e.assignTo}</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </Select>
                  ) : c.status === "reassigned" ? (
                    <span className="text-emerald-700 dark:text-emerald-300">
                      {formatMessage(e.caseMovedTo, { name: c.to ?? "—" })}
                    </span>
                  ) : (
                    <span
                      className={
                        c.status === "pending"
                          ? "text-amber-700 dark:text-amber-300"
                          : "text-ink-muted"
                      }
                    >
                      {e.caseStatuses[c.status as keyof typeof e.caseStatuses]}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-ink-muted">{e.noCases}</p>
        )}

        {editable && pending.length ? (
          <div className="flex justify-end">
            <Button
              size="sm"
              className="gap-1.5"
              disabled={
                busy ||
                (mode === "delegate" && !delegate) ||
                (mode === "spread" && !team.length) ||
                (mode === "manual" && !Object.values(choices).some(Boolean))
              }
              onClick={reassign}
            >
              <Users className="h-4 w-4" />
              {mode === "manual"
                ? e.reassignChosen
                : formatMessage(e.reassignAll, { n: String(pending.length) })}
            </Button>
          </div>
        ) : null}
      </section>

      {/* ---- company assets */}
      <section className={card}>
        {heading(<Laptop className="h-4 w-4 text-accent" />, e.assetsTitle)}
        <p className="text-[11px] text-ink-muted">
          {handover.kind === "exit" ? e.assetsExitHint : e.assetsLeaveHint}
        </p>
        {held.length ? (
          <ul className="divide-y divide-outline-variant rounded-2xl border border-outline-variant">
            {held.map((asset) => (
              <li
                key={asset.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
              >
                <Link
                  href={ROUTES.assets.detail(asset.id)}
                  className="text-sm text-ink hover:underline"
                >
                  <span className="font-mono text-xs text-ink-muted me-2">
                    {asset.asset_tag}
                  </span>
                  {asset.name}
                </Link>
                {canReturnAssets &&
                  handover.status === "open" &&
                  returning?.id !== asset.id ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setReturning(asset)}
                  >
                    {e.returnAsset}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
            {e.noAssets}
          </p>
        )}
        {returning ? (
          <HandoverForm
            asset={returning}
            kind="return"
            employees={[]}
            offboardingId={handover.id}
            onCancel={() => setReturning(null)}
            onDone={() => setReturning(null)}
          />
        ) : null}
        {handover.returns.length ? (
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-ink">
              {e.returnsTitle}
            </div>
            {handover.returns.map((r) => (
              <Link
                key={r.id}
                href={ROUTES.assets.handover(r.id)}
                className="flex items-center justify-between gap-2 rounded-xl border border-outline-variant px-3 py-2 text-xs hover:bg-ink/[0.03]"
              >
                <span className="text-ink">
                  <span className="font-mono text-ink-muted me-2">
                    <bdi dir="ltr">{r.reference}</bdi>
                  </span>
                  {r.asset}
                </span>
                <span className="text-ink-muted">
                  {
                    t.assets.handoverStatuses[
                    r.status as keyof typeof t.assets.handoverStatuses
                    ]
                  }
                </span>
              </Link>
            ))}
          </div>
        ) : null}
      </section>

      {/* ---- HR checklist */}
      <section className={card}>
        {heading(
          <ClipboardCheck className="h-4 w-4 text-accent" />,
          e.checklistTitle,
        )}
        <ul className="divide-y divide-outline-variant rounded-2xl border border-outline-variant">
          {handover.checklist.map((item) => (
            <li
              key={item.key}
              className="grid grid-cols-1 sm:grid-cols-12 gap-2 px-4 py-3 items-center"
            >
              <div className="sm:col-span-5 flex items-center gap-2 text-sm text-ink">
                {item.done ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                ) : item.notApplicable ? (
                  <MinusCircle className="h-5 w-5 shrink-0 text-ink-muted" />
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-ink-muted" />
                )}
                <div>
                  <div>
                    {e.checklist[item.key as keyof typeof e.checklist] ??
                      item.key}
                  </div>
                  {item.by ? (
                    <div className="text-[10px] text-ink-muted">
                      {formatMessage(e.checkedBy, { name: item.by, date: item.at ? formatDate(item.at, locale) : "" })}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="sm:col-span-4">
                <Input
                  aria-label={e.note}
                  placeholder={e.note}
                  value={notes[item.key] ?? ""}
                  disabled={!editable}
                  onChange={(ev) => {
                    const v = ev.target.value;
                    setNotes((prev) => ({ ...prev, [item.key]: v }));
                  }}
                />
              </div>
              {editable ? (
                <div className="sm:col-span-3 flex justify-end gap-1.5">
                  <Button
                    size="sm"
                    variant={item.done ? "primary" : "outline"}
                    disabled={busy}
                    onClick={() =>
                      run(
                        () =>
                          updateHandoverChecklistAction(handover.id, item.key, {
                            done: !item.done,
                            not_applicable: false,
                            note: notes[item.key] || undefined,
                          }),
                        e.saved,
                      )
                    }
                  >
                    {item.done ? e.undo : e.done}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      run(
                        () =>
                          updateHandoverChecklistAction(handover.id, item.key, {
                            done: false,
                            not_applicable: !item.notApplicable,
                            note: notes[item.key] || undefined,
                          }),
                        e.saved,
                      )
                    }
                  >
                    {item.notApplicable ? e.undo : e.notApplicable}
                  </Button>
                </div>
              ) : (
                <div className="sm:col-span-3 text-end text-[11px] text-ink-muted">
                  {item.notApplicable ? e.notApplicable : null}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* ---- submit and approval */}
      <section className={card}>
        {heading(<Send className="h-4 w-4 text-accent" />, e.approvalTitle)}
        {handover.status === "open" ? (
          ready ? (
            <p className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              {e.ready}
            </p>
          ) : (
            <ul className="space-y-1 text-xs text-amber-700 dark:text-amber-300">
              {b.assetsHeld ? (
                <li className="flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {formatMessage(e.blockers.assets, { n: String(b.assetsHeld) })}
                </li>
              ) : null}
              {b.returnsInProgress ? (
                <li className="flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {formatMessage(e.blockers.returns, { n: String(b.returnsInProgress) })}
                </li>
              ) : null}
              {b.casesPending ? (
                <li className="flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {formatMessage(e.blockers.cases, { n: String(b.casesPending) })}
                </li>
              ) : null}
              {b.checklistOpen ? (
                <li className="flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {formatMessage(e.blockers.checklist, { n: String(b.checklistOpen) })}
                </li>
              ) : null}
            </ul>
          )
        ) : null}
        {handover.approval?.decisions.length ? (
          <ul className="space-y-1.5">
            {handover.approval.decisions.map((d, i) => (
              <li key={i} className="flex items-start gap-2 text-xs">
                {d.decision === "approved" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0 text-rose-600" />
                )}
                <span className="text-ink">
                  {formatMessage((d.decision === "approved"
                    ? e.approvedBy
                    : e.rejectedBy
                  ), { name: d.name })}
                  <span className="text-ink-muted">
                    {" "}
                    · {formatDate(d.at, locale)}
                  </span>
                  {d.note ? (
                    <span className="block text-ink-muted">{d.note}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        {handover.status === "pending_approval" ? (
          <p className="text-[11px] text-ink-muted">{e.waiting}</p>
        ) : null}
        {handover.status === "completed" ? (
          <p className="text-xs text-emerald-700 dark:text-emerald-300">
            {handover.kind === "exit" ? e.completedExit : e.completedLeave}
          </p>
        ) : null}
        {editable ? (
          <div className="flex justify-end">
            <Button
              size="sm"
              className="gap-1.5"
              disabled={busy || !ready}
              onClick={() =>
                run(
                  () => submitEmployeeHandoverAction(handover.id),
                  e.submitted,
                )
              }
            >
              <Send className="h-4 w-4" />
              {e.submit}
            </Button>
          </div>
        ) : null}
        {approvalId ? (
          <ApprovalDecisionPanel
            approvalId={approvalId}
            requiresSignature={signatureRequired}
          />
        ) : null}
      </section>
    </div>
  );
}
