"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Download, FileUp, Loader2, Upload } from "lucide-react";
import { Button, Card } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import type { PeopleImportCheck, PeopleImportRow } from "@platform/database";
import type { ContentLanguage } from "@platform/database/constants/languages";
import { importPeopleAction, previewPeopleImportAction } from "../../app/actions/people-import";
import { ROUTES } from "../../constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { csvLine, parseCsv } from "../../lib/csv";
import { errorMessage } from "../../lib/error-text";

// Same order as PEOPLE_IMPORT_COLUMNS in @platform/database (kept here so the client bundle stays database-free).
const COLUMNS = ["first_name_en", "last_name_en", "first_name_ar", "last_name_ar", "job_title_en", "job_title_ar", "department_code", "hire_date", "basic_salary", "email", "phone", "account_role", "manager_email"] as const;
const LIMIT = 2000;

/** HR → Employees → Import: upload a CSV, review every row's problems, then import the rows that are ready. */
export function ImportPeopleView({
  departments,
  roles,
  languages,
  canCreateAccounts,
}: {
  departments: { code: string; nameEn: string; nameAr: string }[];
  roles: { id: string; nameEn: string; nameAr: string }[];
  languages: readonly ContentLanguage[];
  canCreateAccounts: boolean;
}) {
  const { t, locale } = useAdminLocale();
  const copy = t.peopleImport;
  const [fileName, setFileName] = React.useState("");
  const [rows, setRows] = React.useState<PeopleImportRow[]>([]);
  const [checks, setChecks] = React.useState<PeopleImportCheck[] | null>(null);
  const [busy, setBusy] = React.useState<"preview" | "import" | null>(null);
  const [error, setError] = React.useState("");
  const [result, setResult] = React.useState<{ employees: number; accounts: number; skipped: number } | null>(null);
  const ready = checks?.filter((check) => !check.problems.length).length ?? 0;

  const downloadTemplate = () => {
    const example = COLUMNS.map((column) => (copy.example as Record<string, string>)[column] ?? "");
    const blob = new Blob(["﻿" + [csvLine([...COLUMNS]), csvLine(example)].join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = Object.assign(document.createElement("a"), { href: url, download: "people-import-template.csv" });
    link.click();
    URL.revokeObjectURL(url);
  };

  const readFile = async (file: File) => {
    setError("");
    setResult(null);
    setChecks(null);
    setFileName(file.name);
    const table = parseCsv(await file.text());
    const header = (table[0] ?? []).map((cell) => cell.trim().toLowerCase());
    if (!COLUMNS.some((column) => header.includes(column))) {
      setRows([]);
      setError(copy.noColumns);
      return;
    }
    const parsed = table.slice(1, LIMIT + 1).map((cells) => Object.fromEntries(COLUMNS.map((column) => [column, cells[header.indexOf(column)]?.trim() ?? ""])) as PeopleImportRow);
    setRows(parsed);
    if (table.length - 1 > LIMIT) setError(formatMessage(copy.tooMany, { limit: LIMIT }));
    setBusy("preview");
    try {
      setChecks((await previewPeopleImportAction(parsed.map((row) => COLUMNS.map((column) => row[column] ?? "")))).checks);
    } catch (err) {
      setError(errorMessage(err, t));
    } finally {
      setBusy(null);
    }
  };

  const runImport = async () => {
    setBusy("import");
    setError("");
    try {
      const imported = await importPeopleAction(rows.map((row) => COLUMNS.map((column) => row[column] ?? "")));
      setResult(imported);
      setChecks(null);
      setRows([]);
    } catch (err) {
      setError(errorMessage(err, t));
    } finally {
      setBusy(null);
    }
  };

  const name = (row: PeopleImportRow) => {
    const en = `${row.first_name_en ?? ""} ${row.last_name_en ?? ""}`.trim();
    const ar = `${row.first_name_ar ?? ""} ${row.last_name_ar ?? ""}`.trim();
    return (locale === "ar" ? ar || en : en || ar) || "—";
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <FileUp className="w-6 h-6 text-accent" />
            {copy.title}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">{copy.subtitle}</p>
        </div>
        <Button type="button" variant="outline" size="sm" className="gap-1.5 rounded-full" onClick={downloadTemplate}>
          <Download className="w-3.5 h-3.5" />
          {copy.template}
        </Button>
      </div>

      <Card className="p-5 space-y-4">
        <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink/15 p-8 text-center cursor-pointer transition-colors hover:border-accent/50 hover:bg-accent/[0.03]">
          <Upload className="w-6 h-6 text-accent" />
          <span className="text-sm font-semibold text-ink">{fileName || copy.choose}</span>
          <span className="text-xs text-ink-muted">{formatMessage(copy.chooseHint, { limit: LIMIT })}</span>
          <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])} />
        </label>
        <details className="text-xs text-ink-muted">
          <summary className="cursor-pointer font-semibold text-ink">{copy.columnsTitle}</summary>
          <ul className="mt-2 grid sm:grid-cols-2 gap-1">
            {COLUMNS.map((column) => (
              <li key={column}>
                <code dir="ltr" className="text-ink">{column}</code> — {(copy.columns as Record<string, string>)[column]}
              </li>
            ))}
          </ul>
          <p className="mt-2">{languages.length === 1 ? copy.oneLanguage : copy.bothLanguages}</p>
          <p className="mt-1">{formatMessage(copy.departmentCodes, { codes: departments.map((d) => d.code).join(", ") || "—" })}</p>
          {canCreateAccounts && <p className="mt-1">{formatMessage(copy.roleIds, { roles: roles.map((r) => r.id).join(", ") })}</p>}
        </details>
      </Card>

      {error && <p role="alert" className="text-sm rounded-xl px-4 py-3 bg-rose-500/10 text-rose-700 dark:text-rose-300">{error}</p>}

      {busy === "preview" && (
        <p role="status" className="flex items-center gap-2 text-sm text-ink-muted"><Loader2 className="w-4 h-4 animate-spin" />{copy.checking}</p>
      )}

      {result && (
        <Card className="p-5 flex flex-wrap items-center gap-3 animate-in fade-in slide-in-from-bottom-1 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <p role="status" className="text-sm text-ink">{formatMessage(copy.done, result)}</p>
          <Link href={ROUTES.hr.employees} className="ms-auto text-sm font-semibold text-primary dark:text-mint">{copy.viewEmployees}</Link>
        </Card>
      )}

      {checks && (
        <Card className="p-0 overflow-hidden">
          <div className="p-4 flex flex-wrap items-center gap-3 border-b border-ink/10">
            <p className="text-sm text-ink">{formatMessage(copy.summary, { ready, problems: checks.length - ready, total: checks.length })}</p>
            <Button type="button" variant="primary" size="sm" className="ms-auto rounded-full gap-1.5" disabled={!ready || busy !== null} onClick={runImport}>
              {busy === "import" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {formatMessage(copy.importReady, { count: ready })}
            </Button>
          </div>
          <div className="overflow-x-auto max-h-[60vh]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-surface-sunken text-ink-muted">
                <tr>
                  <th className="p-3 text-start">{copy.row}</th>
                  <th className="p-3 text-start">{copy.person}</th>
                  <th className="p-3 text-start">{copy.department}</th>
                  <th className="p-3 text-start">{copy.account}</th>
                  <th className="p-3 text-start">{copy.status}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {checks.map((check) => {
                  const row = rows[check.row - 1] ?? {};
                  return (
                    <tr key={check.row} className={check.problems.length ? "bg-rose-500/[0.04]" : ""}>
                      <td className="p-3 text-ink-muted">{check.row}</td>
                      <td className="p-3">
                        <span className="block font-semibold text-ink">{name(row)}</span>
                        <span className="text-ink-muted">{(locale === "ar" ? row.job_title_ar || row.job_title_en : row.job_title_en || row.job_title_ar) || ""}</span>
                      </td>
                      <td className="p-3" dir="ltr">{row.department_code || "—"}</td>
                      <td className="p-3">{check.account ? <span dir="ltr">{row.email} · {row.account_role}</span> : "—"}</td>
                      <td className="p-3">
                        {check.problems.length ? (
                          <ul className="space-y-0.5 text-rose-700 dark:text-rose-300">
                            {check.problems.map((problem) => (
                              <li key={problem} className="flex items-start gap-1"><AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />{copy.problems[problem]}</li>
                            ))}
                          </ul>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="w-3 h-3" />{copy.ready}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
