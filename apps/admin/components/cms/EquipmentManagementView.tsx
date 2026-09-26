'use client';

import * as React from 'react';
import type { StudioEquipment } from '@ishoot/database/types';
import { Button, Card, Badge, Modal, Input, Select, CurrencyDisplay } from '@ishoot/ui';
import { Plus, Trash2, Camera, CheckCircle2, Filter } from 'lucide-react';
import { useAdminLocale } from '../../hooks/useAdminLocale';
import { deleteEquipmentAction, createEquipmentAction } from '../../app/actions/cms';

interface EquipmentManagementViewProps {
  initialEquipment: StudioEquipment[];
}

export function EquipmentManagementView({ initialEquipment }: EquipmentManagementViewProps) {
  const { t, locale } = useAdminLocale();
  const [equipment, setEquipment] = React.useState<StudioEquipment[]>(initialEquipment);
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  // Form state
  const [modelName, setModelName] = React.useState('');
  const [nameAr, setNameAr] = React.useState('');
  const [category, setCategory] = React.useState<StudioEquipment['category']>('cameras');
  const [brand, setBrand] = React.useState('');
  const [specification, setSpecification] = React.useState('');
  const [dailyRate, setDailyRate] = React.useState<number>(150);
  const [quantity, setQuantity] = React.useState<number>(1);

  const categories = [
    { value: 'all', label: t.actions.all },
    { value: 'cameras', label: locale === 'ar' ? 'كاميرات سينمائية' : 'Cinema Cameras' },
    { value: 'lenses', label: locale === 'ar' ? 'عدسات بصرية' : 'Optics & Lenses' },
    { value: 'lighting', label: locale === 'ar' ? 'إضاءة واستوديو' : 'Lighting Packages' },
    { value: 'audio', label: locale === 'ar' ? 'صوتيات وتسجيل' : 'Sound & Audio' },
    { value: 'grip', label: locale === 'ar' ? 'معدات حركة ومساند' : 'Grip & Rigs' },
    { value: 'drones', label: locale === 'ar' ? 'طائرات درونز جوية' : 'Aerial Drones' },
  ];

  const filteredItems = selectedCategory === 'all'
    ? equipment
    : equipment.filter((eq) => eq.category === selectedCategory);

  const handleDelete = async (id: string) => {
    if (!confirm(locale === 'ar' ? 'هل أنت متأكد من حذف هذه المعدة؟' : 'Are you sure you want to delete this equipment?')) {
      return;
    }
    setEquipment((prev) => prev.filter((e) => e.id !== id));
    try {
      await deleteEquipmentAction(id);
    } catch (err) {
      console.error('Failed to delete equipment:', err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelName) return;
    setSaving(true);

    try {
      const res = await createEquipmentAction({
        category,
        model_name: modelName,
        name_ar: nameAr || modelName,
        brand: brand || undefined,
        specification: specification || undefined,
        daily_rate_bhd: dailyRate,
        quantity,
      });

      if (res.item) {
        setEquipment((prev) => [...prev, res.item]);
      }
      setIsModalOpen(false);
      setModelName('');
      setNameAr('');
      setBrand('');
      setSpecification('');
      setDailyRate(150);
      setQuantity(1);
    } catch (err) {
      console.error('Failed to create equipment:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">
            {t.cms.equipmentTitle}
          </h1>
          <p className="text-xs text-[#9EADA9] mt-1">
            {locale === 'ar'
              ? 'أصول الاستوديو من كاميرات، عدسات، وحدات إضاءة، ومعدات تصوير متخصصة مع أسعار الإيجار اليومي.'
              : 'Studio-owned cinema cameras, optical lenses, lighting packages, and soundstage gear with daily rental rates.'}
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          className="gap-1.5 self-start sm:self-auto"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t.actions.addEquipment}</span>
        </Button>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <Filter className="w-4 h-4 text-[#9EADA9] shrink-0" />
        {categories.map((c) => (
          <button
            key={c.value}
            onClick={() => setSelectedCategory(c.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === c.value
                ? 'bg-[#09937F] text-white shadow-lg shadow-[#09937F]/20'
                : 'bg-[#0B1210] border border-white/10 text-[#9EADA9] hover:text-white hover:border-white/20'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Equipment Table */}
      <div className="bg-[#0B1210] border border-white/10 rounded-3xl overflow-hidden shadow-xl">
        <table className="w-full text-start text-xs">
          <thead className="bg-[#050807] border-b border-white/10 text-[#9EADA9] uppercase font-mono tracking-wider">
            <tr>
              <th className="p-4 text-start">{locale === 'ar' ? 'التصنيف' : 'Category'}</th>
              <th className="p-4 text-start">{locale === 'ar' ? 'اسم المعدة / الموديل' : 'Model / Item Name'}</th>
              <th className="p-4 text-start">{locale === 'ar' ? 'المواصفات الفنية' : 'Technical Specifications'}</th>
              <th className="p-4 text-center">{locale === 'ar' ? 'الكمية' : 'Qty'}</th>
              <th className="p-4 text-end">{t.cms.dailyRate}</th>
              <th className="p-4 text-end">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredItems.map((eq) => (
              <tr key={eq.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="p-4">
                  <Badge variant="emerald">{eq.category.toUpperCase()}</Badge>
                </td>
                <td className="p-4">
                  <div className="font-bold text-white text-sm">
                    {locale === 'ar' ? (eq.name_ar || eq.model_name) : eq.model_name}
                  </div>
                  {eq.brand && <div className="text-[11px] font-mono text-[#09937F]">{eq.brand}</div>}
                </td>
                <td className="p-4 text-[#9EADA9] max-w-xs truncate">
                  {eq.specification || '—'}
                </td>
                <td className="p-4 text-center font-mono text-white">
                  {eq.quantity || 1}
                </td>
                <td className="p-4 text-end font-mono font-bold text-[#09937F]">
                  {eq.daily_rate_bhd ? (
                    <CurrencyDisplay amount={eq.daily_rate_bhd} currency="BHD" />
                  ) : (
                    '—'
                  )}
                </td>
                <td className="p-4 text-end">
                  <button
                    onClick={() => handleDelete(eq.id)}
                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                    title={t.actions.delete}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal: Add Equipment */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t.actions.addEquipment}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-white mb-1.5 block">
                {locale === 'ar' ? 'الموديل بالإنجليزية' : 'Model Name (English)'}
              </label>
              <Input
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="ARRI ALEXA Mini LF"
                required
              />
            </div>
            <div>
              <label className="text-xs text-white mb-1.5 block">
                {locale === 'ar' ? 'الاسم بالعربية' : 'Item Name (Arabic)'}
              </label>
              <Input
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                placeholder="كاميرا آري أليكسا ميني إل إف"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-white mb-1.5 block">
                {locale === 'ar' ? 'التصنيف' : 'Category'}
              </label>
              <Select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
              >
                <option value="cameras" className="bg-[#0B1210] text-white">{locale === 'ar' ? 'كاميرات سينمائية' : 'Cinema Cameras'}</option>
                <option value="lenses" className="bg-[#0B1210] text-white">{locale === 'ar' ? 'عدسات' : 'Lenses'}</option>
                <option value="lighting" className="bg-[#0B1210] text-white">{locale === 'ar' ? 'إضاءة' : 'Lighting'}</option>
                <option value="audio" className="bg-[#0B1210] text-white">{locale === 'ar' ? 'صوتيات' : 'Audio'}</option>
                <option value="grip" className="bg-[#0B1210] text-white">{locale === 'ar' ? 'مساند وحوامل' : 'Grip'}</option>
                <option value="drones" className="bg-[#0B1210] text-white">{locale === 'ar' ? 'درونز' : 'Drones'}</option>
              </Select>
            </div>
            <div>
              <label className="text-xs text-white mb-1.5 block">
                {locale === 'ar' ? 'الشركة المصنعة / العلامة' : 'Brand / Manufacturer'}
              </label>
              <Input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="ARRI"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-white mb-1.5 block">
              {locale === 'ar' ? 'المواصفات الفنية' : 'Technical Specifications'}
            </label>
            <Input
              value={specification}
              onChange={(e) => setSpecification(e.target.value)}
              placeholder="Large Format 4.5K Sensor, LPL Mount, ARRIRAW & ProRes"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-white mb-1.5 block">
                {locale === 'ar' ? 'سعر الإيجار اليومي (BHD)' : 'Daily Rate (BHD)'}
              </label>
              <Input
                type="number"
                step="0.001"
                value={dailyRate}
                onChange={(e) => setDailyRate(Number(e.target.value))}
                required
              />
            </div>
            <div>
              <label className="text-xs text-white mb-1.5 block">
                {locale === 'ar' ? 'الكمية المتوفرة' : 'Available Quantity'}
              </label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                min={1}
                required
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
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
