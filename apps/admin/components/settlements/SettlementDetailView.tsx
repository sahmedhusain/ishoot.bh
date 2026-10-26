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
  Check,
  CircleX,
  PenLine,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import {
  Button,
  Input,
  Select,
  formatCurrencyValue,
  formatDate,
} from "@platform/ui";
import type { FinalSettlementDetail } from "@platform/database";
import {
  SETTLEMENT_LINE_CATEGORIES,
  SETTLEMENT_PAYMENT_METHODS,
  SETTLEMENT_REASONS,
} from "@platform/database/constants/settlements";
import { ROUTES } from "../../constants/routes";
import {
  cancelFinalSettlementAction,
  payFinalSettlementAction,
  recalculateFinalSettlementAction,
  setFinalSettlementLinesAction,
  signFinalSettlementAction,
  submitFinalSettlementAction,
} from "../../app/actions/final-settlements";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { ApprovalDecisionPanel } from "../approvals/ApprovalDecisionPanel";
import { BilingualPdfActions } from "../shared/BilingualPdfActions";
import { ContentImage } from "../shared/ContentImage";
import { SignatureCanvas } from "../shared/SignatureCanvas";
import { SETTLEMENT_STATUS_STYLE } from "./SettlementsListView";

type ManualLine = {
  kind: "addition" | "deduction";
  category: string;
  label_en: string;
  label_ar: string;
  amount: string;
  note: string;
};

