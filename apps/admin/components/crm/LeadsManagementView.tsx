"use client";
import { ROUTES } from "../../constants/routes";
import {EntityLookup} from "../shared/EntityLookup";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Inquiry } from "@ishoot/database/types";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import {
  updateInquiryStatusAction,
  convertInquiryToClientAction,
  manageInquiryAction,
  linkInquiryCustomerAction,
} from "../../app/actions/crm";

export function LeadsManagementView({
  initialInquiries,
  page = 1,
}: {
  initialInquiries: Inquiry[];
  page?: number;
}) {
  const { t, locale } = useAdminLocale();
  const ar = locale === "ar";
  const router = useRouter();
  const [filter, setFilter] = React.useState("all");
  const [busy, setBusy] = React.useState("");
  const [error, setError] = React.useState("");
  const [customerLinks,setCustomerLinks] = React.useState<Record<string,string>>({});
  const [notes, setNotes] = React.useState<Record<string, string>>({});
  const intents: Record<string, string> = ar
    ? {
        all: "كل الطلبات",
        inquiry: "استفسار",
        quote_request: "طلب عرض سعر",
        complaint: "شكوى",
        suggestion: "اقتراح",
      }
    : {
        all: "All requests",
        inquiry: "Inquiry",
        quote_request: "Quote request",
        complaint: "Complaint",
        suggestion: "Suggestion",
      };
  const statuses: Record<string, string> = ar
    ? {
        new: "جديد",
        contacted: "تم التواصل",
        qualified: "مؤهل",
        in_progress: "قيد المعالجة",
        waiting: "بانتظار العميل",
        resolved: "تم الحل",
        archived: "مؤرشف",
      }
    : {
        new: "New",
        contacted: "Contacted",
        qualified: "Qualified",
        in_progress: "In progress",
        waiting: "Waiting for customer",
        resolved: "Resolved",
        archived: "Archived",
      };
  async function run(id: string, action: () => Promise<unknown>) {
    setBusy(id);
    setError("");
    try {
      await action();
      router.refresh();
    } catch {
      setError(
        t.leadsManagement.couldNotSaveTheChange,
      );
    } finally {
      setBusy("");
    }
  }
  const field =
    "rounded-lg border border-slate-300 dark:border-neutral-600 bg-transparent px-3 py-2 text-sm";
  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      <header className="flex flex-wrap justify-between items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {t.leadsManagement.requestsAndFeedback}
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            {t.leadsManagement.assignFollowUpAndResolve}
          </p>
        </div>
        <Link
          className="text-emerald-700 dark:text-emerald-400 underline"
          href={ROUTES.cms.reviews}
        >
          {t.leadsManagement.reviewModeration}
        </Link>
      </header>
      {error && (
        <p role="alert" className="p-4 bg-red-50 text-red-800 rounded-lg">
          {error}
        </p>
      )}
      <div
        className="flex flex-wrap gap-2"
        aria-label={t.leadsManagement.filterThisPage}
      >
        {Object.entries(intents).map(([value, label]) => (
          <button
            key={value}
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
            className={`${field} ${filter === value ? "bg-emerald-900 text-white" : ""}`}
          >
            {label}
          </button>
        ))}
      </div>
      {initialInquiries
        .filter((i) => filter === "all" || i.intent === filter)
        .map((inquiry) => {
          const sales = ["inquiry", "quote_request"].includes(
            inquiry.intent || "inquiry",
          );
          return (
            <article
              key={inquiry.id}
              className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-5 space-y-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">
                    {intents[inquiry.intent || "inquiry"]} · {inquiry.reference}
                  </p>
                  <h2 className="font-bold text-lg mt-1">
                    {inquiry.full_name}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {inquiry.company} ·{" "}
                    {new Date(inquiry.created_at).toLocaleString(
                      ar ? "ar-BH" : "en-GB",
                    )}
                  </p>
                </div>
                <label className="text-xs">
                  {t.leadsManagement.status}
                  <select
                    aria-label={t.leadsManagement.status}
                    className={`${field} block mt-1`}
                    disabled={busy === inquiry.id}
                    value={inquiry.status}
                    onChange={(e) =>
                      run(inquiry.id, () =>
                        updateInquiryStatusAction(
                          inquiry.id,
                          e.target.value as Inquiry["status"],
                        ),
                      )
                    }
                  >
                    {Object.entries(statuses)
                      .filter(
                        ([s]) =>
                          sales || !["contacted", "qualified"].includes(s),
                      )
                      .map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                {inquiry.email && (
                  <a className="underline" href={`mailto:${inquiry.email}`}>
                    {inquiry.email}
                  </a>
                )}
                {inquiry.phone && (
                  <a
                    dir="ltr"
                    className="underline"
                    href={`tel:${inquiry.phone}`}
                  >
                    {inquiry.phone}
                  </a>
                )}
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed break-words">
                {inquiry.message}
              </p>
              <dl className="grid sm:grid-cols-2 gap-3 text-sm text-slate-600 dark:text-neutral-300">
                {[
                  [
                    t.leadsManagement.services,
                    inquiry.services_requested.join(", "),
                  ],
                  [t.leadsManagement.budget, inquiry.budget_range],
                  [t.leadsManagement.timeline, inquiry.target_timeline],
                  [t.leadsManagement.location, inquiry.location],
                  [
                    t.leadsManagement.projectReference,
                    inquiry.project_reference,
                  ],
                ]
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-xs text-slate-500">{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
              </dl>
              {sales && inquiry.status !== "qualified" && <details className="text-sm"><summary>{t.leadsManagement.linkCustomer}</summary><EntityLookup domain="contacts" value={customerLinks[inquiry.id]||""} onChange={id=>setCustomerLinks(prev=>({...prev,[inquiry.id]:id}))}/><button disabled={!!busy || !customerLinks[inquiry.id]} onClick={()=>run(inquiry.id,()=>linkInquiryCustomerAction(inquiry.id,customerLinks[inquiry.id]))}>{t.leadsManagement.confirmCustomerLink}</button></details>}
              {inquiry.merge_flag && (
                <p className="text-amber-700 text-sm">
                  {t.leadsManagement.customerIdentityConflictReviewBefore}
                </p>
              )}
              <div className="flex flex-wrap gap-3 items-center border-t border-slate-100 dark:border-neutral-800 pt-4 text-sm">
                <span>
                  {t.leadsManagement.owner}{" "}
                  {inquiry.assigned_to_name || (t.leadsManagement.unassigned)}
                </span>
                <button
                  disabled={!!busy}
                  className={field}
                  onClick={() =>
                    run(inquiry.id, () =>
                      manageInquiryAction(inquiry.id, { claim: true }),
                    )
                  }
                >
                  {t.leadsManagement.assignToMe}
                </button>
                <select
                  className={field}
                  aria-label={t.leadsManagement.priority}
                  value={inquiry.priority || "normal"}
                  disabled={!!busy}
                  onChange={(e) =>
                    run(inquiry.id, () =>
                      manageInquiryAction(inquiry.id, {
                        priority: e.target.value,
                      }),
                    )
                  }
                >
                  {["normal", "high", "urgent"].map((value, index) => (
                    <option key={value} value={value}>
                      {ar ? ["عادية", "مرتفعة", "عاجلة"][index] : value}
                    </option>
                  ))}
                </select>
                {sales &&
                  inquiry.status !== "qualified" &&
                  !inquiry.merge_flag && (
                    <button
                      disabled={!!busy}
                      className={`${field} text-emerald-700 dark:text-emerald-400`}
                      onClick={() =>
                        run(inquiry.id, () =>
                          convertInquiryToClientAction(inquiry.id),
                        )
                      }
                    >
                      {t.leadsManagement.convertToOpportunity}
                    </button>
                  )}
              </div>
              <p className="text-xs text-slate-500">
                {t.leadsManagement.emailConfirmation}{" "}
                {inquiry.confirmation_status} ·{" "}
                {t.leadsManagement.teamNotification}{" "}
                {inquiry.notification_status}
              </p>
              <details>
                <summary className="cursor-pointer text-sm font-semibold">
                  {t.leadsManagement.internalNotes} (
                  {inquiry.notes?.length || 0})
                </summary>
                <div className="mt-3 space-y-3">
                  {inquiry.notes?.map((note) => (
                    <div
                      key={note.id}
                      className="border-s-2 border-emerald-600 ps-3"
                    >
                      <p className="text-sm whitespace-pre-wrap">{note.body}</p>
                      <p className="text-xs text-slate-500">
                        {note.author} ·{" "}
                        {new Date(note.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                  <form
                    className="flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      run(inquiry.id, async () => {
                        await manageInquiryAction(inquiry.id, {
                          note: notes[inquiry.id],
                        });
                        setNotes((n) => ({ ...n, [inquiry.id]: "" }));
                      });
                    }}
                  >
                    <textarea
                      required
                      maxLength={5000}
                      aria-label={t.leadsManagement.internalNote}
                      className={`${field} flex-1 min-w-0`}
                      value={notes[inquiry.id] || ""}
                      onChange={(e) =>
                        setNotes((n) => ({
                          ...n,
                          [inquiry.id]: e.target.value,
                        }))
                      }
                    />
                    <button disabled={!!busy} className={field}>
                      {t.leadsManagement.addNote}
                    </button>
                  </form>
                </div>
              </details>
            </article>
          );
        })}
      {!initialInquiries.some(
        (i) => filter === "all" || i.intent === filter,
      ) && (
        <p className="py-12 text-center text-slate-500">
          {t.leadsManagement.noMatchingRequestsOnThis}
        </p>
      )}
      <nav className="flex gap-4 text-sm">
        {page > 1 && (
          <Link href={`?page=${page - 1}`}>{t.leadsManagement.previous}</Link>
        )}
        <span>
          {t.leadsManagement.page} {page}
        </span>
        {initialInquiries.length === 50 && (
          <Link href={`?page=${page + 1}`}>{t.leadsManagement.next}</Link>
        )}
      </nav>
    </div>
  );
}
