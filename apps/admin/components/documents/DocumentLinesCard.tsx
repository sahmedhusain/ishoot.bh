"use client";

import * as React from "react";
import { FileText } from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { DocumentCard } from "./DocumentCard";

interface DocumentLine {
  id?: string;
  descriptionEn: string;
  descriptionAr?: string | null;
  quantity: number | string;
  unitPrice: number | string;
  lineTotal: number | string;
}

interface DocumentLinesCardProps {
  title: React.ReactNode;
  currency: string;
  lines: DocumentLine[];
  /** Rendered under the table, normally <DocumentTotals>. */
  children?: React.ReactNode;
}

export function DocumentLinesCard({ title, currency, lines, children }: DocumentLinesCardProps) {
  const { t } = useAdminLocale();
  const qdT = t.quotationDetail;
  return (
    <DocumentCard title={title} icon={FileText}>
      <div className="overflow-x-auto">
        <table className="w-full text-left rtl:text-right text-sm">
          <thead>
            <tr className="border-b border-outline-variant text-xs font-mono uppercase text-ink-muted">
              <th className="py-2.5 px-3">{qdT.colNum}</th>
              <th className="py-2.5 px-3">{qdT.colDesc}</th>
              <th className="py-2.5 px-3 text-right rtl:text-left">{qdT.colQty}</th>
              <th className="py-2.5 px-3 text-right rtl:text-left">{qdT.colUnit} ({currency})</th>
              <th className="py-2.5 px-3 text-right rtl:text-left">{qdT.colTotal} ({currency})</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {lines.map((item, idx) => (
              <tr key={item.id || idx} className="hover:bg-surface-raised/50">
                <td className="py-3 px-3 text-xs font-mono text-ink-muted">{idx + 1}</td>
                <td className="py-3 px-3">
                  <div className="font-medium text-ink">{item.descriptionEn}</div>
                  {item.descriptionAr && (
                    <div className="text-xs text-ink-muted font-sans" dir="rtl">
                      {item.descriptionAr}
                    </div>
                  )}
                </td>
                <td className="py-3 px-3 text-end font-mono">{Number(item.quantity)}</td>
                <td className="py-3 px-3 text-end font-mono">{Number(item.unitPrice).toFixed(3)}</td>
                <td className="py-3 px-3 text-end font-mono font-semibold text-ink">
                  {Number(item.lineTotal).toFixed(3)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {children}
    </DocumentCard>
  );
}
