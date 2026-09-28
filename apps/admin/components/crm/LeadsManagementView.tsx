"use client";

import * as React from "react";
import Link from "next/link";
import type { Inquiry } from "@ishoot/database/types";
import { Card, StatusBadge, Button, ConfirmDestructiveModal } from "@ishoot/ui";
import {
  Mail,
  Phone,
  Building,
  Trash2,
  UserCheck,
  Briefcase,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import {
  updateInquiryStatusAction,
  deleteInquiryAction,
  convertInquiryToClientAction,
} from "../../app/actions/crm";

interface LeadsManagementViewProps {
  initialInquiries: Inquiry[];
}

export function LeadsManagementView({
  initialInquiries,
}: LeadsManagementViewProps) {
  const { t } = useAdminLocale();
  const [inquiries, setInquiries] = React.useState<Inquiry[]>(initialInquiries);
  const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(
    null,
  );
  const [convertingId, setConvertingId] = React.useState<string | null>(null);
  const [conversionSuccess, setConversionSuccess] = React.useState<{
    inquiryId: string;
    contactId: string;
    dealId: string;
  } | null>(null);

  const handleStatusChange = async (
    id: string,
    newStatus: Inquiry["status"],
  ) => {
    setInquiries((prev) =>
      prev.map((inq) => (inq.id === id ? { ...inq, status: newStatus } : inq)),
    );
    try {
      await updateInquiryStatusAction(id, newStatus);
    } catch (err) {
      console.error("Failed to update inquiry status:", err);
    }
  };

  const handleConvert = async (inquiryId: string) => {
    setConvertingId(inquiryId);
    try {
      const res = await convertInquiryToClientAction(inquiryId);
      if (res.success && res.contactId && res.dealId) {
        setConversionSuccess({
          inquiryId,
          contactId: res.contactId,
          dealId: res.dealId,
        });
        setInquiries((prev) =>
          prev.map((inq) =>
            inq.id === inquiryId ? { ...inq, status: "qualified" } : inq,
          ),
        );
      }
    } catch (err) {
      console.error("Failed to convert inquiry:", err);
    } finally {
      setConvertingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setInquiries((prev) => prev.filter((inq) => inq.id !== id));
    try {
      await deleteInquiryAction(id);
    } catch (err) {
      console.error("Failed to delete inquiry:", err);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t.nav.leads}
          </h1>
          <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
            Website inquiries and new project requests.
          </p>
        </div>
      </div>

      {/* Inquiries List */}
      <div className="space-y-3.5">
        {inquiries.map((inq) => {
          const isConverted =
            conversionSuccess?.inquiryId === inq.id || inq.status === "qualified";

          return (
            <div
              key={inq.id}
              className="p-5 bg-white dark:bg-[#1a1a1a] border border-[#dadce0] dark:border-[#3c4043] rounded-xl shadow-xs space-y-3.5 hover:border-slate-300 dark:hover:border-neutral-600 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 dark:border-neutral-800 pb-3.5">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {inq.full_name}
                    </h3>
                    <StatusBadge status={inq.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-neutral-400 mt-1">
                    {inq.company && (
                      <span className="flex items-center gap-1 text-slate-800 dark:text-neutral-200 font-medium">
                        <Building className="w-3.5 h-3.5 text-[#09937F]" />
                        <span>{inq.company}</span>
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <a
                        href={`mailto:${inq.email}`}
                        className="hover:text-[#014842] dark:hover:text-[#7de0d1] hover:underline transition-colors"
                      >
                        {inq.email}
                      </a>
                    </span>
                    {inq.phone && (
                      <span
                        className="flex items-center gap-1 font-mono text-[11px]"
                        dir="ltr"
                      >
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <a
                          href={`tel:${inq.phone}`}
                          className="hover:text-[#014842] dark:hover:text-[#7de0d1] transition-colors"
                        >
                          {inq.phone}
                        </a>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
                  {/* Convert to Client Button */}
                  {!isConverted ? (
                    <Button
                      size="sm"
                      onClick={() => handleConvert(inq.id)}
                      disabled={convertingId === inq.id}
                      className="bg-[#014842] hover:bg-[#014842]/90 text-white rounded-full px-3.5 h-8 text-xs font-semibold gap-1.5"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>
                        {convertingId === inq.id
                          ? "Converting..."
                          : "Convert to Client"}
                      </span>
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Client Created</span>
                      </span>
                      {conversionSuccess?.inquiryId === inq.id && (
                        <Link
                          href={`/dashboard/crm/customers/${conversionSuccess.contactId}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-[#014842] dark:text-[#7de0d1] hover:underline"
                        >
                          <span>Open Dossier</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  )}

                  <select
                    value={inq.status}
                    onChange={(e) =>
                      handleStatusChange(inq.id, e.target.value as any)
                    }
                    className="bg-slate-50 border border-slate-200 text-slate-900 dark:bg-neutral-800 dark:border-neutral-700 dark:text-white rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-[#09937F] cursor-pointer"
                  >
                    <option value="new">{t.leads.statusNew}</option>
                    <option value="contacted">{t.leads.statusContacted}</option>
                    <option value="qualified">{t.leads.statusQualified}</option>
                    <option value="archived">{t.leads.statusArchived}</option>
                  </select>

                  <button
                    onClick={() => setDeleteTargetId(inq.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    title={t.actions.delete}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Tags: Budget & Services */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {inq.budget_range && (
                  <span className="px-2.5 py-0.5 rounded-md bg-[#e6f5f2] text-[#014842] dark:bg-[#004d40]/40 dark:text-[#7de0d1] text-[11px] font-mono font-semibold">
                    Budget: {inq.budget_range}
                  </span>
                )}
                {inq.services_requested.map((srv, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-neutral-300 text-[11px] font-medium"
                  >
                    {srv}
                  </span>
                ))}
              </div>

              {inq.message && (
                <div className="text-xs text-slate-600 dark:text-neutral-300 bg-slate-50 dark:bg-neutral-800/40 p-3 rounded-lg border border-slate-100 dark:border-neutral-800 leading-relaxed">
                  {inq.message}
                </div>
              )}
            </div>
          );
        })}

        {inquiries.length === 0 && (
          <div className="p-12 text-center text-slate-400 dark:text-neutral-500 bg-white dark:bg-[#1a1a1a] rounded-xl border border-[#dadce0] dark:border-[#3c4043]">
            {t.leads.noInquiries}
          </div>
        )}
      </div>

      <ConfirmDestructiveModal
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={async () => {
          if (deleteTargetId) {
            await handleDelete(deleteTargetId);
            setDeleteTargetId(null);
          }
        }}
        title={t.actions.delete}
        description={t.leads.confirmDelete}
        confirmLabel={t.actions.delete}
        cancelLabel={t.actions.cancel}
      />
    </div>
  );
}
