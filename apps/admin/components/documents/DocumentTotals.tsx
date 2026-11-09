"use client";

import * as React from "react";
import { useAdminLocale } from "../../hooks/useAdminLocale";

interface DocumentTaxRow {
  code: string;
  name_en: string;
  name_ar: string;
  rate: number;
  amount: number;
}

interface DocumentTotalsProps {
  currency: string;
  subtotal: number | string;
  discount?: { amount: number | string; label: React.ReactNode; className?: string };
  vat?: { percentage: number | string; amount: number | string } | null;
  taxes?: DocumentTaxRow[];
  total: number | string;
  totalLabel?: React.ReactNode;
  paid?: number;
  balance?: number;
}

const money = (value: number | string) => Number(value).toFixed(3);

export function DocumentTotals({
  currency,
  subtotal,
  discount,
  vat,
  taxes = [],
  total,
  totalLabel,
  paid,
  balance,
}: DocumentTotalsProps) {
  const { t, locale } = useAdminLocale();
  const qdT = t.quotationDetail;
  return (
    <div className="pt-4 border-t border-outline-variant flex justify-end">
      <div className="w-full sm:w-72 space-y-2 text-xs">
        <div className="flex justify-between text-ink-muted">
          <span>{qdT.subtotal}</span>
          <span className="font-mono font-medium">{money(subtotal)} {currency}</span>
        </div>
        {discount && Number(discount.amount) > 0 && (
          <div className={`flex justify-between ${discount.className ?? "text-m3-tertiary"}`}>
            <span>{discount.label}</span>
            <span className="font-mono font-medium">-{money(discount.amount)} {currency}</span>
          </div>
        )}
        {vat && (
          <div className="flex justify-between text-ink-muted">
            <span>{qdT.vat} ({Number(vat.percentage)}%)</span>
            <span className="font-mono font-medium">+{money(vat.amount)} {currency}</span>
          </div>
        )}
        {taxes.map((tax) => (
          <div key={tax.code} className="flex justify-between text-ink-muted">
            <span>{locale === "ar" ? tax.name_ar : tax.name_en} ({tax.rate}%)</span>
            <span className="font-mono font-medium">+{money(tax.amount)} {currency}</span>
          </div>
        ))}
        <div className="flex justify-between text-sm font-bold text-ink border-t border-outline-variant pt-2">
          <span>{totalLabel ?? qdT.totalPayable}</span>
          <span className="font-mono text-primary">
            {money(total)} {currency}
          </span>
        </div>
        {paid !== undefined && (
          <div className="flex justify-between text-ink-muted">
            <span>{t.finance.amountPaid}</span>
            <span className="font-mono font-medium">-{money(paid)} {currency}</span>
          </div>
        )}
        {balance !== undefined && (
          <div className="flex justify-between text-sm font-bold text-ink border-t border-outline-variant pt-2">
            <span>{t.finance.balanceDue}</span>
            <span className={`font-mono ${balance > 0 ? "text-m3-error" : "text-primary"}`}>
              {money(balance)} {currency}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
