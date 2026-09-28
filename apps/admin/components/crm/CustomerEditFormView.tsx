"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CRMContact } from "@ishoot/database/types";
import { Card, Button, Input, Select } from "@ishoot/ui";
import { ArrowLeft, CheckCircle2, UserCog } from "lucide-react";
import { updateContactAction } from "../../app/actions/crm";
import { useAdminLocale } from "../../hooks/useAdminLocale";

interface CustomerEditFormViewProps {
  contact: CRMContact;
}

export function CustomerEditFormView({ contact }: CustomerEditFormViewProps) {
  const router = useRouter();
  const { t } = useAdminLocale();

  const [fullName, setFullName] = React.useState(contact.full_name || "");
  const [company, setCompany] = React.useState(contact.company || "");
  const [email, setEmail] = React.useState(contact.email || "");
  const [phone, setPhone] = React.useState(contact.phone || "");
  const [jobTitle, setJobTitle] = React.useState(contact.job_title || "");
  const [contactType, setContactType] = React.useState<
    "client" | "agency" | "vendor" | "freelancer"
  >(
    (contact.contact_type as "client" | "agency" | "vendor" | "freelancer") ||
      "client",
  );
  const [notes, setNotes] = React.useState(contact.notes || "");
  const [saving, setSaving] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName) return;
    setSaving(true);

    try {
      await updateContactAction(contact.id, {
        full_name: fullName,
        email: email || undefined,
        phone: phone || undefined,
        company: company || undefined,
        job_title: jobTitle || undefined,
        contact_type: contactType,
        notes: notes || undefined,
      });

      router.push(`/dashboard/crm/customers/${contact.id}`);
    } catch (err) {
      console.error("Failed to update customer:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/crm/customers/${contact.id}`}>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-slate-600 dark:text-slate-300"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t.actions.back}</span>
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-display flex items-center gap-2">
            <UserCog className="w-6 h-6 text-[#09937F]" />
            <span>{t.customerEdit.title}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t.customerEdit.subtitle}
          </p>
        </div>
      </div>

      <Card className="p-8 bg-white dark:bg-[#121B19] border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                {t.customerEdit.fullName} *
              </label>
              <Input
                required
                placeholder="e.g. Sayed Ahmed"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                {t.customerEdit.companyName}
              </label>
              <Input
                placeholder="e.g. Zain Bahrain"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                {t.customerEdit.email}
              </label>
              <Input
                type="email"
                placeholder="client@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                {t.customerEdit.phone}
              </label>
              <Input
                placeholder="+973 3900 0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                {t.customerEdit.jobTitle}
              </label>
              <Input
                placeholder="e.g. Marketing Director"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                {t.customerEdit.classification}
              </label>
              <Select
                value={contactType}
                onChange={(e) => setContactType(e.target.value as any)}
              >
                <option value="client">{t.customerEdit.typeDirect}</option>
                <option value="agency">{t.customerEdit.typeAgency}</option>
                <option value="vendor">{t.customer360.clientType}</option>
                <option value="freelancer">{t.customer360.clientType}</option>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
              {t.customerEdit.notes}
            </label>
            <textarea
              rows={4}
              placeholder="Commercial preferences, legal registration details, background notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#09937F]"
            />
          </div>

          <div className="pt-6 border-t border-slate-100 dark:border-white/10 flex items-center justify-end gap-4">
            <Link href={`/dashboard/crm/customers/${contact.id}`}>
              <Button type="button" variant="outline" size="sm">
                {t.actions.cancel}
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={saving}
              className="gap-2 bg-[#014842] hover:bg-[#014842]/90 text-white"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{saving ? t.customerEdit.saving : t.customerEdit.save}</span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
