"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import {
  requestSalaryDocumentAction,
  reviewSalaryDocumentAction,
  emailSalaryDocumentAction,
  whatsappSalaryDocumentAction,
} from "../../app/actions/salary-documents";
export interface SalaryDocumentItem {
  id: string;
  kind: string;
  status: string;
  months: string[];
  createdAt: string;
  reviewNotes: string | null;
  employeeName?: string;
}
export function SalaryDocumentsView({
  employeeId,
  documents,
  canManage = false,
}: {
  employeeId?: string;
  documents: SalaryDocumentItem[];
  canManage?: boolean;
}) {
  const { t, locale } = useAdminLocale();
  const h = t.hrExtensions;
  const router = useRouter();
  const [kind, setKind] = useState<"payslip" | "salary_certificate">("payslip");
  const [months, setMonths] = useState<string[]>([""]);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState("");
  async function run(work: () => Promise<unknown>) {
    setBusy(true);
    try {
      await work();
      toast.success(h.saved);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : h.failed);
    } finally {
      setBusy(false);
    }
  }
  const pdfUrl = (id: string) => `/api/hr/documents/${id}/pdf?locale=${locale}`;
  async function share(id: string) {
    const response = await fetch(pdfUrl(id));
    if (!response.ok) throw new Error(h.failed);
    const file = new File([await response.blob()], `Salary-${id}.pdf`, {
      type: "application/pdf",
    });
    if (navigator.canShare?.({ files: [file] }))
      await navigator.share({ files: [file], title: h.salaryDocuments });
    else {
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      toast.info(h.shareUnavailable);
    }
  }
  return (
    <section className="space-y-4 rounded-lg border border-slate-200 dark:border-white/10 p-5">
      <h2 className="text-lg font-semibold">{h.salaryDocuments}</h2>
      {employeeId && (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() =>
              requestSalaryDocumentAction({
                employeeId,
                kind,
                months: kind === "payslip" ? months : [],
              }),
            );
          }}
        >
          <select
            aria-label={h.salaryDocuments}
            className="rounded border bg-transparent p-2"
            value={kind}
            onChange={(e) => setKind(e.target.value as typeof kind)}
          >
            <option value="payslip">{h.payslip}</option>
            <option value="salary_certificate">{h.salary_certificate}</option>
          </select>
          {kind === "payslip" && (
            <fieldset>
              <legend>{h.months}</legend>
              <div className="flex flex-wrap gap-2">
                {months.map((month, index) => (
                  <label key={index}>
                    <input
                      aria-label={h.period}
                      required
                      type="month"
                      className="rounded border bg-transparent p-2"
                      value={month}
                      onChange={(e) =>
                        setMonths(
                          months.map((value, i) =>
                            i === index ? e.target.value : value,
                          ),
                        )
                      }
                    />
                    {months.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setMonths(months.filter((_, i) => i !== index))
                        }
                      >
                        {h.remove}
                      </button>
                    )}
                  </label>
                ))}
              </div>
              <button
                type="button"
                disabled={months.length >= 24}
                onClick={() => setMonths([...months, ""])}
              >
                {h.addMonth}
              </button>
            </fieldset>
          )}
          <button
            disabled={busy}
            className="rounded bg-emerald-800 px-4 py-2 text-white"
          >
            {busy ? h.working : h.request}
          </button>
        </form>
      )}
      {canManage && (
        <label className="block">
          {h.reviewNotes}
          <input
            className="ms-3 rounded border bg-transparent p-2"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
      )}
      {!documents.length && <p>{h.empty}</p>}
      {documents.map((item) => (
        <article key={item.id} className="space-y-2 border-t pt-4">
          <div className="flex flex-wrap justify-between gap-3">
            <strong>
              {item.kind === "payslip" ? h.payslip : h.salary_certificate}{" "}
              {item.employeeName}
            </strong>
            <span>
              {h[item.status as "pending" | "issued" | "rejected"] ||
                item.status}
            </span>
          </div>
          <p dir="ltr" className="text-sm">
            {item.months.join(", ")} ·{" "}
            {new Date(item.createdAt).toLocaleDateString(locale)}
          </p>
          {item.reviewNotes && <p>{item.reviewNotes}</p>}
          <div className="flex flex-wrap gap-4 text-sm">
            {item.status === "pending" && canManage && (
              <>
                <button
                  disabled={busy}
                  onClick={() =>
                    run(() =>
                      reviewSalaryDocumentAction(item.id, "issued", notes),
                    )
                  }
                >
                  {h.issue}
                </button>
                <button
                  disabled={busy}
                  onClick={() =>
                    run(() =>
                      reviewSalaryDocumentAction(item.id, "rejected", notes),
                    )
                  }
                >
                  {h.reject}
                </button>
              </>
            )}
            {item.status === "issued" && (
              <>
                <a href={pdfUrl(item.id)} target="_blank" rel="noreferrer">
                  {h.pdf}
                </a>
                <a href={`${pdfUrl(item.id)}&download=true`}>{h.download}</a>
                <button
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      const result = await emailSalaryDocumentAction(
                        item.id,
                        locale,
                      );
                      if (result.status === "failed") throw new Error(h.emailFailed);
                      toast.info(
                        result.status === "accepted" ? h.saved : h.emailQueued,
                      );
                    })
                  }
                >
                  {h.email}
                </button>
                <button
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      const result = await whatsappSalaryDocumentAction(
                        item.id,
                        locale,
                      );
                      if (result.fallback) await share(item.id);
                    })
                  }
                >
                  {h.whatsapp}
                </button>
              </>
            )}
          </div>
        </article>
      ))}
    </section>
  );
}
