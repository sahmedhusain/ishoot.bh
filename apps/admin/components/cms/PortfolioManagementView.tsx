'use client';

import * as React from 'react';
import type { PortfolioItem, PortfolioCategory } from '@ishoot/database/types';
import { Button, Card, Badge, Modal, Input, Select } from '@ishoot/ui';
import { Plus, Eye, Trash2, Star, CheckCircle2, Film, Filter } from 'lucide-react';
import { useAdminLocale } from '../../hooks/useAdminLocale';
import { togglePortfolioFeaturedAction, deletePortfolioItemAction, createPortfolioItemAction } from '../../app/actions/cms';

interface PortfolioManagementViewProps {
  initialItems: PortfolioItem[];
  categories: PortfolioCategory[];
}

export function PortfolioManagementView({ initialItems, categories }: PortfolioManagementViewProps) {
  const { t, locale } = useAdminLocale();
  const [items, setItems] = React.useState<PortfolioItem[]>(initialItems);
  const [selectedCat, setSelectedCat] = React.useState<string>('all');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  // Form state
  const [titleEn, setTitleEn] = React.useState('');
  const [titleAr, setTitleAr] = React.useState('');
  const [slug, setSlug] = React.useState('');
  const [clientName, setClientName] = React.useState('');
  const [year, setYear] = React.useState<number>(new Date().getFullYear());
  const [aspectRatio, setAspectRatio] = React.useState('16:9');
  const [thumbnailUrl, setThumbnailUrl] = React.useState('');
  const [previewVideoUrl, setPreviewVideoUrl] = React.useState('');
  const [categoryId, setCategoryId] = React.useState('');
  const [isFeatured, setIsFeatured] = React.useState(false);

  const filteredItems = selectedCat === 'all'
    ? items
    : items.filter((item) => item.category_id === selectedCat);

  const handleToggleFeatured = async (id: string, currentFeatured: boolean) => {
    const nextFeatured = !currentFeatured;
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, is_featured: nextFeatured } : i))
    );
    try {
      await togglePortfolioFeaturedAction(id, nextFeatured);
    } catch (err) {
      console.error('Failed to toggle featured status:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(locale === 'ar' ? 'هل أنت متأكد من حذف هذا العمل من الأرشيف؟' : 'Are you sure you want to delete this project?')) {
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      await deletePortfolioItemAction(id);
    } catch (err) {
      console.error('Failed to delete portfolio item:', err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleEn && !titleAr) return;
    setSaving(true);

    const generatedSlug = slug || (titleEn || titleAr).toLowerCase().replace(/[^a-z0-9]+/g, '-');

    try {
      const res = await createPortfolioItemAction({
        title_en: titleEn || titleAr,
        title_ar: titleAr || titleEn,
        slug: generatedSlug,
        client_name: clientName || 'Private Client',
        year,
        aspect_ratio: aspectRatio,
        thumbnail_url: thumbnailUrl || '/images/portfolio/sample.jpg',
        preview_video_url: previewVideoUrl || undefined,
        category_id: categoryId || undefined,
        is_featured: isFeatured,
      });

      if (res.project) {
        setItems((prev) => [res.project, ...prev]);
      }
      setIsModalOpen(false);
      // Reset
      setTitleEn('');
      setTitleAr('');
      setSlug('');
      setClientName('');
      setThumbnailUrl('');
      setPreviewVideoUrl('');
      setIsFeatured(false);
    } catch (err) {
      console.error('Failed to create portfolio project:', err);
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
            {t.cms.portfolioTitle}
          </h1>
          <p className="text-xs text-[#9EADA9] mt-1">
            {locale === 'ar'
              ? 'أرشيف الأفلام السينمائية والإعلانات التجارية، ملفات الماستر، ونسب العرض.'
              : 'Cinematic commercials, narrative films, aspect ratios, and credit dossiers.'}
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          className="gap-1.5 self-start sm:self-auto"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t.actions.newProject}</span>
        </Button>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <Filter className="w-4 h-4 text-[#9EADA9] shrink-0" />
        <button
          onClick={() => setSelectedCat('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
            selectedCat === 'all'
              ? 'bg-[#09937F] text-white shadow-lg shadow-[#09937F]/20'
              : 'bg-[#0B1210] border border-white/10 text-[#9EADA9] hover:text-white'
          }`}
        >
          {t.actions.all}
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCat(c.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCat === c.id
                ? 'bg-[#09937F] text-white shadow-lg shadow-[#09937F]/20'
                : 'bg-[#0B1210] border border-white/10 text-[#9EADA9] hover:text-white'
            }`}
          >
            {locale === 'ar' ? c.name_ar : c.name_en}
          </button>
        ))}
      </div>

      {/* Project Table */}
      <div className="bg-[#0B1210] border border-white/10 rounded-3xl overflow-hidden shadow-xl">
        <table className="w-full text-start text-xs">
          <thead className="bg-[#050807] border-b border-white/10 text-[#9EADA9] uppercase font-mono tracking-wider">
            <tr>
              <th className="p-4 text-start">{locale === 'ar' ? 'المشروع / العميل' : 'Project / Client'}</th>
              <th className="p-4 text-start">{locale === 'ar' ? 'نسبة العرض' : 'Aspect Ratio'}</th>
              <th className="p-4 text-start">{locale === 'ar' ? 'سنة الإنتاج' : 'Year'}</th>
              <th className="p-4 text-center">{t.cms.featured}</th>
              <th className="p-4 text-end">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredItems.map((item) => (
              <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={item.thumbnail_url}
                      alt={locale === 'ar' ? item.title_ar : item.title_en}
                      className="w-16 h-10 rounded-xl object-cover bg-black shrink-0 border border-white/10"
                    />
                    <div>
                      <div className="font-bold text-white text-sm">
                        {locale === 'ar' ? item.title_ar : item.title_en}
                      </div>
                      <div className="text-[#09937F] font-mono text-[11px]">{item.client_name}</div>
                    </div>
                  </div>
                </td>
                <td className="p-4 font-mono text-[#9EADA9]">
                  <Badge variant="outline">{item.aspect_ratio}</Badge>
                </td>
                <td className="p-4 font-mono text-white">{item.year}</td>
                <td className="p-4 text-center">
                  <button
                    onClick={() => handleToggleFeatured(item.id, item.is_featured)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      item.is_featured
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-white/5 text-[#9EADA9]/40 hover:text-[#9EADA9]'
                    }`}
                    title={item.is_featured ? (locale === 'ar' ? 'إلغاء التمييز' : 'Unfeature') : (locale === 'ar' ? 'تمييز في الواجهة' : 'Feature')}
                  >
                    <Star className="w-4 h-4 fill-current" />
                  </button>
                </td>
                <td className="p-4 text-end space-x-2">
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors inline-flex"
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

      {/* Modal: New Project */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t.actions.newProject}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-white mb-1.5 block">
                {locale === 'ar' ? 'عنوان المشروع بالعربية' : 'Project Title (Arabic)'}
              </label>
              <Input
                value={titleAr}
                onChange={(e) => setTitleAr(e.target.value)}
                placeholder="فيلم المنامة: نبض العاصمة"
                required
              />
            </div>
            <div>
              <label className="text-xs text-white mb-1.5 block">
                {locale === 'ar' ? 'عنوان المشروع بالإنجليزية' : 'Project Title (English)'}
              </label>
              <Input
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                placeholder="Manama: Pulse of Bahrain"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-white mb-1.5 block">
                {locale === 'ar' ? 'اسم العميل' : 'Client Name'}
              </label>
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="BTEA / Ministry of Tourism"
                required
              />
            </div>
            <div>
              <label className="text-xs text-white mb-1.5 block">
                {locale === 'ar' ? 'التصنيف' : 'Category'}
              </label>
              <Select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="" className="bg-[#0B1210] text-white">
                  {locale === 'ar' ? 'اختر تصنيفاً' : 'Select Category'}
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#0B1210] text-white">
                    {locale === 'ar' ? c.name_ar : c.name_en}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-white mb-1.5 block">
                {locale === 'ar' ? 'نسبة العرض' : 'Aspect Ratio'}
              </label>
              <Select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
              >
                <option value="16:9" className="bg-[#0B1210] text-white">16:9 (Standard UHD)</option>
                <option value="2.39:1" className="bg-[#0B1210] text-white">2.39:1 (Anamorphic Scope)</option>
                <option value="9:16" className="bg-[#0B1210] text-white">9:16 (Vertical Social)</option>
                <option value="4:3" className="bg-[#0B1210] text-white">4:3 (Academy)</option>
              </Select>
            </div>
            <div>
              <label className="text-xs text-white mb-1.5 block">
                {locale === 'ar' ? 'سنة الإنتاج' : 'Production Year'}
              </label>
              <Input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="text-xs text-white mb-1.5 block">
                {locale === 'ar' ? 'معرّف الرابط (Slug)' : 'URL Slug'}
              </label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="manama-film"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-white mb-1.5 block">
                {locale === 'ar' ? 'رابط صورة الغلاف (Thumbnail)' : 'Thumbnail Image URL'}
              </label>
              <Input
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="/images/portfolio/manama.jpg"
                required
              />
            </div>
            <div>
              <label className="text-xs text-white mb-1.5 block">
                {locale === 'ar' ? 'رابط معاينة الفيديو' : 'Preview Video URL'}
              </label>
              <Input
                value={previewVideoUrl}
                onChange={(e) => setPreviewVideoUrl(e.target.value)}
                placeholder="/videos/manama-preview.mp4"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center gap-2">
            <input
              type="checkbox"
              id="isFeatured"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="w-4 h-4 rounded text-[#09937F] bg-white/5 border-white/10"
            />
            <label htmlFor="isFeatured" className="text-xs text-white">
              {t.cms.featured}
            </label>
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
