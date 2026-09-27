"use client";

import * as React from "react";
import type { CRMContact } from "@ishoot/database/types";
import { Card, Button, Input, ConfirmDestructiveModal } from "@ishoot/ui";
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
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">
            {t.nav.contacts}
          </h1>
          <p className="text-xs text-[#9EADA9] mt-1">
            {t.contactsView.subtitle}
          </p>
        </div>

        <Link href="/dashboard/crm/customers/new">
          <Button
            variant="primary"
            size="sm"
            className="gap-1.5 shadow-lg shadow-[#09937F]/20 self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.actions.newContact}</span>
          </Button>
        </Link>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute start-3.5 top-3.5 text-[#9EADA9]" />
        <Input
          placeholder={t.actions.search}
          className="ps-10"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((c) => (
          <Card
            key={c.id}
            className="p-6 bg-[#0B1210] border border-white/10 hover:border-[#09937F]/40 transition-all rounded-3xl space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#014842] border border-[#09937F]/40 flex items-center justify-center font-bold text-white text-sm font-mono">
                    {c.full_name.charAt(0)}
                  </div>
                  <div>
                    <Link
                      href={`/dashboard/crm/customers/${c.id}`}
                      className="text-sm font-bold text-white hover:text-[#09937F] hover:underline flex items-center gap-1.5"
                    >
                      <span>{c.full_name}</span>
                    </Link>
                    <div className="text-xs text-[#09937F]">
                      {c.job_title || t.contactsView.clientPartner}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setDeleteTargetId(c.id)}
                  className="p-1.5 text-[#9EADA9] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                  title={t.actions.delete}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-xs text-[#9EADA9] pt-2 border-t border-white/5">
                {c.company && (
                  <div className="flex items-center gap-2 text-white">
                    <Building className="w-3.5 h-3.5 text-[#09937F]" />
                    <span className="font-medium">{c.company}</span>
                  </div>
                )}
                {c.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-[#09937F]" />
                    <a
                      href={`mailto:${c.email}`}
                      className="hover:text-white transition-colors"
                    >
                      {c.email}
                    </a>
                  </div>
                )}
                {c.phone && (
                  <div className="flex items-center gap-2 font-mono" dir="ltr">
                    <Phone className="w-3.5 h-3.5 text-[#09937F]" />
                    <a
                      href={`tel:${c.phone}`}
                      className="hover:text-white transition-colors"
                    >
                      {c.phone}
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-white/5 flex items-center justify-between">
              <Link href={`/dashboard/crm/customers/${c.id}`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs text-[#09937F]"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Customer 360 Dossier</span>
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>

      <ConfirmDestructiveModal
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDelete}
        title="Delete Customer Profile"
        description="Are you sure you want to delete this customer record? This will remove their contact info and associated records."
      />
    </div>
  );
}
