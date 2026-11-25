import Link from "next/link";
import { ArrowLeft, ArrowRight, Lock, ShieldCheck } from "lucide-react";
import type { StorePolicyDoc } from "../../lib/store-policy-pages";

export function PolicyDocumentView({
  locale,
  doc,
  crNumber,
  sslBadgeEnabled = true,
  backHref,
}: {
  locale: string;
  doc: StorePolicyDoc;
  crNumber?: string;
  sslBadgeEnabled?: boolean;
  backHref?: string;
}) {
  const ar = locale === "ar";
  const BackIcon = ar ? ArrowRight : ArrowLeft;
  const quickLinks = [
    { href: `/${locale}/terms`, label: ar ? "الشروط والأحكام" : "Terms" },
    { href: `/${locale}/privacy`, label: ar ? "الخصوصية والكوكيز" : "Privacy" },
    { href: `/${locale}/return-policy`, label: ar ? "الإرجاع والاسترداد" : "Returns" },
    { href: `/${locale}/warranty`, label: ar ? "الضمان" : "Warranty" },
    { href: `/${locale}/vat-tax`, label: ar ? "الضرائب" : "VAT & Tax" },
    { href: `/${locale}/page/faq`, label: ar ? "الأسئلة الشائعة" : "FAQ" },
    { href: `/${locale}/page/payment-methods`, label: ar ? "طرق الدفع" : "Payments" },
  ];

  return (
    <div className="bg-m3-surface text-m3-on-surface min-h-[70vh] pb-20">
      <div className="shell page-heading space-y-8">
        <div>
          <Link
            href={backHref || `/${locale}/products`}
            className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-m3-on-surface-variant hover:text-m3-primary transition-colors"
          >
            <BackIcon className="w-4 h-4" aria-hidden="true" />
            <span>{ar ? "العودة إلى المتجر" : "Back to Store"}</span>
          </Link>
        </div>

        <header className="rounded-3xl border border-m3-outline-variant bg-m3-surface-container-low p-6 sm:p-8 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-m3-secondary-container px-3 py-1 text-xs font-semibold text-m3-on-secondary-container">
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
              {doc.badge}
            </span>
            {sslBadgeEnabled && (doc.key === "privacy" || doc.key === "terms") && (
              <span
                data-testid="ssl-security-badge"
                className="inline-flex items-center gap-1 rounded-full border border-m3-outline-variant bg-m3-surface px-3 py-1 text-xs font-medium text-m3-on-surface-variant"
              >
                <Lock className="w-3 h-3 text-m3-primary" aria-hidden="true" />
                {ar ? "حماية بتشفير 256-Bit SSL" : "256-Bit SSL Secured"}
              </span>
            )}
            {crNumber && (
              <span className="inline-flex items-center rounded-full border border-m3-outline-variant bg-m3-surface px-3 py-1 text-xs font-mono text-m3-on-surface-variant" dir="ltr">
                CR: {crNumber}
              </span>
            )}
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-m3-on-surface">
            {doc.title}
          </h1>
          <p className="text-sm sm:text-base text-m3-on-surface-variant leading-relaxed">
            {doc.subtitle}
          </p>
        </header>

        <div className="space-y-4">
          {doc.sections.map((section, idx) => (
            <section
              key={idx}
              className="rounded-2xl border border-m3-outline-variant bg-m3-surface-container p-6 space-y-2"
            >
              <h2 className="font-display text-lg font-bold text-m3-on-surface">
                {section.heading}
              </h2>
              <p className="text-sm text-m3-on-surface-variant leading-relaxed whitespace-pre-line">
                {section.body}
              </p>
            </section>
          ))}
        </div>

        <nav
          aria-label={ar ? "صفحات السياسات" : "Policy Links"}
          className="flex flex-wrap gap-2 pt-4 border-t border-m3-outline-variant"
        >
          {quickLinks.map((lnk) => (
            <Link
              key={lnk.href}
              href={lnk.href}
              className="inline-flex min-h-10 items-center rounded-full border border-m3-outline-variant bg-m3-surface-container-low px-4 py-1.5 text-xs font-medium text-m3-on-surface hover:border-m3-primary hover:text-m3-primary transition-colors"
            >
              {lnk.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
