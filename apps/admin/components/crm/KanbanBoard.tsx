'use client';

import * as React from 'react';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import type { CRMDeal, CRMContact, DealStage } from '@ishoot/database/types';
import { updateDealStageAction, createCRMDealAction } from '../../app/actions/crm';
import { KanbanColumn } from './KanbanColumn';
import { Button, Modal, Input, Select } from '@ishoot/ui';
import { Plus } from 'lucide-react';
import { useAdminLocale } from '../../hooks/useAdminLocale';

interface KanbanBoardProps {
  initialDeals: CRMDeal[];
  contacts?: CRMContact[];
}

export function KanbanBoard({ initialDeals, contacts = [] }: KanbanBoardProps) {
  const { t, locale } = useAdminLocale();
  const [deals, setDeals] = React.useState<CRMDeal[]>(initialDeals);
  const [newDealModalOpen, setNewDealModalOpen] = React.useState(false);

  // New Deal Form State
  const [title, setTitle] = React.useState('');
  const [value, setValue] = React.useState<number>(5000);
  const [stage, setStage] = React.useState<DealStage>('lead');
  const [contactId, setContactId] = React.useState('');
  const [shootDate, setShootDate] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const columns: Array<{ stage: DealStage; label: string; color: string }> = [
    { stage: 'lead', label: t.stages.lead, color: '#3B82F6' },
    { stage: 'proposal_sent', label: t.stages.proposal_sent, color: '#F59E0B' },
    { stage: 'contract_signed', label: t.stages.contract_signed, color: '#8B5CF6' },
    { stage: 'production', label: t.stages.production, color: '#09937F' },
    { stage: 'post_production', label: t.stages.post_production, color: '#A855F7' },
    { stage: 'delivered', label: t.stages.delivered, color: '#10B981' },
    { stage: 'closed_won', label: t.stages.closed_won, color: '#059669' },
    { stage: 'closed_lost', label: t.stages.closed_lost, color: '#E11D48' },
  ];

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const dealId = active.id as string;
    const targetStage = over.id as DealStage;

    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, stage: targetStage } : d))
    );

    try {
      await updateDealStageAction(dealId, targetStage);
    } catch (err) {
      console.error('Failed to update deal stage in DB:', err);
    }
  };

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    setSaving(true);

    try {
      const res = await createCRMDealAction({
        title,
        value,
        stage,
        contact_id: contactId || undefined,
        shoot_date: shootDate || undefined,
      });

      if (res.deal) {
        setDeals((prev) => [res.deal as CRMDeal, ...prev]);
        setNewDealModalOpen(false);
        setTitle('');
        setValue(5000);
        setShootDate('');
      }
    } catch (err) {
      console.error('Error creating deal:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">
            {t.nav.deals}
          </h1>
          <p className="text-xs text-[#9EADA9] mt-1">
            {locale === 'ar'
              ? 'متابعة خط صفقات الإنتاج التفاعلي (Kanban) مع التحديث اللحظي لحالات المشاريع في قاعدة البيانات.'
              : 'Interactive Kanban workspace with drag-and-drop live database updates.'}
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setNewDealModalOpen(false)}
          className="hidden"
        />
        <Button
          variant="primary"
          size="sm"
          onClick={() => setNewDealModalOpen(true)}
          className="gap-1.5 shrink-0 shadow-lg shadow-[#09937F]/20"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t.actions.newDeal}</span>
        </Button>
      </div>

      <DndContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-6 select-none">
          {columns.map((col) => (
            <KanbanColumn
              key={col.stage}
              stage={col.stage}
              label={col.label}
              deals={deals.filter((d) => d.stage === col.stage)}
              accentColor={col.color}
            />
          ))}
        </div>
      </DndContext>

      {/* New Deal Modal */}
      <Modal
        isOpen={newDealModalOpen}
        onClose={() => setNewDealModalOpen(false)}
        title={t.actions.newDeal}
      >
        <form onSubmit={handleCreateDeal} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="text-[#9EADA9] font-medium">
              {locale === 'ar' ? 'عنوان الصفقة *' : 'Deal Title *'}
            </label>
            <Input
              required
              placeholder={locale === 'ar' ? 'مثال: تصوير إعلان العيد الوطني' : 'e.g. Batelco National Day Film'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[#9EADA9] font-medium">
                {locale === 'ar' ? 'القيمة (د.ب) *' : 'Value (BHD) *'}
              </label>
              <Input
                type="number"
                step="0.001"
                required
                value={value}
                onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
                className="font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[#9EADA9] font-medium">
                {locale === 'ar' ? 'مرحلة الصفقة' : 'Pipeline Stage'}
              </label>
              <Select
                value={stage}
                onChange={(e) => setStage(e.target.value as DealStage)}
              >
                {columns.map((col) => (
                  <option key={col.stage} value={col.stage}>
                    {col.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[#9EADA9] font-medium">
                {locale === 'ar' ? 'العميل أو الشريك' : 'Client / Contact'}
              </label>
              <Select
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
              >
                <option value="">
                  {locale === 'ar' ? 'اختر عميلاً أو اتركه فارغاً' : 'Select or leave blank'}
                </option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company || c.full_name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[#9EADA9] font-medium">
                {locale === 'ar' ? 'تاريخ التصوير' : 'Shoot Date'}
              </label>
              <Input
                type="date"
                value={shootDate}
                onChange={(e) => setShootDate(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/10">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setNewDealModalOpen(false)}
            >
              {t.actions.cancel}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={saving}
            >
              {saving
                ? locale === 'ar' ? 'جارٍ الحفظ...' : 'Saving...'
                : t.actions.save}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
