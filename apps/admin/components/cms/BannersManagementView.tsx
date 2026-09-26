'use client';

import * as React from 'react';
import type { HeroBanner } from '@ishoot/database/types';
import { Button, Card, Badge, Modal, Input, Select } from '@ishoot/ui';
import { Plus, Eye, EyeOff, Film, Image as ImageIcon, Trash2, CheckCircle2 } from 'lucide-react';
import { useAdminLocale } from '../../hooks/useAdminLocale';
import { toggleBannerStatusAction, deleteBannerAction, createBannerAction } from '../../app/actions/cms';

interface BannersManagementViewProps {
  initialBanners: HeroBanner[];
}

export function BannersManagementView({ initialBanners }: BannersManagementViewProps) {
  const { t, locale, isRTL } = useAdminLocale();
  const [banners, setBanners] = React.useState<HeroBanner[]>(initialBanners);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  // Form state
  const [titleEn, setTitleEn] = React.useState('');
  const [titleAr, setTitleAr] = React.useState('');
  const [subtitleEn, setSubtitleEn] = React.useState('');
  const [subtitleAr, setSubtitleAr] = React.useState('');
  const [mediaType, setMediaType] = React.useState<'video' | 'image'>('video');
  const [mediaUrl, setMediaUrl] = React.useState('');
  const [posterUrl, setPosterUrl] = React.useState('');

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    setBanners((prev) =>
      prev.map((b) => (b.id === id ? { ...b, is_active: nextStatus } : b))
    );
    try {
      await toggleBannerStatusAction(id, nextStatus);
    } catch (err) {
      console.error('Failed to toggle banner status:', err);
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!confirm(locale === 'ar' ? 'هل أنت متأكد من حذف هذا البنر؟' : 'Are you sure you want to delete this banner?')) {
      return;
    }
    setBanners((prev) => prev.filter((b) => b.id !== id));
    try {
      await deleteBannerAction(id);
    } catch (err) {
      console.error('Failed to delete banner:', err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleEn && !titleAr) return;
    setSaving(true);

    try {
      const res = await createBannerAction({
        title_en: titleEn || titleAr,
        title_ar: titleAr || titleEn,
        subtitle_en: subtitleEn || undefined,
        subtitle_ar: subtitleAr || undefined,
        media_type: mediaType,
        media_url: mediaUrl || '/banners/hero-video.mp4',
        poster_url: posterUrl || '/banners/poster.jpg',
      });

      if (res.banner) {
        setBanners((prev) => [...prev, res.banner]);
      }
      setIsModalOpen(false);
      // Reset form
      setTitleEn('');
      setTitleAr('');
      setSubtitleEn('');
      setSubtitleAr('');
      setMediaUrl('');
      setPosterUrl('');
    } catch (err) {
      console.error('Failed to create banner:', err);
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
            {t.cms.bannersTitle}
          </h1>
          <p className="text-xs text-[#9EADA9] mt-1">
            {locale === 'ar'
              ? 'إدارة عروض الفيديو الرئيسية، النصوص البصرية، وروابط الحجز في الواجهة الأمامية للموقع.'
              : 'Manage hero video reels, typography overlays, and booking actions on the public homepage.'}
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          className="gap-1.5 self-start sm:self-auto"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t.actions.addBanner}</span>
        </Button>
      </div>

      {/* Banner Cards Grid */}
      <div className="grid grid-cols-1 gap-4">
        {banners.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-[#0B1210] border border-white/10 text-[#9EADA9]">
            {locale === 'ar' ? 'لا توجد بنرات حالياً في قاعدة البيانات.' : 'No hero banners currently in database.'}
          </div>
        ) : (
          banners.map((banner) => (
            <Card
              key={banner.id}
              className="p-5 bg-[#0B1210] border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-white/20 transition-all rounded-3xl"
            >
              {/* Left: Thumbnail & Details */}
              <div className="flex items-center gap-4">
                <div className="relative w-36 aspect-video rounded-xl overflow-hidden bg-black border border-white/10 shrink-0">
                  <img
                    src={banner.poster_url || banner.media_url}
                    alt={locale === 'ar' ? banner.title_ar : banner.title_en}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-mono text-white flex items-center gap-1">
                    {banner.media_type === 'video' ? <Film className="w-2.5 h-2.5" /> : <ImageIcon className="w-2.5 h-2.5" />}
                    <span>{banner.media_type.toUpperCase()}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">
                      {locale === 'ar' ? banner.title_ar : banner.title_en}
                    </h3>
                    <Badge variant={banner.is_active ? 'emerald' : 'outline'}>
                      {banner.is_active ? t.cms.live : t.cms.hidden}
                    </Badge>
                  </div>
                  <div className="text-xs text-[#09937F] font-mono">
                    {locale === 'ar' ? banner.title_en : banner.title_ar}
                  </div>
                  <div className="text-xs text-[#9EADA9] max-w-lg line-clamp-1">
                    {locale === 'ar' ? (banner.subtitle_ar || banner.subtitle_en) : (banner.subtitle_en || banner.subtitle_ar)}
                  </div>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleToggleStatus(banner.id, banner.is_active)}
                  className="gap-1.5"
                >
                  {banner.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{banner.is_active ? (locale === 'ar' ? 'إخفاء' : 'Hide') : (locale === 'ar' ? 'نشر' : 'Publish')}</span>
                </Button>

                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDeleteBanner(banner.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Modal: Add New Banner */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t.actions.addBanner}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-white mb-1.5 block">
                {locale === 'ar' ? 'العنوان الرئيسي (بالعربية)' : 'Main Title (Arabic)'}
              </label>
              <Input
                value={titleAr}
                onChange={(e) => setTitleAr(e.target.value)}
                placeholder="التميز السينمائي الخليجي"
                required
              />
            </div>
            <div>
              <label className="text-xs text-white mb-1.5 block">
                {locale === 'ar' ? 'العنوان بالإنجليزية' : 'Title (English)'}
              </label>
              <Input
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                placeholder="Khaleeji Cinema Craft"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-white mb-1.5 block">
                {locale === 'ar' ? 'الوصف الفرعي (بالعربية)' : 'Subtitle (Arabic)'}
              </label>
              <Input
                value={subtitleAr}
                onChange={(e) => setSubtitleAr(e.target.value)}
                placeholder="أحدث تقنيات الإضاءة السينمائية وكاميرات ARRI"
              />
            </div>
            <div>
              <label className="text-xs text-white mb-1.5 block">
                {locale === 'ar' ? 'الوصف الفرعي (بالإنجليزية)' : 'Subtitle (English)'}
              </label>
              <Input
                value={subtitleEn}
                onChange={(e) => setSubtitleEn(e.target.value)}
                placeholder="State of the art ARRI cinema gear"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-white mb-1.5 block">
                {locale === 'ar' ? 'نوع الوسائط' : 'Media Type'}
              </label>
              <Select
                value={mediaType}
                onChange={(e) => setMediaType(e.target.value as any)}
              >
                <option value="video" className="bg-[#0B1210] text-white">
                  {locale === 'ar' ? 'مقطع فيديو (Reel)' : 'Video Reel'}
                </option>
                <option value="image" className="bg-[#0B1210] text-white">
                  {locale === 'ar' ? 'صورة عالية الدقة' : 'High-Res Image'}
                </option>
              </Select>
            </div>
            <div>
              <label className="text-xs text-white mb-1.5 block">
                {locale === 'ar' ? 'رابط ملف الوسائط' : 'Media URL'}
              </label>
              <Input
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="/banners/reel.mp4"
              />
            </div>
            <div>
              <label className="text-xs text-white mb-1.5 block">
                {locale === 'ar' ? 'رابط صورة المعاينة (Poster)' : 'Poster Image URL'}
              </label>
              <Input
                value={posterUrl}
                onChange={(e) => setPosterUrl(e.target.value)}
                placeholder="/banners/poster.jpg"
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
