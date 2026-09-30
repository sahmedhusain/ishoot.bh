"use client";

import * as React from "react";
import type { CRMContact } from "@ishoot/database/types";
import { Button, Input, ConfirmDestructiveModal } from "@ishoot/ui";
import {
  Plus,
  Search,
  Building,
  Mail,
  Phone,
  Trash2,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { deleteContactAction } from "../../app/actions/crm";

interface ContactsManagementViewProps {
  initialContacts: CRMContact[];
}

export function ContactsManagementView({
  initialContacts,
}: ContactsManagementViewProps) {
  const { t } = useAdminLocale();

  const [contacts, setContacts] = React.useState<CRMContact[]>(initialContacts);
  const [query, setQuery] = React.useState("");
  const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(
    null,
  );

  const filtered = contacts.filter((c) => {
    const q = query.toLowerCase();
    return (
      c.full_name.toLowerCase().includes(q) ||
      (c.company && c.company.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q))
    );
  });

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await deleteContactAction(deleteTargetId);
      setContacts((prev) => prev.filter((c) => c.id !== deleteTargetId));
    } catch (err) {
      console.error("Failed to delete contact:", err);
    } finally {
      setDeleteTargetId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t.nav.contacts}
          </h1>
        </div>

        <Link href="/dashboard/crm/customers/new">
          <Button
            variant="primary"
            size="sm"
            className="gap-1.5 bg-[#014842] hover:bg-[#014842]/90 text-white rounded-full px-4 h-8 text-xs font-semibold self-start sm:self-auto shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.actions.newContact}</span>
          </Button>
        </Link>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute start-3 top-2.5 text-slate-400" />
        <input
          type="text"
          placeholder={t.actions.search}
          className="w-full ps-9 pe-4 py-1.5 text-xs rounded-lg bg-white border border-[#dadce0] text-slate-900 placeholder:text-slate-400 dark:bg-[#1a1a1a] dark:border-[#3c4043] dark:text-white focus:outline-none focus:border-[#09937F]"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Grid of Client Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filtered.map((c) => (
          <div
            key={c.id}
            className="p-4 bg-white dark:bg-[#1a1a1a] border border-[#dadce0] dark:border-[#3c4043] hover:border-slate-300 dark:hover:border-neutral-600 transition-colors rounded-xl shadow-xs space-y-3.5 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-[#014842] text-white flex items-center justify-center font-bold text-xs font-mono shrink-0">
                    {c.full_name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={`/dashboard/crm/customers/${c.id}`}
                      className="text-xs font-bold text-slate-900 dark:text-white hover:text-[#014842] dark:hover:text-[#7de0d1] hover:underline flex items-center gap-1 truncate"
                    >
                      <span className="truncate">{c.full_name}</span>
                    </Link>
                    <div className="text-[11px] text-[#014842] dark:text-[#7de0d1] font-medium truncate">
                      {c.job_title || t.contactsView.clientPartner}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setDeleteTargetId(c.id)}
                  className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors shrink-0"
                  title={t.actions.delete}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 dark:text-neutral-400 pt-2 border-t border-slate-100 dark:border-neutral-800">
                {c.company && (
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                    <Building className="w-3.5 h-3.5 text-[#09937F] shrink-0" />
                    <span className="font-semibold truncate">{c.company}</span>
                  </div>
                )}
                {c.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <a
                      href={`mailto:${c.email}`}
                      className="hover:text-[#014842] dark:hover:text-[#7de0d1] transition-colors truncate"
                    >
                      {c.email}
                    </a>
                  </div>
                )}
                {c.phone && (
                  <div className="flex items-center gap-2 font-mono text-[11px]" dir="ltr">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <a
                      href={`tel:${c.phone}`}
                      className="hover:text-[#014842] dark:hover:text-[#7de0d1] transition-colors"
                    >
                      {c.phone}
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-neutral-800">
              <Link href={`/dashboard/crm/customers/${c.id}`} className="block">
                <button
                  type="button"
                  className="w-full h-7 px-3 rounded-lg border border-[#dadce0] dark:border-[#3c4043] hover:bg-slate-50 dark:hover:bg-neutral-800 text-[11px] font-semibold text-[#014842] dark:text-[#7de0d1] flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>{t.contactsView.clientDossier360}</span>
                </button>
              </Link>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDestructiveModal
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDelete}
        title={t.contactsView.deleteConfirmTitle}
        description={t.contactsView.deleteConfirmDesc}
      />
    </div>
  );
}
