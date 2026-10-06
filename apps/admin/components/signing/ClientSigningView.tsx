"use client";
/* eslint-disable @next/next/no-img-element -- brand artwork is served as-is on this public page. */

import * as React from "react";
import { CheckCircle2, Eraser, FileText, AlertTriangle, Download } from "lucide-react";
import type { ClientSignableDocument } from "@ishoot/database";

type Labels = ReturnType<typeof import("@ishoot/locales").getTranslations>["admin"]["clientSigning"];
type State = "open" | "signed" | "expired" | "revoked" | "unavailable" | "invalid";

const AR_CURRENCY: Record<string, string> = { BHD: "د.ب", KWD: "د.ك", QAR: "ر.ق", SAR: "ر.س", AED: "د.إ", OMR: "ر.ع" };

/** The client's review-and-sign page. Western digits in both languages; layout follows the document language. */
export function ClientSigningView({
  token,
  language,
  labels: s,
  state: initialState,
  company,
  doc,
  terms,
  signedAt: initialSignedAt,
}: {
  token: string;
  language: "ar" | "en";
  labels: Labels;
  state: State;
  company: { name: string; email: string; phone: string; logoUrl: string | null; iconUrl: string | null };
  doc: ClientSignableDocument | null;
  terms: string | null;
  signedAt: string | null;
}) {
  const isAr = language === "ar";
  const [state, setState] = React.useState<State>(initialState);
  const [signedAt, setSignedAt] = React.useState(initialSignedAt);
  const [name, setName] = React.useState("");
  const [position, setPosition] = React.useState("");
  const [agree, setAgree] = React.useState(false);
  const [hasInk, setHasInk] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const canvas = React.useRef<HTMLCanvasElement>(null);
  const drawing = React.useRef(false);

  const decimals = doc?.currency === "BHD" || doc?.currency === "KWD" || doc?.currency === "OMR" ? 3 : 2;
  const amount = (v: number) => v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const money = (v: number) => (isAr ? `${amount(v)} ${AR_CURRENCY[doc?.currency ?? ""] ?? doc?.currency}` : `${doc?.currency} ${amount(v)}`);
  const date = (v: string) => new Intl.DateTimeFormat(isAr ? "ar-BH-u-nu-latn" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Bahrain" }).format(new Date(v));
  const fill = (text: string) => text.replace("{company}", company.name).replace("{email}", company.email).replace("{phone}", company.phone);

  // Signature pad: pointer events cover mouse, pen and touch.
  React.useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ratio = window.devicePixelRatio || 1;
    el.width = el.clientWidth * ratio;
    el.height = el.clientHeight * ratio;
    const ctx = el.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0B2E2B";
  }, [state]);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const ctx = e.currentTarget.getContext("2d")!;
    const p = point(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = e.currentTarget.getContext("2d")!;
    const p = point(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    setHasInk(true);
  };
  const end = () => {
    drawing.current = false;
  };
  const clear = () => {
    const el = canvas.current;
    if (!el) return;
    el.getContext("2d")!.clearRect(0, 0, el.width, el.height);
    setHasInk(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) return setError(s.errors.name);
    if (!hasInk) return setError(s.errors.signature);
    if (!agree) return setError(s.errors.terms);
    setBusy(true);
    try {
      const response = await fetch(`/api/sign/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signerName: name.trim(), signerTitle: position.trim() || null, signatureData: canvas.current!.toDataURL("image/png"), termsAccepted: agree }),
      });
      const result = (await response.json().catch(() => ({}))) as { ok?: boolean; signedAt?: string; error?: keyof Labels["errors"] };
      if (!response.ok || !result.ok) {
        if (result.error === "invalid") setState("unavailable");
        setError(s.errors[result.error ?? "failed"] ?? s.errors.failed);
        return;
      }
      setSignedAt(result.signedAt ?? new Date().toISOString());
      setState("signed");
    } catch {
      setError(s.errors.failed);
    } finally {
      setBusy(false);
    }
  };

  const pdfUrl = `/api/sign/${encodeURIComponent(token)}/pdf`;
  const docWord = doc ? (doc.type === "quotation" ? s.quotation : s.invoice) : "";

  return (
    <div dir={isAr ? "rtl" : "ltr"} lang={language} className="min-h-screen bg-[#F4F8F7] text-slate-800">
      <header className="border-b border-[#014842]/10 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
          {company.iconUrl && <img src={company.iconUrl} alt="" className="h-9 w-9 object-contain" />}
          {company.logoUrl ? <img src={company.logoUrl} alt={company.name} className="h-6 w-auto object-contain" /> : <span className="font-bold text-[#014842]">{company.name}</span>}
          <span className="ms-auto truncate text-sm font-semibold text-[#014842]">{company.name}</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 px-4 py-8">
        {state === "signed" ? (
          <section className="rounded-2xl border border-emerald-600/20 bg-white p-8 text-center shadow-sm">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" aria-hidden />
            <h1 className="mt-4 text-2xl font-bold text-[#014842]">{s.doneTitle}</h1>
            {signedAt && <p className="mt-2 text-slate-600">{s.doneText.replace("{date}", date(signedAt))}</p>}
            {doc && (
              <a href={`${pdfUrl}?download=true`} className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#014842] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#013833]">
                <Download className="h-4 w-4" aria-hidden />
                {s.downloadSigned}
              </a>
            )}
          </section>
        ) : state !== "open" || !doc ? (
          <section className="rounded-2xl border border-amber-600/20 bg-white p-8 text-center shadow-sm">
            <AlertTriangle className="mx-auto h-10 w-10 text-amber-600" aria-hidden />
            <p className="mt-4 text-lg font-semibold text-slate-800">{fill(s.states[state === "open" ? "invalid" : state])}</p>
          </section>
        ) : (
          <>
            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <h1 className="text-2xl font-bold text-[#014842]">{s.pageTitle}</h1>
              <p className="mt-1 text-sm text-slate-600">{s.intro.replace("{company}", company.name).replace("{document}", docWord).replace("{number}", doc.number)}</p>
              <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  [s.number, <bdi key="n" dir="ltr">{doc.number}</bdi>],
                  [s.date, date(doc.issueDate)],
                  [doc.type === "quotation" ? s.validUntil : s.dueDate, date(doc.untilDate)],
                  [s.total, <bdi key="t" dir={isAr ? "rtl" : "ltr"}>{money(doc.totalAmount)}</bdi>],
                ].map(([label, value], i) => (
                  <div key={i} className="rounded-xl bg-[#F4F8F7] p-3">
                    <dt className="text-xs text-slate-500">{label}</dt>
                    <dd className="mt-0.5 font-semibold text-slate-900">{value}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-5">
                <table className="w-full text-sm">
                  <caption className="sr-only">{s.items}</caption>
                  <thead>
                    <tr className="bg-[#014842] text-white">
                      <th scope="col" className="px-3 py-2 text-start font-semibold">{s.description}</th>
                      <th scope="col" className="px-3 py-2 text-center font-semibold">{s.qty}</th>
                      <th scope="col" className="px-3 py-2 text-end font-semibold">{s.amount}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {doc.lines.map((line, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2">{isAr ? line.descriptionAr || line.descriptionEn : line.descriptionEn || line.descriptionAr}</td>
                        <td className="px-3 py-2 text-center tabular-nums">{line.quantity}</td>
                        <td className="px-3 py-2 text-end tabular-nums">{amount(line.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="text-sm">
                    {doc.discountAmount > 0 && (
                      <tr><td colSpan={2} className="px-3 pt-3 text-end text-slate-500">{s.discount}</td><td className="px-3 pt-3 text-end tabular-nums text-rose-700">- {amount(doc.discountAmount)}</td></tr>
                    )}
                    {doc.vatEnabled && doc.vatAmount > 0 && (
                      <tr><td colSpan={2} className="px-3 pt-1 text-end text-slate-500">{s.vat} ({doc.vatPercentage}%)</td><td className="px-3 pt-1 text-end tabular-nums">{amount(doc.vatAmount)}</td></tr>
                    )}
                    {doc.otherTaxes.map((tax) => (
                      <tr key={tax.code}><td colSpan={2} className="px-3 pt-1 text-end text-slate-500">{language === "ar" ? tax.nameAr : tax.nameEn} ({tax.rate}%)</td><td className="px-3 pt-1 text-end tabular-nums">{amount(tax.amount)}</td></tr>
                    ))}
                    <tr><td colSpan={2} className="px-3 pt-2 text-end font-bold text-[#014842]">{s.total}</td><td className="px-3 pt-2 text-end font-bold tabular-nums text-[#014842]">{money(doc.totalAmount)}</td></tr>
                  </tfoot>
                </table>
              </div>

              <a href={pdfUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#014842]/30 px-4 py-2 text-sm font-semibold text-[#014842] hover:bg-[#014842]/5">
                <FileText className="h-4 w-4" aria-hidden />
                {s.viewPdf}
              </a>
            </section>

            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#014842]">{s.termsTitle}</h2>
              <div className="mt-3 max-h-72 overflow-y-auto whitespace-pre-line rounded-xl bg-[#F4F8F7] p-4 text-sm leading-relaxed text-slate-700">{terms}</div>
            </section>

            <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white p-6 shadow-sm" noValidate>
              <h2 className="text-lg font-bold text-[#014842]">{s.yourDetails}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-1 text-sm font-medium">
                  {s.fullName}
                  <input required maxLength={120} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#09937F]/40" />
                </label>
                <label className="block space-y-1 text-sm font-medium">
                  {s.position}
                  <input maxLength={120} autoComplete="organization-title" value={position} onChange={(e) => setPosition(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#09937F]/40" />
                </label>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <span id="sig-label" className="text-sm font-medium">{s.drawSignature}</span>
                  <button type="button" onClick={clear} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100">
                    <Eraser className="h-3.5 w-3.5" aria-hidden />
                    {s.clear}
                  </button>
                </div>
                <canvas
                  ref={canvas}
                  aria-labelledby="sig-label"
                  role="img"
                  onPointerDown={start}
                  onPointerMove={move}
                  onPointerUp={end}
                  onPointerLeave={end}
                  className="mt-1 h-44 w-full touch-none rounded-xl border-2 border-dashed border-slate-300 bg-white"
                />
                <p className="mt-1 text-xs text-slate-500">{s.drawHint}</p>
              </div>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#014842]" />
                <span>{s.agree}</span>
              </label>
              {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
              <button type="submit" disabled={busy} className="w-full rounded-full bg-[#014842] px-5 py-3 text-sm font-bold text-white hover:bg-[#013833] disabled:opacity-60 sm:w-auto">
                {busy ? s.signing : s.sign}
              </button>
            </form>
          </>
        )}
        <p className="text-center text-xs text-slate-500">
          {fill(s.contact).split(/(\S+@\S+|\+?[\d\s]{7,})/).map((part, i) => (/\d{3}|@/.test(part) ? <bdi key={i} dir="ltr">{part}</bdi> : part))}
        </p>
      </main>
    </div>
  );
}
