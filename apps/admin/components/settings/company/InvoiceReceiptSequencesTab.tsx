"use client";

import { formatDocumentNumber } from "@platform/database/constants/finance";
import * as React from "react";
import type { CompanySettings } from "@platform/database/types";
import { Card, Input } from "@platform/ui";
import { FileText, Receipt, Clock, Hash } from "lucide-react";
import type { Translations } from "../../../lib/translations";

interface InvoiceReceiptSequencesTabProps {
  settings: CompanySettings;
  setSettings: React.Dispatch<React.SetStateAction<CompanySettings>>;
  t: Translations;
  locale: string;
  isRTL: boolean;
}

export function InvoiceReceiptSequencesTab({
  settings,
  setSettings,
  t,
  locale,
  isRTL,
}: InvoiceReceiptSequencesTabProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="p-6 bg-surface-raised dark:bg-surface-container-low border border-outline-variant dark:border-outline-variant shadow-xs rounded-2xl space-y-6">
        <div className="flex items-center gap-3 pb-3 border-b border-outline-variant dark:border-outline-variant">
          <div className="p-2 rounded-xl bg-primary/10 text-primary dark:text-mint">
            <Hash className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-ink dark:text-ink">
              {t.companySettingsTabs.sequences}
            </h2>
            <p className="text-xs text-ink-muted dark:text-ink-muted">
              {t.companySettingsTabs.sequencesSubtitle}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Invoice Sequence */}
          <div className="p-4 rounded-xl border border-outline-variant dark:border-outline-variant bg-surface-raised/50 dark:bg-surface-raised/30 space-y-4">
            <div className="flex items-center gap-2 font-bold text-xs text-ink dark:text-ink">
              <FileText className="w-4 h-4 text-primary dark:text-mint" />
              <span>
                {t.companySettingsTabs.invoiceSeqTitle}
              </span>
            </div>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-ink dark:text-ink">
                {t.companySettingsTabs.invoicePrefix}
              </span>
              <Input
                value={settings.invoice_prefix || "INV"}
                onChange={(e) =>
                  setSettings({ ...settings, invoice_prefix: e.target.value.toUpperCase() })
                }
                placeholder={t.companySettingsTabs.invPrefixPlaceholder}
                className=" text-sm uppercase rounded-lg"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-ink dark:text-ink">
                {t.companySettingsTabs.invoiceNextNumber}
              </span>
              <Input
                type="number"
                min="1"
                value={settings.invoice_next_number || 1}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    invoice_next_number: parseInt(e.target.value, 10) || 1,
                  })
                }
                className=" text-sm rounded-lg"
              />
            </label>

            <div className="p-2.5 rounded-lg bg-surface-raised dark:bg-surface-raised border border-outline-variant dark:border-outline-variant text-xs">
              <span className="text-ink-muted dark:text-ink-muted">
                {t.companySettingsTabs.nextInvoicePreview}
              </span>
              <span className=" font-bold text-primary dark:text-mint">
                {formatDocumentNumber(settings.invoice_prefix || "INV", new Date().getFullYear(), settings.invoice_next_number || 1)}
              </span>
            </div>
          </div>

          {/* Receipt Sequence */}
          <div className="p-4 rounded-xl border border-outline-variant dark:border-outline-variant bg-surface-raised/50 dark:bg-surface-raised/30 space-y-4">
            <div className="flex items-center gap-2 font-bold text-xs text-ink dark:text-ink">
              <Receipt className="w-4 h-4 text-accent" />
              <span>
                {t.companySettingsTabs.receiptSeqTitle}
              </span>
            </div>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-ink dark:text-ink">
                {t.companySettingsTabs.receiptPrefix}
              </span>
              <Input
                value={settings.receipt_prefix || "RCT"}
                onChange={(e) =>
                  setSettings({ ...settings, receipt_prefix: e.target.value.toUpperCase() })
                }
                placeholder={t.companySettingsTabs.rctPrefixPlaceholder}
                className=" text-sm uppercase rounded-lg"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-ink dark:text-ink">
                {t.companySettingsTabs.receiptNextNumber}
              </span>
              <Input
                type="number"
                min="1"
                value={settings.receipt_next_number || 1}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    receipt_next_number: parseInt(e.target.value, 10) || 1,
                  })
                }
                className=" text-sm rounded-lg"
              />
            </label>

            <div className="p-2.5 rounded-lg bg-surface-raised dark:bg-surface-raised border border-outline-variant dark:border-outline-variant text-xs">
              <span className="text-ink-muted dark:text-ink-muted">
                {t.companySettingsTabs.nextReceiptPreview}
              </span>
              <span className=" font-bold text-accent">
                {formatDocumentNumber(settings.receipt_prefix || "RCT", new Date().getFullYear(), settings.receipt_next_number || 1)}
              </span>
            </div>
          </div>

          {/* Payment Terms Days */}
          <div className="sm:col-span-2 p-4 rounded-xl border border-outline-variant dark:border-outline-variant bg-surface-raised/50 dark:bg-surface-raised/30 space-y-3">
            <div className="flex items-center gap-2 font-bold text-xs text-ink dark:text-ink">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>
                {t.companySettingsTabs.termsTitle}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-ink dark:text-ink">
                  {t.companySettingsTabs.paymentTermsDays}
                </span>
                <Input
                  type="number"
                  min="0"
                  max="365"
                  value={settings.payment_terms_days ?? 30}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      payment_terms_days: parseInt(e.target.value, 10) || 30,
                    })
                  }
                  className=" text-sm rounded-lg"
                />
              </label>

              <p className="text-xs text-ink-muted dark:text-ink-muted">
                {t.companySettingsTabs.termsHelper}
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