/** One settlement: what is owed each way, its approval, the employee's acknowledgement and the payment. */
export function SettlementDetailView({
  settlement: s,
  canEdit,
  canPay,
  approvalId,
  signatureRequired,
}: {
  settlement: FinalSettlementDetail;
  canEdit: boolean;
  canPay: boolean;
  approvalId: string | null;
  signatureRequired: boolean;
}) {
  const confirmAction = useConfirmation();
  const { t, locale } = useAdminLocale();
  const f = t.settlements;
  const router = useRouter();
  const isAr = locale === "ar";
  const money = (v: number) => formatCurrencyValue(v, s.currency, isAr);
  const editable = canEdit && ["draft", "rejected"].includes(s.status);
  const [busy, setBusy] = React.useState(false);
  const [recalc, setRecalc] = React.useState({
    last_working_day: s.lastWorkingDay,
    reason: s.reason,
  });
  const [manual, setManual] = React.useState<ManualLine[] | null>(null);
  const [signing, setSigning] = React.useState(false);
  const [signature, setSignature] = React.useState<string | null>(null);
  const [signer, setSigner] = React.useState(
    isAr ? s.employee.nameAr : s.employee.nameEn,
  );
  const [payment, setPayment] = React.useState({
    method: "bank_transfer",
    reference: "",
    paid_on: new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 10),
  });
  const calc = s.calculation as {
    warnings?: string[];
    unpaidMonths?: string[];
    category?: string;
    gosiRegistered?: boolean;
    firstOfMonthRule?: boolean;
  };
  const warnings = calc.warnings ?? [];

  const run = async (work: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await work();
      toast.success(done);
      router.refresh();
      return true;
    } catch (error) {
      toast.error(errorMessage(error, t, f.failed));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const warningText = (w: string) => {
    const [code, value] = w.split(":");
    return formatMessage(((f.warnings as Record<string, string>)[code] ?? code), { value: value ?? "" });
  };

  const lineDetail = (l: FinalSettlementDetail["lines"][number]) => {
    const d = l.details ?? {};
    if (l.category === "leave_encashment" || l.category === "leave_advance")
      return formatMessage(f.detailLeave, { accrued: String(d.accrued), carried: String(d.carriedOver), taken: String(d.taken), rate: money(Number(d.dailyRate)) });
    if (l.category === "indemnity")
      return formatMessage(f.detailIndemnity, { years: String(d.years), months: String(d.months ?? "") });
    if (l.category === "commission")
      return formatMessage(f.detailCommission, { basis: money(Number(d.basis)), rate: String(d.ratePercent) });
    if (typeof d.note === "string") return d.note;
    return null;
  };

  const section = (kind: "addition" | "deduction") => {
    const rows = s.lines.filter((l) => l.kind === kind);
    const total = kind === "addition" ? s.totalAdditions : s.totalDeductions;
    return (
      <div className="overflow-hidden rounded-2xl border border-ink/10">
        <div
          className={`flex items-center justify-between px-4 py-2 text-xs font-bold text-white ${kind === "addition" ? "bg-primary" : "bg-rose-700"}`}
        >
          <span>
            {kind === "addition" ? f.owedToEmployee : f.owedByEmployee}
          </span>
          <span>{f.amount}</span>
        </div>
        {rows.length === 0 ? (
          <p className="px-4 py-3 text-xs text-ink-muted">{f.none}</p>
        ) : (
          <ul className="divide-y divide-ink/5">
            {rows.map((l) => (
              <li
                key={l.id}
                className="flex items-start justify-between gap-3 px-4 py-2.5 text-sm"
              >
                <div className="min-w-0">
                  <div className="text-ink">
                    {isAr ? l.labelAr : l.labelEn}
                    {l.source === "manual" ? (
                      <span className="ms-2 rounded-full bg-ink/5 px-2 py-0.5 text-[10px] text-ink-muted">
                        {f.manual}
                      </span>
                    ) : null}
                  </div>
                  {lineDetail(l) ? (
                    <div className="text-[11px] text-ink-muted">
                      {lineDetail(l)}
                    </div>
                  ) : null}
                </div>
                <span className="shrink-0 tabular-nums text-ink">
                  {money(l.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center justify-between border-t border-ink/10 bg-ink/[0.03] px-4 py-2 text-sm font-bold text-ink">
          <span>
            {kind === "addition" ? f.totalAdditions : f.totalDeductions}
          </span>
          <span className="tabular-nums">{money(total)}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Link
            href={ROUTES.hr.settlements()}
            aria-label={t.actions.back}
            className="rounded-full border border-ink/15 p-2 text-ink-muted hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-ink sm:text-2xl">
              {formatMessage(f.titleFor, { name: isAr ? s.employee.nameAr : s.employee.nameEn })}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
              <bdi dir="ltr" className="font-mono">
                {s.reference}
              </bdi>
              <span
                className={`rounded-full px-2 py-0.5 font-semibold ${SETTLEMENT_STATUS_STYLE[s.status]}`}
              >
                {f.statuses[s.status as keyof typeof f.statuses]}
              </span>
              <span>
                {f.reasons[s.reason as keyof typeof f.reasons]} ·{" "}
                {formatMessage(f.lastDay, { date: formatDate(s.lastWorkingDay, locale) })}
              </span>
            </p>
          </div>
        </div>
        <BilingualPdfActions
          pdfUrl={(language, download) =>
            `/api/hr/settlements/${s.id}/pdf?locale=${language}${download ? "&download=true" : ""}`
          }
        />
      </div>

      {warnings.length ? (
        <section className="space-y-1 rounded-3xl border border-amber-400/40 bg-amber-500/5 p-4">
          <h2 className="flex items-center gap-2 text-sm font-bold text-amber-800 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            {f.checkBeforePaying}
          </h2>
          <ul className="list-disc space-y-0.5 ps-6 text-xs text-amber-900 dark:text-amber-200">
            {warnings.map((w) => (
              <li key={w}>{warningText(w)}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {section("addition")}
          {section("deduction")}
          <div
            className={`flex items-center justify-between rounded-2xl px-5 py-4 text-white ${s.netAmount < 0 ? "bg-rose-700" : "bg-primary"}`}
          >
            <span className="text-sm font-bold">
              {s.netAmount < 0 ? f.netOwedByEmployee : f.netPayable}
            </span>
            <span className="text-xl font-bold tabular-nums">
              {money(Math.abs(s.netAmount))}
            </span>
          </div>
          {s.employerContributions > 0 ? (
            <p className="text-[11px] text-ink-muted">
              {formatMessage(f.employerContributions, { amount: money(s.employerContributions) })}
            </p>
          ) : null}
        </div>

        <aside className="space-y-4">
          <section className="space-y-2 rounded-3xl border border-ink/10 bg-white p-5 text-xs dark:bg-surface-raised">
            <h2 className="text-sm font-bold text-ink">{f.basedOn}</h2>
            <dl className="space-y-1.5">
              {[
                [
                  f.fields.employee,
                  `${isAr ? s.employee.nameAr : s.employee.nameEn} (${s.employee.number})`,
                ],
                [
                  f.fields.jobTitle,
                  isAr ? s.employee.jobTitleAr : s.employee.jobTitleEn,
                ],
                [f.fields.hireDate, formatDate(s.employee.hireDate, locale)],
                [
                  f.fields.category,
                  calc.category
                    ? t.gosi.categories[
                        calc.category as keyof typeof t.gosi.categories
                      ]
                    : "—",
                ],
                [f.fields.months, (calc.unpaidMonths ?? []).join(", ") || "—"],
                [
                  f.fields.gosi,
                  calc.gosiRegistered
                    ? calc.firstOfMonthRule
                      ? f.gosiScheme
                      : f.gosiSchemeNoRule
                    : f.gosiManual,
                ],
                [
                  f.fields.calculated,
                  s.calculatedAt
                    ? formatDate(s.calculatedAt, locale, "time")
                    : "—",
                ],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-ink-muted">{k}</dt>
                  <dd className="text-end text-ink">{v}</dd>
                </div>
              ))}
            </dl>
            {s.notes ? (
              <p className="rounded-xl bg-ink/[0.03] p-2 text-ink">{s.notes}</p>
            ) : null}
          </section>

          {s.approval?.decisions.length ? (
            <section className="space-y-2 rounded-3xl border border-ink/10 bg-white p-5 dark:bg-surface-raised">
              <h2 className="text-sm font-bold text-ink">
                {t.approvals.item.progress}
              </h2>
              {s.approval.decisions.map((d, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded-2xl border border-ink/10 p-2.5 text-xs"
                >
                  {d.decision === "approved" ? (
                    <Check
                      className="mt-0.5 h-4 w-4 text-emerald-600"
                      aria-hidden
                    />
                  ) : (
                    <CircleX
                      className="mt-0.5 h-4 w-4 text-rose-500"
                      aria-hidden
                    />
                  )}
                  <div className="min-w-0">
                    <div className="font-semibold text-ink">
                      {isAr ? d.nameAr : d.nameEn}
                    </div>
                    <div className="text-ink-muted">
                      {formatDate(d.at, locale, "time")}
                    </div>
                    {d.signature ? (
                      <ContentImage
                        src={d.signature}
                        alt=""
                        width={160}
                        height={50}
                        className="mt-1 max-h-10 w-auto"
                      />
                    ) : null}
                  </div>
                </div>
              ))}
            </section>
          ) : null}
        </aside>
      </div>

      {editable && (
        <section className="space-y-4 rounded-3xl border border-ink/10 bg-white p-5 dark:bg-surface-raised">
          <h2 className="text-sm font-bold text-ink">{f.adjust}</h2>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs">
              <span className="mb-1 block font-semibold text-ink">
                {f.fields.lastWorkingDay}
              </span>
              <Input
                type="date"
                value={recalc.last_working_day}
                onChange={(e) =>
                  setRecalc({ ...recalc, last_working_day: e.target.value })
                }
              />
            </label>
            <label className="text-xs">
              <span className="mb-1 block font-semibold text-ink">
                {f.fields.reason}
              </span>
              <Select
                value={recalc.reason}
                onChange={(e) =>
                  setRecalc({ ...recalc, reason: e.target.value })
                }
              >
                {SETTLEMENT_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {f.reasons[r]}
                  </option>
                ))}
              </Select>
            </label>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={busy}
              onClick={() =>
                run(
                  () => recalculateFinalSettlementAction(s.id, recalc),
                  f.recalculated,
                )
              }
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              {f.recalculate}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() =>
                setManual(
                  s.lines
                    .filter((l) => l.source === "manual")
                    .map((l) => ({
                      kind: l.kind,
                      category: l.category,
                      label_en: l.labelEn,
                      label_ar: l.labelAr,
                      amount: String(l.amount),
                      note: String(l.details?.note ?? ""),
                    })),
                )
              }
            >
              <Plus className="h-4 w-4" aria-hidden />
              {f.manualLines}
            </Button>
          </div>
          {manual && (
            <form
              className="space-y-2 rounded-2xl border border-accent/30 bg-accent/5 p-3"
              onSubmit={async (e) => {
                e.preventDefault();
                const ok = await run(
                  () =>
                    setFinalSettlementLinesAction(
                      s.id,
                      manual.map((m) => ({
                        kind: m.kind,
                        category: m.category,
                        label_en: m.label_en,
                        label_ar: m.label_ar || m.label_en,
                        amount: Number(m.amount),
                        note: m.note || null,
                      })),
                    ),
                  f.saved,
                );
                if (ok) setManual(null);
              }}
            >
              <p className="text-[11px] text-ink-muted">{f.manualHint}</p>
              {manual.map((m, i) => {
                const set = (patch: Partial<ManualLine>) =>
                  setManual(
                    manual.map((x, j) => (j === i ? { ...x, ...patch } : x)),
                  );
                return (
                  <div
                    key={i}
                    className="grid grid-cols-2 gap-2 sm:grid-cols-6"
                  >
                    <Select
                      aria-label={f.fields.kind}
                      value={m.kind}
                      onChange={(e) =>
                        set({
                          kind: e.target.value as ManualLine["kind"],
                          category:
                            SETTLEMENT_LINE_CATEGORIES[
                              e.target.value as ManualLine["kind"]
                            ][0],
                        })
                      }
                    >
                      <option value="addition">{f.addition}</option>
                      <option value="deduction">{f.deduction}</option>
                    </Select>
                    <Select
                      aria-label={f.fields.category}
                      value={m.category}
                      onChange={(e) => set({ category: e.target.value })}
                    >
                      {SETTLEMENT_LINE_CATEGORIES[m.kind].map((c) => (
                        <option key={c} value={c}>
                          {(f.categories as Record<string, string>)[c]}
                        </option>
                      ))}
                    </Select>
                    <Input
                      aria-label={f.fields.labelEn}
                      required
                      placeholder={f.fields.labelEn}
                      value={m.label_en}
                      onChange={(e) => set({ label_en: e.target.value })}
                    />
                    <Input
                      aria-label={f.fields.labelAr}
                      placeholder={f.fields.labelAr}
                      value={m.label_ar}
                      onChange={(e) => set({ label_ar: e.target.value })}
                    />
                    <Input
                      aria-label={f.amount}
                      required
                      type="number"
                      dir="ltr"
                      min={0.001}
                      step="0.001"
                      value={m.amount}
                      onChange={(e) => set({ amount: e.target.value })}
                    />
                    <div className="flex gap-1">
                      <Input
                        aria-label={f.fields.notes}
                        placeholder={f.fields.notes}
                        value={m.note}
                        onChange={(e) => set({ note: e.target.value })}
                      />
                      <button
                        type="button"
                        aria-label={f.remove}
                        onClick={() =>
                          setManual(manual.filter((_, j) => j !== i))
                        }
                        className="px-1 text-ink-muted hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
              <div className="flex flex-wrap justify-between gap-2">
                <button
                  type="button"
                  className="text-xs font-semibold text-accent hover:underline"
                  onClick={() =>
                    setManual([
                      ...manual,
                      {
                        kind: "deduction",
                        category: "notice_shortfall",
                        label_en: "",
                        label_ar: "",
                        amount: "",
                        note: "",
                      },
                    ])
                  }
                >
                  {f.addLine}
                </button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setManual(null)}
                  >
                    {t.actions.cancel}
                  </Button>
                  <Button type="submit" size="sm" disabled={busy}>
                    {f.saveLines}
                  </Button>
                </div>
              </div>
            </form>
          )}
          <div className="flex flex-wrap justify-between gap-2 border-t border-ink/10 pt-3">
            <button
              type="button"
              disabled={busy}
              className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:underline"
              onClick={() =>
                confirmAction({ description: f.cancelConfirm, onConfirm: () => run(() => cancelFinalSettlementAction(s.id), f.cancelled) })
              }
            >
              <X className="h-3.5 w-3.5" aria-hidden />
              {f.cancel}
            </button>
            <Button
              size="sm"
              className="gap-1.5"
              disabled={busy}
              onClick={() =>
                run(() => submitFinalSettlementAction(s.id), f.submitted)
              }
            >
              <Send className="h-4 w-4" aria-hidden />
              {f.submit}
            </Button>
          </div>
        </section>
      )}

      {approvalId ? (
        <ApprovalDecisionPanel
          approvalId={approvalId}
          requiresSignature={signatureRequired}
        />
      ) : null}

      {["approved", "paid"].includes(s.status) && (
        <section className="space-y-3 rounded-3xl border border-ink/10 bg-white p-5 dark:bg-surface-raised">
          <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
            <PenLine className="h-4 w-4 text-accent" aria-hidden />
            {f.acknowledgement}
          </h2>
          {s.employeeSignedAt ? (
            <div className="flex items-center gap-3 text-xs">
              {s.employeeSignature ? (
                <ContentImage
                  src={s.employeeSignature}
                  alt=""
                  width={180}
                  height={60}
                  className="max-h-14 w-auto rounded-lg border border-ink/10 bg-white"
                />
              ) : null}
              <div>
                <div className="font-semibold text-ink">
                  {s.employeeSignerName}
                </div>
                <div className="text-ink-muted">
                  {formatDate(s.employeeSignedAt, locale, "time")}
                </div>
              </div>
            </div>
          ) : canEdit ? (
            signing ? (
              <div className="space-y-2">
                <p className="text-xs text-ink-muted">{f.acknowledgeText}</p>
                <Input
                  value={signer}
                  onChange={(e) => setSigner(e.target.value)}
                  placeholder={f.signerName}
                />
                <SignatureCanvas
                  onChange={setSignature}
                  clearLabel={t.signaturePad.clear}
                  hint={t.signaturePad.hint}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSigning(false)}
                  >
                    {t.actions.cancel}
                  </Button>
                  <Button
                    size="sm"
                    disabled={busy || !signature || !signer.trim()}
                    onClick={async () => {
                      const ok = await run(
                        () =>
                          signFinalSettlementAction(s.id, {
                            signature: signature!,
                            signer_name: signer,
                          }),
                        f.signed,
                      );
                      if (ok) setSigning(false);
                    }}
                  >
                    {f.sign}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSigning(true)}
              >
                {f.collectSignature}
              </Button>
            )
          ) : (
            <p className="text-xs text-ink-muted">{f.notSignedYet}</p>
          )}
        </section>
      )}

      {s.status === "approved" && canPay && (
        <form
          className="space-y-3 rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            confirmAction({ description: f.payConfirm, onConfirm: () => run(
                () =>
                  payFinalSettlementAction(s.id, {
                    method: payment.method,
                    reference: payment.reference || null,
                    paid_on: payment.paid_on,
                  }),
                f.paidToast,
              ) });
          }}
        >
          <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
            <Wallet className="h-4 w-4 text-emerald-600" aria-hidden />
            {f.recordPayment}
          </h2>
          <p className="text-[11px] text-ink-muted">{f.payHint}</p>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs">
              <span className="mb-1 block font-semibold text-ink">
                {f.fields.method}
              </span>
              <Select
                value={payment.method}
                onChange={(e) =>
                  setPayment({ ...payment, method: e.target.value })
                }
              >
                {SETTLEMENT_PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {(f.methods as Record<string, string>)[m]}
                  </option>
                ))}
              </Select>
            </label>
            <label className="text-xs">
              <span className="mb-1 block font-semibold text-ink">
                {f.fields.reference}
              </span>
              <Input
                value={payment.reference}
                onChange={(e) =>
                  setPayment({ ...payment, reference: e.target.value })
                }
              />
            </label>
            <label className="text-xs">
              <span className="mb-1 block font-semibold text-ink">
                {f.fields.paidOn}
              </span>
              <Input
                type="date"
                value={payment.paid_on}
                onChange={(e) =>
                  setPayment({ ...payment, paid_on: e.target.value })
                }
              />
            </label>
            <Button type="submit" size="sm" disabled={busy}>
              {f.markPaid}
            </Button>
          </div>
        </form>
      )}
      {s.status === "paid" ? (
        <p className="text-xs text-emerald-700 dark:text-emerald-300">
          {formatMessage(f.paidOn, { date: formatDate(s.paidAt!, locale), name: s.paidBy ?? "" })}
        </p>
      ) : null}
    </div>
  );
}
