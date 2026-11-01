"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@platform/ui";
import { ArrowLeft, ArrowRight, Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import {
  downloadDocumentPdf,
  printDocumentPdf,
  type PdfDocumentType,
} from "../../lib/pdf-print";

interface DocumentDetailHeaderProps {
  backHref: string;
  backLabel?: string;
  eyebrow: React.ReactNode;
  number: string;
  chips?: React.ReactNode;
  /** The generated paper document behind Print and Download; downloading needs export access. */
  pdf: { type: PdfDocumentType; id: string; number: string; canDownload?: boolean };
  /** Lifecycle actions, shown after Print and Download. */
  actions?: React.ReactNode;
}

export function DocumentDetailHeader({
  backHref,
  backLabel,
  eyebrow,
  number,
  chips,
  pdf,
  actions,
}: DocumentDetailHeaderProps) {
  const { isRTL, t, locale } = useAdminLocale();
  const [printing, setPrinting] = React.useState(false);

  const handlePrint = async () => {
    setPrinting(true);
    try {
      await printDocumentPdf(pdf.type, pdf.id, locale);
    } catch {
      toast.error(t.pdfActions.failed);
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant pb-6">
      <div className="flex items-center gap-3" data-page-header>
        <Link
          href={backHref}
          aria-label={backLabel}
          title={backLabel}
          className="p-2 rounded-md hover:bg-surface-sunken text-ink-muted hover:text-ink transition-colors"
        >
          {isRTL ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
        </Link>
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-mono uppercase tracking-widest text-accent font-medium">
              {eyebrow}
            </span>
            {chips}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-ink mt-1">
            <bdi dir="ltr">{number}</bdi>
          </h1>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={printing}
          onClick={handlePrint}
          className="gap-2"
        >
          <Printer className="w-4 h-4" />
          <span>{printing ? t.pdfActions.preparing : t.pdfActions.print}</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pdf.canDownload === false}
          onClick={() => downloadDocumentPdf(pdf.type, pdf.id, pdf.number, locale)}
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          <span>{t.pdfActions.download}</span>
        </Button>
        {actions}
      </div>
    </div>
  );
}

/** Small mono tag next to the eyebrow (revision, signature state, method). */
export function DocumentHeaderChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-mono bg-surface-sunken px-2 py-0.5 rounded text-ink-muted">
      {children}
    </span>
  );
}
