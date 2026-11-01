"use client";

import * as React from "react";
import { Button } from "@platform/ui";
import { Download, Printer } from "lucide-react";
import { PageHeader } from "../layout/PageHeader";
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
  const { t, locale } = useAdminLocale();
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
    <PageHeader
      back={{ href: backHref, label: backLabel }}
      eyebrow={eyebrow}
      title={<bdi dir="ltr">{number}</bdi>}
      meta={chips}
      actions={
        <>
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
        </>
      }
    />
  );
}

/** Small mono tag next to the eyebrow (revision, signature state, method). */
export function DocumentHeaderChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-surface-container-high px-2.5 py-0.5 font-mono text-xs text-on-surface-variant">
      {children}
    </span>
  );
}
