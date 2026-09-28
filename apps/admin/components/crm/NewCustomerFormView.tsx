"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, Button, Input, Select } from "@ishoot/ui";
import { ArrowLeft, CheckCircle2, UserPlus } from "lucide-react";
import { CONTACT_TYPES } from "@ishoot/config/constants";
import { createContactAction } from "../../app/actions/crm";
import { useAdminLocale } from "../../hooks/useAdminLocale";

export function NewCustomerFormView() {
  const router = useRouter();
  const { t } = useAdminLocale();

  const [fullName, setFullName] = React.useState("");
  const [company, setCompany] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [jobTitle, setJobTitle] = React.useState("");
  const [contactType, setContactType] = React.useState<
    "client" | "agency" | "vendor" | "freelancer"
  >("client");
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName) return;
    setSaving(true);

    try {
      const res = await createContactAction({
        full_name: fullName,
        email: email || undefined,
        phone: phone || undefined,
        company: company || undefined,
        job_title: jobTitle || undefined,
        contact_type: contactType,
        notes: notes || undefined,
      });

      if (res.contact) {
        router.push(`/dashboard/crm/customers/${res.contact.id}`);
      } else {
        router.push("/dashboard/crm/contacts");
      }
    } catch (err) {
      console.error("Failed to create customer:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/crm/contacts">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-[#9EADA9]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t.actions.back}</span>
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white font-display flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-[#09937F]" />
            <span>{t.customersNew.title}</span>
          </h1>
          <p className="text-xs text-[#9EADA9] mt-1">
            {t.customersNew.subtitle}
          </p>
        </div>
      </div>

      <Card className="p-8 bg-[#0B1210] border border-white/10 rounded-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-semibold text-white mb-1.5 block">
                {t.customersNew.fullNameLabel}
              </label>
              <Input
                required
                placeholder="e.g. Sayed Ahmed"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-white mb-1.5 block">
                {t.customersNew.companyLabel}
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
              <label className="text-xs font-semibold text-white mb-1.5 block">
                {t.customersNew.emailLabel}
              </label>
              <Input
                type="email"
                placeholder="client@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-white mb-1.5 block">
                {t.customersNew.phoneLabel}
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
              <label className="text-xs font-semibold text-white mb-1.5 block">
                {t.customersNew.jobTitleLabel}
              </label>
              <Input
                placeholder="e.g. Marketing Director"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-white mb-1.5 block">
                {t.customersNew.classificationLabel}
              </label>
              <Select
                value={contactType}
                onChange={(e) => setContactType(e.target.value as any)}
              >
                {CONTACT_TYPES.map((type) => (
                  <option
                    key={type.value}
                    value={type.value}
                    className="bg-[#0B1210] text-white"
                  >
                    {t.crm.contactTypes[type.value as keyof typeof t.crm.contactTypes] || type.value}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-white mb-1.5 block">
              {t.customersNew.notesLabel}
            </label>
            <textarea
              rows={4}
              placeholder="Commercial preferences, legal registration details, background notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#050807] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-[#9EADA9]/50 focus:outline-none focus:border-[#09937F]"
            />
          </div>

          <div className="pt-6 border-t border-white/10 flex items-center justify-end gap-4">
            <Link href="/dashboard/crm/contacts">
              <Button type="button" variant="outline" size="sm">
                {t.actions.cancel}
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={saving}
              className="gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {saving ? t.customersNew.saving : t.customersNew.submit}
              </span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
