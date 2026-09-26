'use client';

import * as React from 'react';
import type { CRMContact } from '@ishoot/database/types';
import { Card, Input, Button, Modal, Select } from '@ishoot/ui';
import { Search, Mail, Phone, Building, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { useAdminLocale } from '../../hooks/useAdminLocale';
import { createContactAction, deleteContactAction } from '../../app/actions/crm';

interface ContactsManagementViewProps {
  initialContacts: CRMContact[];
}

export function ContactsManagementView({ initialContacts }: ContactsManagementViewProps) {
  const { t, locale } = useAdminLocale();

  const [contacts, setContacts] = React.useState<CRMContact[]>(initialContacts);
  const [query, setQuery] = React.useState('');
  const [modalOpen, setModalOpen] = React.useState(false);

  // Form states
  const [fullName, setFullName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [company, setCompany] = React.useState('');
  const [jobTitle, setJobTitle] = React.useState('');
  const [contactType, setContactType] = React.useState<'client' | 'agency' | 'vendor' | 'freelancer'>('client');
  const [notes, setNotes] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const filtered = contacts.filter(
    (c) =>
      c.full_name.toLowerCase().includes(query.toLowerCase()) ||
      (c.company && c.company.toLowerCase().includes(query.toLowerCase())) ||
      c.email.toLowerCase().includes(query.toLowerCase())
  );

  const handleCreateContact = async (e: React.FormEvent) => {
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
        setContacts((prev) => [res.contact, ...prev]);
      }
      setModalOpen(false);
      setFullName('');
      setEmail('');
      setPhone('');
      setCompany('');
      setJobTitle('');
      setNotes('');
    } catch (err) {
      console.error('Error creating contact:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (!confirm(locale === 'ar' ? 'هل أنت متأكد من حذف هذا العميل؟' : 'Are you sure you want to delete this contact?')) {
      return;
    }
    setContacts((prev) => prev.filter((c) => c.id !== id));
    try {
      await deleteContactAction(id);
    } catch (err) {
      console.error('Failed to delete contact:', err);
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
            {locale === 'ar'
              ? 'دليل جهات الاتصال للشركات الكبرى، وكالات الدعاية والإعلان، وصناع القرار في الخليج.'
              : 'Enterprise client directory, agency partners, and executive decision-makers.'}
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setModalOpen(true)}
          className="gap-1.5 shadow-lg shadow-[#09937F]/20 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t.actions.newContact}</span>
        </Button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute start-3.5 top-3.5 text-[#9EADA9]" />
        <Input
          placeholder={t.actions.search}
          className="ps-10"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Contacts Grid */}
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
                    <div className="text-sm font-bold text-white">{c.full_name}</div>
                    <div className="text-xs text-[#09937F]">
                      {c.job_title || (locale === 'ar' ? 'شريك عميل' : 'Client Partner')}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteContact(c.id)}
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
                    <a href={`mailto:${c.email}`} className="hover:text-white transition-colors">
                      {c.email}
                    </a>
                  </div>
                )}
                {c.phone && (
                  <div className="flex items-center gap-2 font-mono">
                    <Phone className="w-3.5 h-3.5 text-[#09937F]" />
                    <a href={`tel:${c.phone}`} className="hover:text-white transition-colors">
                      {c.phone}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {c.notes && (
              <div className="text-[11px] text-[#9EADA9]/70 pt-2 border-t border-white/5 line-clamp-2">
                {c.notes}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* New Contact Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t.actions.newContact}
      >
        <form onSubmit={handleCreateContact} className="space-y-4 text-xs">
          <div>
            <label className="text-xs text-white mb-1.5 block">
              {locale === 'ar' ? 'الاسم الكامل' : 'Full Name'} *
            </label>
            <Input
              required
              placeholder={locale === 'ar' ? 'حمد الرميحي' : 'Hamad Alromaihi'}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-white mb-1.5 block">
                {locale === 'ar' ? 'الشركة أو المؤسسة' : 'Company'}
              </label>
              <Input
                placeholder="Batelco"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs text-white mb-1.5 block">
                {locale === 'ar' ? 'المسمى الوظيفي' : 'Job Title'}
              </label>
              <Input
                placeholder={locale === 'ar' ? 'مدير التسويق' : 'Head of Marketing'}
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-white mb-1.5 block">
                {locale === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
              </label>
              <Input
                type="email"
                placeholder="contact@company.bh"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs text-white mb-1.5 block">
                {locale === 'ar' ? 'رقم الهاتف' : 'Phone Number'}
              </label>
              <Input
                placeholder="+973 3900 0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-white mb-1.5 block">
              {locale === 'ar' ? 'تصنيف جهة الاتصال' : 'Contact Type'}
            </label>
            <Select
              value={contactType}
              onChange={(e) => setContactType(e.target.value as any)}
            >
              <option value="client" className="bg-[#0B1210] text-white">
                {locale === 'ar' ? 'عميل تجاري مباشر' : 'Direct Commercial Client'}
              </option>
              <option value="agency" className="bg-[#0B1210] text-white">
                {locale === 'ar' ? 'وكالة دعاية وإعلان' : 'Advertising Agency'}
              </option>
              <option value="vendor" className="bg-[#0B1210] text-white">
                {locale === 'ar' ? 'مورد أو مزود خدمة' : 'Vendor / Supplier'}
              </option>
              <option value="freelancer" className="bg-[#0B1210] text-white">
                {locale === 'ar' ? 'طاقم إنتاج مستقل' : 'Crew Freelancer'}
              </option>
            </Select>
          </div>

          <div>
            <label className="text-xs text-white mb-1.5 block">
              {locale === 'ar' ? 'ملاحظات إضافية' : 'Notes'}
            </label>
            <Input
              placeholder={locale === 'ar' ? 'ملاحظات حول صانع القرار في المشروع...' : 'Notes about decision maker...'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(false)}
            >
              {t.actions.cancel}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={saving}
              className="gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{t.actions.save}</span>
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
