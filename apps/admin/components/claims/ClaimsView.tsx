"use client";

import { errorMessage } from "../../lib/error-text";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@platform/ui";
import { CalendarClock, CheckCircle2, HandCoins, Paperclip, Plus, Wallet, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { ExpenseCategory } from "@platform/database/types";
import type { ExpenseClaimListResult, ExpenseClaimRow, ExpenseClaimStatus } from "@platform/database/queries/expense-claims";
import { EXPENSE_PAYMENT_METHODS } from "@platform/database/constants/finance";
import { ROUTES } from "../../constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { cancelExpenseClaimAction, payExpenseClaimAction, scheduleExpenseClaimAction } from "../../app/actions/claims";

const STEPS: ExpenseClaimStatus[] = ["submitted", "approved", "scheduled", "paid"];

const STATUS_STYLE: Record<ExpenseClaimStatus, string> = {
  submitted: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  approved: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  scheduled: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  paid: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  rejected: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  cancelled: "bg-ink/5 text-ink-muted",
};

interface ClaimsViewProps {
  view: "mine" | "finance";
  status: string;
  data: ExpenseClaimListResult;
  canProcess: boolean;
  currentUserId: string;
  categories: ExpenseCategory[];
  highlight?: string;
}

export function ClaimsView({ view, status, data, canProcess, currentUserId, categories, highlight }: ClaimsViewProps) {
  const { t, locale } = useAdminLocale();
  const c = t.claims;
  const router = useRouter();
  const [open, setOpen] = React.useState<string | null>(highlight ?? null);
  const [busy, setBusy] = React.useState<string | null>(null);

  const run = async (id: string, fn: () => Promise<unknown>, done: string) => {
    setBusy(id);
    try {
      await fn();
      toast.success(done);
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err, t, c.actionFailed));
    } finally {
      setBusy(null);
    }
  };

  const href = (next: { view?: string; status?: string }) => {
    const params = new URLSearchParams({ view: next.view ?? view, status: next.status ?? status });
    return `${ROUTES.claims.list()}?${params}`;
  };

  const money = (amount: number, currency: string) =>
    `${currency} ${amount.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink font-display flex items-center gap-2">
            <HandCoins className="w-7 h-7 text-accent" />
            {c.title}
          </h1>
          <p className="text-xs text-ink-muted mt-1">{c.subtitle}</p>
        </div>
        <Link href={ROUTES.claims.create} className="inline-flex items-center gap-1.5 self-start px-4 py-2 rounded-full bg-accent text-white text-xs font-semibold hover:bg-accent-hover">
          <Plus className="w-4 h-4" />
          {c.newClaim}
        </Link>
      </div>

      {canProcess && (
        <div role="tablist" className="inline-flex p-1 rounded-full bg-surface-sunken border border-ink/10">
          {(["mine", "finance"] as const).map((v) => (
            <Link
              key={v}
              role="tab"
              aria-selected={view === v}
              href={href({ view: v, status: v === "finance" ? "approved" : "all" })}
              className={`px-4 py-2 rounded-full text-xs font-semibold ${view === v ? "bg-accent text-white" : "text-ink-muted hover:text-ink"}`}
            >
              {v === "mine" ? c.tabMine : c.tabFinance}
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(
          [
            ["submitted", c.statAwaiting, data.stats.submitted],
            ["approved", c.statToSchedule, data.stats.approved],
            ["scheduled", c.statScheduled, data.stats.scheduled],
            ["paid", c.statPaidThisMonth, data.stats.paidThisMonth],
          ] as const
        ).map(([key, label, value]) => (
          <Link key={key} href={href({ status: key })} className={`rounded-3xl border p-5 transition-colors ${status === key ? "border-accent bg-accent/5" : "border-ink/10 bg-surface hover:border-ink/25"}`}>
            <div className="text-xs text-ink-muted">{label}</div>
            <div className="text-2xl font-bold text-ink mt-1">{value}</div>
          </Link>
        ))}
      </div>
      {data.stats.outstanding.length > 0 && (
        <p className="text-xs text-ink-muted flex items-center gap-1.5">
          <Wallet className="w-4 h-4 text-accent" />
          {c.outstanding}: {data.stats.outstanding.map((o) => money(o.amount, o.currency)).join(" · ")}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {(["all", "submitted", "approved", "scheduled", "paid", "rejected", "cancelled"] as const).map((s) => (
          <Link key={s} href={href({ status: s })} className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${status === s ? "border-accent text-accent bg-accent/10" : "border-ink/10 text-ink-muted hover:text-ink"}`}>
            {s === "all" ? t.actions.all : c.status[s]}
          </Link>
        ))}
      </div>

      {data.items.length === 0 ? (
        <Card className="p-12 text-center text-sm text-ink-muted rounded-3xl bg-surface border border-ink/10">{c.empty}</Card>
      ) : (
        <div className="space-y-3">
          {data.items.map((claim) => (
            <ClaimCard
              key={claim.id}
              claim={claim}
              expanded={open === claim.id}
              onToggle={() => setOpen(open === claim.id ? null : claim.id)}
              busy={busy === claim.id}
              isOwner={claim.claimantId === currentUserId}
              canProcess={canProcess}
              categories={categories}
              locale={locale}
              money={money}
              onCancel={() => run(claim.id, () => cancelExpenseClaimAction(claim.id), c.cancelled)}
              onSchedule={(payOn) => run(claim.id, () => scheduleExpenseClaimAction(claim.id, payOn || null), c.scheduledToast)}
              onPay={(payment) => run(claim.id, () => payExpenseClaimAction(claim.id, payment), c.paidToast)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ClaimCard({
  claim,
  expanded,
  onToggle,
  busy,
  isOwner,
  canProcess,
  categories,
  locale,
  money,
  onCancel,
  onSchedule,
  onPay,
}: {
  claim: ExpenseClaimRow;
  expanded: boolean;
  onToggle: () => void;
  busy: boolean;
  isOwner: boolean;
  canProcess: boolean;
  categories: ExpenseCategory[];
  locale: string;
  money: (amount: number, currency: string) => string;
  onCancel: () => void;
  onSchedule: (payOn: string) => void;
  onPay: (payment: { method: string; reference: string; categoryId: string | null }) => void;
}) {
  const { t } = useAdminLocale();
  const c = t.claims;
  const [payOn, setPayOn] = React.useState("");
  const [method, setMethod] = React.useState("bank_transfer");
  const [reference, setReference] = React.useState("");
  const [categoryId, setCategoryId] = React.useState(claim.categoryId ?? "");
  const stepIndex = STEPS.indexOf(claim.status);
  const field = "rounded-xl border border-ink/15 bg-surface px-3 py-2 text-xs text-ink";

  return (
    <Card id={claim.id} className={`p-0 rounded-3xl bg-surface border overflow-hidden ${expanded ? "border-accent/40" : "border-ink/10"}`}>
      <button type="button" onClick={onToggle} aria-expanded={expanded} className="w-full text-start p-4 sm:p-5 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-ink-muted">{claim.claimNumber}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_STYLE[claim.status]}`}>{c.status[claim.status]}</span>
          </div>
          <div className="text-sm font-semibold text-ink mt-1 line-clamp-1">{claim.reason}</div>
          <div className="text-[11px] text-ink-muted mt-0.5">
            {claim.claimantName} · {claim.expenseDate}
            {claim.categoryName ? ` · ${locale === "ar" ? claim.categoryName.ar : claim.categoryName.en}` : ""}
          </div>
        </div>
        <div className="text-lg font-bold text-ink whitespace-nowrap">{money(claim.amount, claim.currency)}</div>
      </button>

      {expanded && (
        <div className="border-t border-ink/10 p-4 sm:p-5 space-y-4">
          {stepIndex >= 0 && (
            <ol className="flex items-center gap-2 text-[11px]">
              {STEPS.map((step, i) => (
                <li key={step} className="flex items-center gap-2 flex-1">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${i <= stepIndex ? "bg-accent text-white" : "bg-ink/10 text-ink-muted"}`}>{i + 1}</span>
                  <span className={i <= stepIndex ? "text-ink font-semibold" : "text-ink-muted"}>{c.status[step]}</span>
                  {i < STEPS.length - 1 && <span className={`flex-1 h-px ${i < stepIndex ? "bg-accent" : "bg-ink/10"}`} />}
                </li>
              ))}
            </ol>
          )}

          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {claim.deal && (
              <div>
                <dt className="text-ink-muted">{c.relatedDeal}</dt>
                <dd><Link href={ROUTES.crm.deal(claim.deal.id)} className="text-accent hover:underline">{claim.deal.title}</Link></dd>
              </div>
            )}
            {claim.invoice && (
              <div>
                <dt className="text-ink-muted">{c.relatedInvoice}</dt>
                <dd><Link href={ROUTES.invoices.detail(claim.invoice.id)} className="text-accent hover:underline">{claim.invoice.number}</Link></dd>
              </div>
            )}
            {claim.meeting && (
              <div>
                <dt className="text-ink-muted">{c.relatedMeeting}</dt>
                <dd className="text-ink">{claim.meeting.startDate.slice(0, 10)} · {claim.meeting.title}</dd>
              </div>
            )}
            <div>
              <dt className="text-ink-muted">{c.receipt}</dt>
              <dd>
                <a href={claim.receiptUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
                  <Paperclip className="w-3.5 h-3.5" />
                  {c.viewReceipt}
                </a>
              </dd>
            </div>
            {claim.reviewNotes && (
              <div className="sm:col-span-2">
                <dt className="text-ink-muted">{c.reviewNotes}</dt>
                <dd className="text-ink">{claim.reviewNotes}</dd>
              </div>
            )}
            {claim.scheduledForDate && (
              <div>
                <dt className="text-ink-muted">{c.payOn}</dt>
                <dd className="text-ink">{claim.scheduledForDate}</dd>
              </div>
            )}
            {claim.paidAt && (
              <div>
                <dt className="text-ink-muted">{c.paidOn}</dt>
                <dd className="text-ink">
                  {claim.paidAt.slice(0, 10)} · {claim.paidByName} · {claim.paymentMethod ? t.expenseMeta.methods[claim.paymentMethod as keyof typeof t.expenseMeta.methods] ?? claim.paymentMethod : ""}
                  {claim.paymentReference ? ` · ${claim.paymentReference}` : ""}
                </dd>
              </div>
            )}
          </dl>

          <div className="flex flex-wrap items-end gap-3 pt-2 border-t border-ink/5">
            {claim.status === "submitted" && (
              <Link href={ROUTES.approvals({ scope: isOwner ? "mine" : "awaiting" })} className="text-xs font-semibold text-accent hover:underline">
                {c.openApproval}
              </Link>
            )}
            {isOwner && claim.status === "submitted" && (
              <button type="button" disabled={busy} onClick={onCancel} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-rose-500/30 text-rose-600 text-xs font-semibold hover:bg-rose-500/10">
                <XCircle className="w-3.5 h-3.5" />
                {c.withdraw}
              </button>
            )}
            {canProcess && claim.status === "approved" && (
              <div className="flex flex-wrap items-end gap-2">
                <label className="text-[11px] text-ink-muted space-y-1">
                  <span className="block">{c.payOn}</span>
                  <input type="date" className={field} value={payOn} onChange={(e) => setPayOn(e.target.value)} />
                </label>
                <button type="button" disabled={busy} onClick={() => onSchedule(payOn)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700">
                  <CalendarClock className="w-3.5 h-3.5" />
                  {c.schedule}
                </button>
              </div>
            )}
            {canProcess && (claim.status === "approved" || claim.status === "scheduled") && (
              <div className="flex flex-wrap items-end gap-2">
                <label className="text-[11px] text-ink-muted space-y-1">
                  <span className="block">{c.category}</span>
                  <select className={field} value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
                    <option value="">{c.chooseCategory}</option>
                    {categories.map((cat) => <option key={cat.id} value={cat.id}>{locale === "ar" ? cat.name_ar : cat.name_en}</option>)}
                  </select>
                </label>
                <label className="text-[11px] text-ink-muted space-y-1">
                  <span className="block">{c.paidVia}</span>
                  <select className={field} value={method} onChange={(e) => setMethod(e.target.value)}>
                    {EXPENSE_PAYMENT_METHODS.filter((m) => m !== "staff_reimbursement").map((m) => (
                      <option key={m} value={m}>{t.expenseMeta.methods[m]}</option>
                    ))}
                  </select>
                </label>
                <label className="text-[11px] text-ink-muted space-y-1">
                  <span className="block">{c.reference}</span>
                  <input className={field} value={reference} onChange={(e) => setReference(e.target.value)} placeholder={c.referencePlaceholder} />
                </label>
                <button
                  type="button"
                  disabled={busy || !categoryId}
                  onClick={() => onPay({ method, reference, categoryId: categoryId || null })}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {c.markPaid}
                </button>
              </div>
            )}
            {claim.expenseId && (
              <Link href={ROUTES.expenses.list({ highlight: claim.expenseId })} className="text-xs font-semibold text-accent hover:underline">
                {c.viewExpense}
              </Link>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
