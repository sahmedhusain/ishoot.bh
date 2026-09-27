"use client";

import * as React from "react";
import type { Inquiry } from "@ishoot/database/types";
import { Card, StatusBadge, ConfirmDestructiveModal } from "@ishoot/ui";
import { Mail, Phone, Building, Trash2 } from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import {
  updateInquiryStatusAction,
  deleteInquiryAction,
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

  const handleDelete = async (id: string) => {
    setInquiries((prev) => prev.filter((inq) => inq.id !== id));
    try {
      await deleteInquiryAction(id);
    } catch (err) {
      console.error("Failed to delete inquiry:", err);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">
          {t.nav.leads}
        </h1>
        <p className="text-xs text-[#9EADA9] mt-1">{t.leads.subtitle}</p>
      </div>

      <div className="space-y-4">
        {inquiries.map((inq) => (
          <Card
            key={inq.id}
            className="p-6 bg-[#0B1210] border border-white/10 hover:border-white/20 transition-all rounded-3xl space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-white">
                    {inq.full_name}
                  </h3>
                  <StatusBadge status={inq.status} />
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-[#9EADA9] mt-1.5">
                  {inq.company && (
                    <span className="flex items-center gap-1 text-white">
                      <Building className="w-3.5 h-3.5 text-[#09937F]" />
                      <span>{inq.company}</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-[#09937F]" />
                    <a
                      href={`mailto:${inq.email}`}
                      className="hover:text-white transition-colors"
                    >
                      {inq.email}
                    </a>
                  </span>
                  {inq.phone && (
                    <span
                      className="flex items-center gap-1 font-mono"
                      dir="ltr"
                    >
                      <Phone className="w-3.5 h-3.5 text-[#09937F]" />
                      <a
                        href={`tel:${inq.phone}`}
                        className="hover:text-white transition-colors"
                      >
                        {inq.phone}
                      </a>
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 self-start sm:self-auto">
                <select
                  value={inq.status}
                  onChange={(e) =>
                    handleStatusChange(inq.id, e.target.value as any)
                  }
                  className="bg-[#050807] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#09937F] cursor-pointer"
                >
                  <option value="new">{t.leads.statusNew}</option>
                  <option value="contacted">{t.leads.statusContacted}</option>
                  <option value="qualified">{t.leads.statusQualified}</option>
                  <option value="archived">{t.leads.statusArchived}</option>
                </select>

                <button
                  onClick={() => setDeleteTargetId(inq.id)}
                  className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title={t.actions.delete}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {inq.budget_range && (
                <span className="px-3 py-1 rounded-xl bg-[#09937F]/15 text-[#09937F] border border-[#09937F]/30 text-xs font-mono font-bold">
                  {inq.budget_range}
                </span>
              )}
              {inq.services_requested.map((srv, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-xl bg-white/5 text-xs text-white border border-white/10"
                >
                  {srv}
                </span>
              ))}
            </div>

            {inq.message && (
              <p className="text-sm text-[#9EADA9] bg-[#050807] p-4 rounded-2xl border border-white/5 leading-relaxed">
                {inq.message}
              </p>
            )}
          </Card>
        ))}

        {inquiries.length === 0 && (
          <div className="p-12 text-center text-[#9EADA9] bg-[#0B1210] rounded-3xl border border-white/10">
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
