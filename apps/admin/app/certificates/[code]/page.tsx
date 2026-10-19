import { formatMessage, getTranslations } from "@ishoot/locales";
import type { Metadata } from "next";
import { getCompanySettings, getTaxCertificate } from "@ishoot/database";

import { formatDate } from "@ishoot/ui";

export const dynamic = "force-dynamic";
export async function generateMetadata({ searchParams }: { searchParams: Promise<{ lang?: string }> }): Promise<Metadata> {
  const { lang } = await searchParams;
  const c = getTranslations(lang === "en" ? "en" : "ar").admin.taxCertificate;
  return { title: c.eyebrow, robots: { index: false, follow: false } };
}

/** Public page behind the QR code on documents: the company's registration for a tax and its certificate. */
export default async function TaxCertificatePage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ lang?: string }> }) {
  const [{ code }, { lang }] = await Promise.all([params, searchParams]);
  const language = lang === "en" ? "en" : "ar";
  const isAr = language === "ar";
  const c = getTranslations(language).admin.taxCertificate;
  const [certificate, company] = await Promise.all([getTaxCertificate(code), getCompanySettings()]);
  const companyName = isAr ? company.company_name_ar : company.company_name_en;
  const taxName = certificate ? (code === "vat" ? c.vatName : isAr ? certificate.nameAr : certificate.nameEn) : "";
  const isImage = certificate?.certificateUrl ? /\.(png|jpe?g|webp)$/i.test(certificate.certificateUrl) : false;
  const fileHref = `/certificates/${encodeURIComponent(code)}/file`;
  const expired = certificate?.validUntil ? new Date(`${certificate.validUntil}T23:59:59+03:00`) < new Date() : false;

  return (
    <main dir={isAr ? "rtl" : "ltr"} lang={language} className="min-h-screen bg-[#F4F8F7] px-4 py-10 text-slate-800">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="flex items-center gap-3">
          {company.icon_url || company.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- company artwork from settings
            <img src={company.icon_url || company.logo_url || ""} alt="" className="h-12 w-12 rounded-xl object-contain bg-white p-1.5 shadow-sm" />
          ) : null}
          <div>
            <p className="text-xs text-slate-500">{c.eyebrow}</p>
            <h1 className="text-lg font-bold text-[#014842]">{companyName}</h1>
          </div>
        </header>

        {!certificate ? (
          <section className="rounded-3xl bg-white p-8 text-center shadow-sm">
            <h2 className="text-base font-bold">{c.notFoundTitle}</h2>
            <p className="mt-2 text-sm text-slate-500">{c.notFoundBody}</p>
          </section>
        ) : (
          <section className="rounded-3xl bg-white p-6 sm:p-8 shadow-sm space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{taxName}</h2>
                <p className="mt-1 text-sm text-slate-500">{formatMessage(c.subtitle, { company: companyName })}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${certificate.active && !expired ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                {certificate.active && !expired ? c.active : expired ? c.expired : c.inactive}
              </span>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl bg-slate-50 p-4">
              <div>
                <dt className="text-xs text-slate-500">{c.registrationNumber}</dt>
                <dd className="mt-0.5 text-base font-bold tabular-nums" dir="ltr">{certificate.registrationNumber || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">{c.registeredName}</dt>
                <dd className="mt-0.5 text-sm font-semibold">{companyName}</dd>
              </div>
              {company.cr_number ? (
                <div>
                  <dt className="text-xs text-slate-500">{c.crNumber}</dt>
                  <dd className="mt-0.5 text-sm font-semibold" dir="ltr">{company.cr_number}</dd>
                </div>
              ) : null}
              {certificate.validUntil ? (
                <div>
                  <dt className="text-xs text-slate-500">{c.validUntil}</dt>
                  <dd className="mt-0.5 text-sm font-semibold">{formatDate(certificate.validUntil, language)}</dd>
                </div>
              ) : null}
            </dl>
            {certificate.certificateUrl ? (
              <div className="space-y-3">
                <a href={fileHref} target="_blank" rel="noreferrer" className="flex h-12 w-full items-center justify-center rounded-full bg-[#014842] text-sm font-semibold text-white hover:bg-[#01625a]">
                  {c.open}
                </a>
                {isImage ? (
                  // eslint-disable-next-line @next/next/no-img-element -- the uploaded certificate scan
                  <img src={fileHref} alt={taxName} className="w-full rounded-2xl border border-slate-200" />
                ) : (
                  <iframe src={fileHref} title={taxName} className="hidden sm:block h-[640px] w-full rounded-2xl border border-slate-200" />
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">{c.noFile}</p>
            )}
          </section>
        )}
        <footer className="flex justify-center gap-3 text-xs text-slate-400">
          {company.phone ? <bdi dir="ltr">{company.phone}</bdi> : null}
          {company.email ? <bdi dir="ltr">{company.email}</bdi> : null}
        </footer>
      </div>
    </main>
  );
}
