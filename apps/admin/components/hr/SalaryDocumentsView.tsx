"use client";
import { formatMessage } from "@platform/locales";
import { errorMessage } from "../../lib/error-text";
import { useState, useId } from "react";
import { ModalFooter } from "@platform/ui";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { ROUTES } from "../../constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { usePermissions } from "../../hooks/usePermissions";
import { NoEmployeeProfile } from "./NoEmployeeProfile";
import {
  Award,
  Check,
  Download,
  Eye,
  FileText,
  Mail,
  MessageCircle,
  Printer,
  Receipt,
  Send,
} from "lucide-react";
import { printPdfUrl, salaryDocumentPdfUrl } from "../../lib/pdf-print";
import {
  requestSalaryDocumentAction,
  emailSalaryDocumentAction,
  whatsappSalaryDocumentAction,
} from "../../app/actions/salary-documents";
import { PageHeader } from "../layout/PageHeader";
export interface SalaryDocumentItem {
  id: string;
  kind: string;
  status: string;
  months: string[];
  createdAt: string;
  reviewNotes: string | null;
  employeeName?: string;
  employeeNameAr?: string;
  languages: string[];
  shareable?: boolean;
}
const LANGUAGE_CHOICES = {
  ar: ["ar"],
  en: ["en"],
  both: ["ar", "en"],
} as const;
export function SalaryDocumentsView({
  employeeId,
  documents,
  availableMonths = [],
  decidableIds = [],
  showNoProfile = false,
  embedded = false,
}: {
  employeeId?: string;
  documents: SalaryDocumentItem[];
  availableMonths?: string[];
  decidableIds?: string[];
  showNoProfile?: boolean;
  embedded?: boolean;
}) {
  const modalFormId = useId();
  const { t, locale } = useAdminLocale();
  const { can } = usePermissions();
  const canRequest =
    can("self_service", "create") || can("payroll", "issue_send");
  const h = t.hrExtensions;
  const router = useRouter();
  const [kind, setKind] = useState<"payslip" | "salary_certificate">("payslip");
  const [months, setMonths] = useState<string[]>([]);
  const [languageChoice, setLanguageChoice] = useState<
    keyof typeof LANGUAGE_CHOICES
  >(locale === "en" ? "en" : "ar");
  const toggleMonth = (month: string) =>
    setMonths((current) =>
      current.includes(month)
        ? current.filter((m) => m !== month)
        : [...current, month].slice(0, 24),
    );
  const [busy, setBusy] = useState(false);
  async function run(work: () => Promise<unknown>) {
    setBusy(true);
    try {
      await work();
      toast.success(h.saved);
      router.refresh();
    } catch (e) {
      toast.error(errorMessage(e, t, h.failed));
    } finally {
      setBusy(false);
    }
  }
  const pdfUrl = (id: string, language: string) =>
    salaryDocumentPdfUrl(id, language);
  async function share(id: string, language: string) {
    const response = await fetch(pdfUrl(id, language));
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
  const statusChip: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    issued: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    rejected: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  };
  const monthsByYear = availableMonths.reduce<Record<string, string[]>>(
    (groups, month) => {
      (groups[month.slice(0, 4)] ??= []).push(month);
      return groups;
    },
    {},
  );
  const monthName = (month: string) =>
    new Intl.DateTimeFormat(locale === "ar" ? "ar-u-nu-latn" : "en-GB", {
      month: "short",
      timeZone: "UTC",
    }).format(new Date(`${month}-01T00:00:00Z`));
  const action =
    "inline-flex items-center gap-1.5 h-9 rounded-full border border-outline-variant px-3.5 text-xs font-semibold text-ink hover:bg-ink/5 disabled:opacity-50 transition-colors";
  const requestDisabled = busy || (kind === "payslip" && months.length === 0);

  return (
    <div
      className={embedded ? "space-y-6" : "max-w-5xl mx-auto space-y-6 pb-16"}
    >
      {!embedded && (
        <header className="flex items-start gap-4">
          <span
            className="w-12 h-12 shrink-0 rounded-2xl bg-accent/10 text-accent flex items-center justify-center"
            aria-hidden
          >
            <FileText className="w-6 h-6" />
          </span>
          <PageHeader />
        </header>
      )}

      {showNoProfile && !employeeId && <NoEmployeeProfile />}

      {employeeId && canRequest && (
        <section
          aria-labelledby="salary-request"
          className="rounded-3xl border border-outline-variant bg-surface-raised p-5 sm:p-6 shadow-xs space-y-5"
         data-page-section>
          <h2 id="salary-request" className="text-base font-bold text-ink">
            {h.requestTitle}
          </h2>
          <form id={modalFormId}
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              void run(() =>
                requestSalaryDocumentAction({
                  employeeId,
                  kind,
                  months: kind === "payslip" ? months : [],
                  languages: [...LANGUAGE_CHOICES[languageChoice]],
                }),
              );
            }}
          >
            <div
              role="radiogroup"
              aria-label={h.documentType}
              className="inline-flex flex-wrap gap-1 p-1 rounded-full bg-surface-sunken border border-outline-variant"
            >
              {(["payslip", "salary_certificate"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={kind === option}
                  onClick={() => setKind(option)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-colors ${kind === option ? "bg-accent text-accent-foreground shadow-sm" : "text-ink-muted hover:text-ink hover:bg-ink/5"}`}
                >
                  {option === "payslip" ? (
                    <Receipt className="w-3.5 h-3.5" aria-hidden />
                  ) : (
                    <Award className="w-3.5 h-3.5" aria-hidden />
                  )}
                  {option === "payslip" ? h.payslip : h.salary_certificate}
                </button>
              ))}
            </div>

            <fieldset className="space-y-2">
              <legend className="text-xs font-semibold text-ink">
                {h.documentLanguage}
              </legend>
              <div
                role="radiogroup"
                aria-label={h.documentLanguage}
                className="inline-flex flex-wrap gap-1 p-1 rounded-full bg-surface-sunken border border-outline-variant"
              >
                {(
                  Object.keys(LANGUAGE_CHOICES) as Array<
                    keyof typeof LANGUAGE_CHOICES
                  >
                ).map((option) => (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={languageChoice === option}
                    onClick={() => setLanguageChoice(option)}
                    className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors ${languageChoice === option ? "bg-accent text-accent-foreground shadow-sm" : "text-ink-muted hover:text-ink hover:bg-ink/5"}`}
                  >
                    {t.salaryDocumentLanguages.choices[option]}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-ink-muted">
                {h.documentLanguageHint}
              </p>
            </fieldset>

            {kind === "payslip" && (
              <fieldset className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <legend className="text-sm font-semibold text-ink">
                    {formatMessage(h.months, { max: 24 })}
                  </legend>
                  {months.length > 0 && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="rounded-full bg-accent/10 text-accent px-2.5 py-1 font-semibold">
                        {formatMessage(h.monthsSelected, { n: String(months.length) })}
                      </span>
                      <button
                        type="button"
                        onClick={() => setMonths([])}
                        className="text-ink-muted hover:text-ink underline-offset-2 hover:underline"
                      >
                        {h.clearMonths}
                      </button>
                    </div>
                  )}
                </div>
                {availableMonths.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-outline-variant px-4 py-5 text-center text-xs text-ink-muted">
                    {t.hrSelfService.noAvailableMonths}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(monthsByYear)
                      .sort(([a], [b]) => b.localeCompare(a))
                      .map(([year, list]) => (
                        <div
                          key={year}
                          className="flex flex-wrap items-center gap-2"
                        >
                          <span className="w-12 text-xs font-bold text-ink-muted tabular-nums">
                            {year}
                          </span>
                          {list.map((month) => {
                            const selected = months.includes(month);
                            return (
                              <label
                                key={month}
                                className={`cursor-pointer inline-flex items-center gap-1.5 h-9 rounded-full border px-3.5 text-xs font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/40 ${selected ? "border-accent bg-accent/10 text-accent" : "border-outline-variant text-ink hover:bg-ink/5"}`}
                              >
                                <input
                                  type="checkbox"
                                  className="sr-only"
                                  checked={selected}
                                  onChange={() => toggleMonth(month)}
                                />
                                {selected && (
                                  <Check className="w-3.5 h-3.5" aria-hidden />
                                )}
                                {monthName(month)}
                              </label>
                            );
                          })}
                        </div>
                      ))}
                  </div>
                )}
              </fieldset>
            )}

            <ModalFooter><button type="submit" form={modalFormId}
              disabled={requestDisabled}
              className="inline-flex items-center gap-2 h-11 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-40 disabled:shadow-none transition-colors"
            >
              <Send className="w-4 h-4 rtl:-scale-x-100" aria-hidden />
              {busy ? h.working : h.request}
            </button></ModalFooter>
          </form>
        </section>
      )}

      <section
        aria-labelledby="salary-history"
        className="rounded-3xl border border-outline-variant bg-surface-raised p-5 sm:p-6 shadow-xs space-y-4"
       data-page-section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="salary-history" className="text-base font-bold text-ink">
            {h.historyTitle}
          </h2>
        </div>

        {!documents.length && (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-outline-variant px-6 py-10 text-center">
            <FileText className="w-8 h-8 text-ink-muted" aria-hidden />
            <p className="text-sm font-semibold text-ink">{h.empty}</p>
            <p className="text-xs text-ink-muted">{h.emptyHint}</p>
          </div>
        )}

        <ul className="space-y-3">
          {documents.map((item) => (
            <li
              key={item.id}
              className="rounded-2xl border border-outline-variant p-4 space-y-3 hover:border-outline-variant transition-colors"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <span
                    className="w-10 h-10 shrink-0 rounded-xl bg-ink/5 text-accent flex items-center justify-center"
                    aria-hidden
                  >
                    {item.kind === "payslip" ? (
                      <Receipt className="w-5 h-5" />
                    ) : (
                      <Award className="w-5 h-5" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-ink truncate">
                      {item.kind === "payslip"
                        ? h.payslip
                        : h.salary_certificate}
                      {item.employeeName && (
                        <span className="font-medium text-ink-muted">
                          {" "}
                          ·{" "}
                          {(locale === "ar" && item.employeeNameAr) ||
                            item.employeeName}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-ink-muted mt-0.5">
                      {item.months.length > 0 && (
                        <span dir="ltr">{item.months.join(", ")} · </span>
                      )}
                      {new Date(item.createdAt).toLocaleDateString(
                        locale === "ar" ? "ar-u-nu-latn" : "en-GB",
                      )}
                      {" · "}
                      {item.languages
                        .map(
                          (language) =>
                            t.salaryDocumentLanguages.names[
                            language as "ar" | "en"
                            ],
                        )
                        .join(t.salaryDocumentLanguages.separator)}
                    </div>
                  </div>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold ${statusChip[item.status] ?? "bg-ink/5 text-ink-muted"}`}
                >
                  {h[item.status as "pending" | "issued" | "rejected"] ||
                    item.status}
                </span>
              </div>
              {item.reviewNotes && (
                <p className="rounded-xl bg-surface-sunken/60 px-3 py-2 text-xs text-ink">
                  {item.reviewNotes}
                </p>
              )}
              {((item.status === "pending" && decidableIds.includes(item.id)) ||
                item.status === "issued") && (
                  <div className="flex flex-wrap gap-2">
                    {item.status === "pending" &&
                      decidableIds.includes(item.id) && (
                        <Link
                          href={ROUTES.approvalItem("salary_document", item.id)}
                          className="inline-flex items-center gap-1.5 h-9 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                        >
                          <Check className="w-3.5 h-3.5" aria-hidden />{" "}
                          {t.approvals.reviewAndDecide}
                        </Link>
                      )}
                    {item.status === "issued" && (
                      <div className="w-full space-y-2">
                        {item.languages.map((language) => (
                          <div
                            key={language}
                            className="flex flex-wrap items-center gap-2"
                          >
                            {item.languages.length > 1 && (
                              <span className="w-16 shrink-0 text-[11px] font-bold text-ink-muted">
                                {
                                  t.salaryDocumentLanguages.names[
                                  language as "ar" | "en"
                                  ]
                                }
                              </span>
                            )}
                            <a
                              className={action}
                              href={pdfUrl(item.id, language)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <Eye className="w-3.5 h-3.5" aria-hidden /> {h.pdf}
                            </a>
                            <a
                              className={action}
                              href={salaryDocumentPdfUrl(item.id, language, true)}
                            >
                              <Download className="w-3.5 h-3.5" aria-hidden />{" "}
                              {h.download}
                            </a>
                            <button
                              disabled={busy}
                              className={action}
                              onClick={() =>
                                printPdfUrl(pdfUrl(item.id, language)).catch(() =>
                                  toast.error(t.pdfActions.failed),
                                )
                              }
                            >
                              <Printer className="w-3.5 h-3.5" aria-hidden />{" "}
                              {t.pdfActions.print}
                            </button>
                            {item.shareable && (
                              <>
                                <button
                                  disabled={busy}
                                  className={action}
                                  onClick={() =>
                                    run(async () => {
                                      const result =
                                        await emailSalaryDocumentAction(
                                          item.id,
                                          language as "ar" | "en",
                                        );
                                      if (result.status === "failed")
                                        throw new Error(h.emailFailed);
                                      toast.info(
                                        result.status === "accepted"
                                          ? h.saved
                                          : h.emailQueued,
                                      );
                                    })
                                  }
                                >
                                  <Mail className="w-3.5 h-3.5" aria-hidden />{" "}
                                  {h.email}
                                </button>
                                <button
                                  disabled={busy}
                                  className={action}
                                  onClick={() =>
                                    run(async () => {
                                      const result =
                                        await whatsappSalaryDocumentAction(
                                          item.id,
                                          language as "ar" | "en",
                                        );
                                      if (result.fallback)
                                        await share(item.id, language);
                                    })
                                  }
                                >
                                  <MessageCircle
                                    className="w-3.5 h-3.5"
                                    aria-hidden
                                  />{" "}
                                  {h.whatsapp}
                                </button>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
