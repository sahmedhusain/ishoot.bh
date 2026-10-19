"use client";

import * as React from "react";
import { toast } from "sonner";
import { ChevronDown, Download, Eye, FileText, Printer } from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { printPdfUrl } from "../../lib/pdf-print";

type Language = "ar" | "en";

/**
 * View, download or print a generated document in Arabic or in English, whatever the interface language.
 * `pdfUrl` builds the PDF address for a language; `download` adds the attachment flag.
 */
export function BilingualPdfActions({
  pdfUrl,
  languages = ["ar", "en"],
  canDownload = true,
  label,
  className = "",
}: {
  pdfUrl: (language: Language, download?: boolean) => string;
  languages?: Language[];
  canDownload?: boolean;
  label?: string;
  className?: string;
}) {
  const { t, locale } = useAdminLocale();
  const [open, setOpen] = React.useState(false);
  const [printing, setPrinting] = React.useState<Language | null>(null);
  const ref = React.useRef<HTMLDivElement>(null);
  const ordered = [...languages].sort((a, b) =>
    a === locale ? -1 : b === locale ? 1 : 0,
  );

  React.useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) =>
      !ref.current?.contains(event.target as Node) && setOpen(false);
    const escape = (event: KeyboardEvent) =>
      event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const print = async (language: Language) => {
    setPrinting(language);
    try {
      await printPdfUrl(pdfUrl(language));
    } catch {
      toast.error(t.pdfActions.failed);
    } finally {
      setPrinting(null);
    }
  };

  const item =
    "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink hover:bg-ink/5 disabled:opacity-50";
  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-ink/15 px-4 text-xs font-semibold text-ink hover:bg-ink/5"
      >
        <FileText className="h-3.5 w-3.5" aria-hidden />
        {label ?? t.pdfActions.document}
        <ChevronDown className="h-3.5 w-3.5" aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute end-0 top-full z-40 mt-2 w-72 rounded-2xl border border-ink/10 bg-white p-2 shadow-2xl dark:bg-surface-raised"
        >
          {ordered.map((language) => (
            <div key={language} className="rounded-xl px-2 py-1.5">
              <div className="mb-1 text-[11px] font-bold text-ink-muted">
                {t.salaryDocumentLanguages.names[language]}
              </div>
              <div className="flex flex-wrap gap-1">
                <a
                  role="menuitem"
                  className={item}
                  href={pdfUrl(language)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setOpen(false)}
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden />{" "}
                  {t.pdfActions.view}
                </a>
                {canDownload && (
                  <a
                    role="menuitem"
                    className={item}
                    href={pdfUrl(language, true)}
                    onClick={() => setOpen(false)}
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden />{" "}
                    {t.pdfActions.downloadShort}
                  </a>
                )}
                <button
                  role="menuitem"
                  type="button"
                  className={item}
                  disabled={printing !== null}
                  onClick={() => print(language)}
                >
                  <Printer className="h-3.5 w-3.5" aria-hidden />{" "}
                  {printing === language
                    ? t.pdfActions.preparing
                    : t.pdfActions.print}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
