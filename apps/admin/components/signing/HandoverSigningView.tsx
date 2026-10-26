"use client";
import { formatMessage } from "@platform/locales";
/* eslint-disable @next/next/no-img-element -- brand artwork is served as-is on this public page. */

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CheckSquare,
  Download,
  Eye,
  Languages,
  Square,
} from "lucide-react";
import { SignatureCanvas } from "../shared/SignatureCanvas";

type Translations = ReturnType<
  typeof import("@platform/locales").getTranslations
>["admin"];
type State =
  "open" | "signed" | "expired" | "revoked" | "unavailable" | "invalid";

interface HandoverSummary {
  reference: string;
  kind: "issue" | "return";
  date: string;
  condition: string;
  employeeName: string;
  assetName: string;
  category: string;
  serial: string | null;
  checklist: Array<{ label: string; ok: boolean; note: string | null }>;
  accessories: string | null;
  damage: string | null;
  issuedBy: string;
}

/** The employee reads the handover on their own device, then signs it. Western digits in both languages. */
export function HandoverSigningView({
  token,
  language,
  labels: s,
  assetLabels: a,
  state: initialState,
  company,
  handover,
  signedAt: initialSignedAt,
}: {
  token: string;
  language: "ar" | "en";
  labels: Translations["handoverSigning"];
  assetLabels: Translations["assets"];
  state: State;
  company: {
    name: string;
    email: string;
    phone: string;
    logoUrl: string | null;
    iconUrl: string | null;
  };
  handover: HandoverSummary | null;
  signedAt: string | null;
}) {
  const isAr = language === "ar";
  const [state, setState] = React.useState<State>(initialState);
  const [signedAt, setSignedAt] = React.useState(initialSignedAt);
  const [name, setName] = React.useState(handover?.employeeName ?? "");
  const [agree, setAgree] = React.useState(false);
  const [signature, setSignature] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const date = (v: string) =>
    new Intl.DateTimeFormat(isAr ? "ar-BH-u-nu-latn" : "en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Bahrain",
    }).format(new Date(v.length === 10 ? `${v}T00:00:00Z` : v));
  const pdf = (lang: "ar" | "en", download = false) =>
    `/api/acknowledge/${encodeURIComponent(token)}/pdf?locale=${lang}${download ? "&download=true" : ""}`;
  const other = isAr ? "en" : "ar";

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (name.trim().length < 2) return setError(s.errors.name);
    if (!signature) return setError(s.errors.signature);
    if (!agree) return setError(s.errors.terms);
    setBusy(true);
    try {
      const response = await fetch(
        `/api/acknowledge/${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            signerName: name.trim(),
            signatureData: signature,
            acknowledged: true,
          }),
        },
      );
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        signedAt?: string;
        error?: keyof typeof s.errors;
      };
      if (!response.ok || !data.ok) {
        if (data.error === "invalid") setState("invalid");
        setError(s.errors[data.error ?? "failed"] ?? s.errors.failed);
        return;
      }
      setSignedAt(data.signedAt ?? new Date().toISOString());
      setState("signed");
    } catch {
      setError(s.errors.failed);
    } finally {
      setBusy(false);
    }
  };

  const pdfLinks = (
    <div className="flex flex-wrap gap-2">
      {(["ar", "en"] as const).map((lang) => (
        <span
          key={lang}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-1.5 py-1"
        >
          <span className="px-1.5 text-[11px] font-bold text-slate-500">
            {s.languages[lang]}
          </span>
          <a
            href={pdf(lang)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-primary hover:bg-slate-100"
          >
            <Eye className="h-3.5 w-3.5" aria-hidden />
            {s.view}
          </a>
          <a
            href={pdf(lang, true)}
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-primary hover:bg-slate-100"
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            {s.download}
          </a>
        </span>
      ))}
    </div>
  );

  return (
    <main
      dir={isAr ? "rtl" : "ltr"}
      lang={language}
      className="min-h-screen bg-brand-base px-4 py-8 text-slate-800"
    >
      <div className="mx-auto max-w-2xl space-y-5">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {company.iconUrl || company.logoUrl ? (
              <img
                src={company.iconUrl || company.logoUrl || ""}
                alt=""
                className="h-11 w-11 rounded-xl bg-white object-contain p-1.5 shadow-sm"
              />
            ) : null}
            <div>
              <p className="text-xs text-slate-500">{s.eyebrow}</p>
              <h1 className="text-base font-bold text-primary">
                {company.name}
              </h1>
            </div>
          </div>
          <a
            href={`?lang=${other}`}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
          >
            <Languages className="h-3.5 w-3.5" aria-hidden />
            {s.languages[other]}
          </a>
        </header>

        {state === "signed" ? (
          <section className="space-y-3 rounded-3xl bg-white p-8 text-center shadow-sm">
            <CheckCircle2
              className="mx-auto h-12 w-12 text-emerald-600"
              aria-hidden
            />
            <h2 className="text-lg font-bold">{s.signedTitle}</h2>
            <p className="text-sm text-slate-500">
              {formatMessage(s.signedBody, { date: signedAt ? date(signedAt) : "" })}
            </p>
            {handover ? (
              <div className="flex justify-center pt-2">{pdfLinks}</div>
            ) : null}
          </section>
        ) : state !== "open" || !handover ? (
          <section className="space-y-2 rounded-3xl bg-white p-8 text-center shadow-sm">
            <AlertTriangle
              className="mx-auto h-10 w-10 text-amber-500"
              aria-hidden
            />
            <h2 className="text-base font-bold">
              {s.states[state === "open" ? "invalid" : state]}
            </h2>
            <p className="text-sm text-slate-500">
              {formatMessage(s.contact, { company: company.name, email: company.email, phone: company.phone })}
            </p>
          </section>
        ) : (
          <>
            <section className="space-y-4 rounded-3xl bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {handover.kind === "issue"
                      ? a.handover.issueDocTitle
                      : a.handover.returnDocTitle}
                  </h2>
                  <p
                    className="mt-1 font-mono text-xs text-slate-500"
                    dir="ltr"
                  >
                    {handover.reference}
                  </p>
                </div>
                {pdfLinks}
              </div>
              <dl className="grid grid-cols-1 gap-3 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
                {[
                  [a.handover.employee, handover.employeeName],
                  [a.handover.date, date(handover.date)],
                  [a.fields.name, handover.assetName],
                  [a.fields.category, handover.category],
                  [a.fields.serial, handover.serial],
                  [
                    a.handover.condition,
                    a.conditions[
                    handover.condition as keyof typeof a.conditions
                    ] ?? handover.condition,
                  ],
                  [a.handover.issuedBy, handover.issuedBy],
                ]
                  .filter(([, v]) => v)
                  .map(([label, value]) => (
                    <div key={label as string}>
                      <dt className="text-xs text-slate-500">{label}</dt>
                      <dd className="font-semibold">{value}</dd>
                    </div>
                  ))}
              </dl>
              {handover.checklist.length ? (
                <div>
                  <h3 className="mb-2 text-sm font-bold">
                    {a.handover.checklist}
                  </h3>
                  <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
                    {handover.checklist.map((c, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 px-3 py-2 text-sm"
                      >
                        {c.ok ? (
                          <CheckSquare
                            className="mt-0.5 h-4 w-4 shrink-0 text-accent"
                            aria-label={a.handover.ticked}
                          />
                        ) : (
                          <Square
                            className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
                            aria-label={a.handover.notTicked}
                          />
                        )}
                        <span>
                          {c.label}
                          {c.note ? (
                            <span className="block text-xs text-slate-500">
                              {c.note}
                            </span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {handover.accessories ? (
                <p className="text-sm">
                  <span className="text-slate-500">
                    {a.handover.accessories}:{" "}
                  </span>
                  {handover.accessories}
                </p>
              ) : null}
              {handover.damage ? (
                <p className="text-sm">
                  <span className="text-slate-500">{a.handover.damage}: </span>
                  {handover.damage}
                </p>
              ) : null}
              <p className="rounded-2xl bg-amber-50 p-3 text-sm leading-relaxed text-amber-900">
                {handover.kind === "issue"
                  ? a.handover.acknowledgeIssue
                  : a.handover.acknowledgeReturn}
              </p>
            </section>

            <form
              onSubmit={submit}
              className="space-y-4 rounded-3xl bg-white p-6 shadow-sm"
            >
              <h3 className="text-base font-bold">{s.signTitle}</h3>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold text-slate-600">
                  {s.fullName}
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={120}
                  className="h-11 w-full rounded-xl border border-slate-300 px-3"
                />
              </label>
              <div>
                <span className="mb-1 block text-xs font-semibold text-slate-600">
                  {s.signature}
                </span>
                <SignatureCanvas
                  onChange={setSignature}
                  clearLabel={s.clear}
                  hint={s.drawHint}
                />
              </div>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  className="mt-1"
                />
                <span>{s.confirm}</span>
              </label>
              {error ? (
                <p className="text-sm font-medium text-rose-600">{error}</p>
              ) : null}
              <button
                type="submit"
                disabled={busy}
                className="flex h-12 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold text-white disabled:opacity-60"
              >
                {busy ? s.signing : s.signButton}
              </button>
              <p className="text-center text-[11px] text-slate-400">
                {s.legal}
              </p>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
