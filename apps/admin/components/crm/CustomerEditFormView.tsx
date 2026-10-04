"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CRMContact } from "@ishoot/database/types";
import { Card, Button, Input, Select } from "@ishoot/ui";
import { ArrowLeft, CheckCircle2, UserCog } from "lucide-react";
import { updateContactAction } from "../../app/actions/crm";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { EditConfirmModal, type FieldChange } from "../shared/EditConfirmModal";

interface CustomerEditFormViewProps {
  contact: CRMContact;
}

export function CustomerEditFormView({ contact }: CustomerEditFormViewProps) {
  const router = useRouter();
  const { t, isRTL } = useAdminLocale();

  const [fullName, setFullName] = React.useState(contact.full_name || "");
  const [company, setCompany] = React.useState(contact.company || "");
  const [vatNumber, setVatNumber] = React.useState(contact.vat_number || "");
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
  const [showConfirmModal, setShowConfirmModal] = React.useState(false);

  const changes: FieldChange[] = React.useMemo(() => [
    {
      field: "full_name",
      label: isRTL ? "الاسم الكامل" : "Full Name",
      oldValue: contact.full_name,
      newValue: fullName,
    },
    {
      field: "company",
      label: isRTL ? "الشركة" : "Company",
      oldValue: contact.company || "",
      newValue: company,
    },
    {
      field: "vat_number",
      label: t.contactFields.vatNumber,
      oldValue: contact.vat_number || "",
      newValue: vatNumber,
    },
    {
      field: "email",
      label: isRTL ? "البريد الإلكتروني" : "Email",
      oldValue: contact.email || "",
      newValue: email,
    },
    {
      field: "phone",
      label: isRTL ? "رقم الهاتف" : "Phone",
      oldValue: contact.phone || "",
      newValue: phone,
    },
    {
      field: "job_title",
      label: isRTL ? "المسمى الوظيفي" : "Job Title",
      oldValue: contact.job_title || "",
      newValue: jobTitle,
    },
    {
      field: "contact_type",
      label: isRTL ? "نوع جهة الاتصال" : "Contact Type",
      oldValue: contact.contact_type || "client",
      newValue: contactType,
    },
    {
      field: "notes",
      label: isRTL ? "الملاحظات" : "Notes",
      oldValue: contact.notes || "",
      newValue: notes,
    },
  ], [t, contact, fullName, company, vatNumber, email, phone, jobTitle, contactType, notes, isRTL]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || saving) return;
    setShowConfirmModal(true);
  };

  const handleConfirmedSave = async () => {
    setSaving(true);
    try {
      await updateContactAction(contact.id, {
        full_name: fullName,
        email: email || undefined,
        phone: phone || undefined,
        company: company || undefined,
        vat_number: vatNumber.trim(),
        job_title: jobTitle || undefined,
        contact_type: contactType,
        notes: notes || undefined,
      });

      router.push(`/dashboard/crm/customers/${contact.id}`);
    } catch (err) {
      console.error("Failed to update customer:", err);
    } finally {
      setSaving(false);
      setShowConfirmModal(false);
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
                placeholder={t.customerEdit.fullNamePlaceholder}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                {t.customerEdit.companyName}
              </label>
              <Input
                placeholder={t.customerEdit.companyPlaceholder}
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                {t.contactFields.vatNumber}
              </label>
              <Input
                placeholder={t.contactFields.vatNumberPlaceholder}
                value={vatNumber}
                onChange={(e) => setVatNumber(e.target.value)}
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
                placeholder={t.customerEdit.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                {t.customerEdit.phone}
              </label>
              <Input
                placeholder={t.customerEdit.phonePlaceholder}
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
                placeholder={t.customerEdit.jobTitlePlaceholder}
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
                <option value="client">{t.crm.contactTypes.client}</option>
                <option value="agency">{t.crm.contactTypes.agency}</option>
                <option value="vendor">{t.crm.contactTypes.vendor}</option>
                <option value="freelancer">{t.crm.contactTypes.freelancer}</option>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
              {t.customerEdit.notes}
            </label>
            <textarea
              rows={4}
              placeholder={t.customerEdit.notesPlaceholder}
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

      <EditConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmedSave}
        changes={changes}
        isSaving={saving}
        title={isRTL ? `تأكيد تعديل بيانات العميل: ${contact.full_name}` : `Confirm Edit on Client: ${contact.full_name}`}
        description={isRTL ? "راجع تفاصيل التغييرات على بيانات العميل قبل حفظها في النظام:" : "Review the updated client fields before saving changes to CRM:"}
      />
    </div>
  );
}
