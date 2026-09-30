"use client";

import * as React from "react";
import type { CompanySettings } from "@ishoot/database/types";
import { Card, Input } from "@ishoot/ui";
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
      <Card className="p-6 bg-white dark:bg-[#202124] border border-[#dadce0] dark:border-[#3c4043] shadow-xs rounded-2xl space-y-6">
        <div className="flex items-center gap-3 pb-3 border-b border-[#dadce0] dark:border-[#3c4043]">
          <div className="p-2 rounded-xl bg-[#014842]/10 text-[#014842] dark:text-[#7de0d1]">
            <Hash className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {t.companySettingsTabs.sequences}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t.companySettingsTabs.sequencesSubtitle}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Invoice Sequence */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/30 space-y-4">
            <div className="flex items-center gap-2 font-bold text-xs text-slate-800 dark:text-neutral-200">
              <FileText className="w-4 h-4 text-[#014842] dark:text-[#7de0d1]" />
              <span>
                {t.companySettingsTabs.invoiceSeqTitle}
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {t.companySettingsTabs.invoicePrefix}
              </label>
              <Input
                value={settings.invoice_prefix || "INV"}
                onChange={(e) =>
                  setSettings({ ...settings, invoice_prefix: e.target.value.toUpperCase() })
                }
                placeholder={t.companySettingsTabs.invPrefixPlaceholder}
                className=" text-sm uppercase rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {t.companySettingsTabs.invoiceNextNumber}
              </label>
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
            </div>

            <div className="p-2.5 rounded-lg bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-xs">
              <span className="text-slate-500 dark:text-neutral-400">
                {t.companySettingsTabs.nextInvoicePreview}
              </span>
              <span className=" font-bold text-[#014842] dark:text-[#7de0d1]">
                {settings.invoice_prefix || "INV"}-
                {new Date().getFullYear()}-
                {String(settings.invoice_next_number || 1).padStart(3, "0")}
              </span>
            </div>
          </div>

          {/* Receipt Sequence */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/30 space-y-4">
            <div className="flex items-center gap-2 font-bold text-xs text-slate-800 dark:text-neutral-200">
              <Receipt className="w-4 h-4 text-[#09937F]" />
              <span>
                {t.companySettingsTabs.receiptSeqTitle}
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {t.companySettingsTabs.receiptPrefix}
              </label>
              <Input
                value={settings.receipt_prefix || "RCT"}
                onChange={(e) =>
                  setSettings({ ...settings, receipt_prefix: e.target.value.toUpperCase() })
                }
                placeholder={t.companySettingsTabs.rctPrefixPlaceholder}
                className=" text-sm uppercase rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {t.companySettingsTabs.receiptNextNumber}
              </label>
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
            </div>

            <div className="p-2.5 rounded-lg bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-xs">
              <span className="text-slate-500 dark:text-neutral-400">
                {t.companySettingsTabs.nextReceiptPreview}
              </span>
              <span className=" font-bold text-[#09937F]">
                {settings.receipt_prefix || "RCT"}-
                {new Date().getFullYear()}-
                {String(settings.receipt_next_number || 1).padStart(3, "0")}
              </span>
            </div>
          </div>

          {/* Payment Terms Days */}
          <div className="sm:col-span-2 p-4 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/30 space-y-3">
            <div className="flex items-center gap-2 font-bold text-xs text-slate-800 dark:text-neutral-200">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>
                {t.companySettingsTabs.termsTitle}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {t.companySettingsTabs.paymentTermsDays}
                </label>
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
              </div>

              <p className="text-xs text-slate-500 dark:text-neutral-400">
                {t.companySettingsTabs.termsHelper}
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
