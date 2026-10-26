"use client";
import { errorMessage } from "../../lib/error-text";
import { ROUTES } from "../../constants/routes";
import {ContentImage} from "../shared/ContentImage";
import Link from "next/link";

import * as React from "react";
import { AssetUrlInput } from "../shared/AssetUrlInput";
import type { HeroBanner } from "@platform/database/types";
import {
  Button,
  Card,
  Badge,
  Modal,
  Input,
  Select,
  ConfirmDialog,
} from "@platform/ui";
import {
  Plus,
  Eye,
  EyeOff,
  Film,
  Image as ImageIcon,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { websiteMedia } from "../../lib/website-media";
import type { ContentLanguage } from "@platform/database/constants/languages";
import { LanguageFields } from "../setup/LanguageFields";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import {
  toggleBannerStatusAction,
  deleteBannerAction,
  createBannerAction,
  updateBannerContentAction,
} from "../../app/actions/cms";

interface BannersManagementViewProps {
  initialBanners: HeroBanner[];
  languages: readonly ContentLanguage[];
}

export function BannersManagementView({
  initialBanners,
  languages,
}: BannersManagementViewProps) {
  const {t, locale} = useAdminLocale();
  const [banners, setBanners] = React.useState<HeroBanner[]>(initialBanners);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(
    null,
  );
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState("");
  const [ctaEn, setCtaEn] = React.useState("");
  const [ctaAr, setCtaAr] = React.useState("");
  const [ctaLink, setCtaLink] = React.useState("");
  const [order, setOrder] = React.useState(0);
  const [saving, setSaving] = React.useState(false);

  const [titleEn, setTitleEn] = React.useState("");
  const [titleAr, setTitleAr] = React.useState("");
  const [subtitleEn, setSubtitleEn] = React.useState("");
  const [subtitleAr, setSubtitleAr] = React.useState("");
  const [mediaType, setMediaType] = React.useState<"video" | "image">("video");
  const [mediaUrl, setMediaUrl] = React.useState("");
  const [posterUrl, setPosterUrl] = React.useState("");

  function openEditor(banner?: HeroBanner) {
    setEditingId(banner?.id || null);
    setError("");
    setTitleEn(banner?.title_en || "");
    setTitleAr(banner?.title_ar || "");
    setSubtitleEn(banner?.subtitle_en || "");
    setSubtitleAr(banner?.subtitle_ar || "");
    setMediaType(banner?.media_type || "image");
    setMediaUrl(banner?.media_url || "");
    setPosterUrl(banner?.poster_url || "");
    setCtaEn(banner?.cta_label_en || "");
    setCtaAr(banner?.cta_label_ar || "");
    setCtaLink(banner?.cta_link || "");
    setOrder(banner?.display_order || 0);
    setIsModalOpen(true);
  }
  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    try {
      await toggleBannerStatusAction(id, nextStatus);
      setBanners((prev) =>
        prev.map((b) => (b.id === id ? { ...b, is_active: nextStatus } : b)),
      );
    } catch (err) {
      setError(t.bannersManagement.couldNotUpdateBannerPlease);
    }
  };

  const handleDeleteBanner = async (id: string) => {
    try {
      await deleteBannerAction(id);
      setBanners((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      setError(t.bannersManagement.couldNotDeleteBannerPlease);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleEn && !titleAr) return;
    if (!mediaUrl) return;
    setSaving(true);

    try {
      const data = {
        title_en: titleEn || titleAr,
        title_ar: titleAr || titleEn,
        subtitle_en: subtitleEn,
        subtitle_ar: subtitleAr,
        media_type: mediaType,
        media_url: mediaUrl,
        poster_url: posterUrl,
        cta_label_en: ctaEn,
        cta_label_ar: ctaAr,
        cta_link: ctaLink,
        display_order: order,
      };
      const res = editingId
        ? await updateBannerContentAction(editingId, data)
        : await createBannerAction(data);

      if (res.banner) {
        setBanners((prev) =>
          editingId
            ? prev.map((b) => (b.id === editingId ? res.banner : b))
            : [...prev, res.banner],
        );
      }
      setIsModalOpen(false);
      setTitleEn("");
      setTitleAr("");
      setSubtitleEn("");
      setSubtitleAr("");
      setMediaUrl("");
      setPosterUrl("");
    } catch (err) {
      setError(errorMessage(err, t, t.bannersManagement.couldNotSaveBanner));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {!isModalOpen && error && (
        <p role="alert" className="text-red-400">
          {error}
        </p>
      )}
      <Link
        href={ROUTES.cms.website}
        className="block text-sm text-primary dark:text-mint underline"
      >
        {t.bannersManagement.reviewAndPublishChangesIn}
      </Link>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink font-display">
            {t.cms.bannersTitle}
          </h1>
          <p className="text-xs text-ink-muted mt-1">
            {t.bannersView.subtitle}
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          className="gap-1.5 self-start sm:self-auto"
          onClick={() => openEditor()}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t.actions.addBanner}</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {banners.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-surface border border-ink/10 text-ink-muted">
            {t.bannersView.emptyState}
          </div>
        ) : (
          banners.map((banner) => (
            <Card
              key={banner.id}
              className="p-5 bg-surface border border-ink/10 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-ink/20 transition-all rounded-3xl"
            >
              <div className="flex items-center gap-4">
                <div className="relative w-36 aspect-video rounded-xl overflow-hidden bg-black border border-ink/10 shrink-0">
                  <ContentImage
                    src={websiteMedia(banner.poster_url || banner.media_url)}
                    alt={locale === "ar" ? banner.title_ar : banner.title_en}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1 start-1 px-1.5 py-0.5 rounded bg-black/70 text-[9px]  text-white flex items-center gap-1">
                    {banner.media_type === "video" ? (
                      <Film className="w-2.5 h-2.5" />
                    ) : (
                      <ImageIcon className="w-2.5 h-2.5" />
                    )}
                    <span>{banner.media_type.toUpperCase()}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-ink">
                      {locale === "ar" ? banner.title_ar : banner.title_en}
                    </h3>
                    <Badge variant={banner.is_active ? "emerald" : "outline"}>
                      {banner.is_active
                        ? t.bannersManagement.includedInDraft
                        : t.cms.hidden}
                    </Badge>
                  </div>
                  {languages.length > 1 ? (
                    <div className="text-xs text-accent ">
                      {locale === "ar" ? banner.title_en : banner.title_ar}
                    </div>
                  ) : null}
                  <div className="text-xs text-ink-muted max-w-lg line-clamp-1">
                    {locale === "ar"
                      ? banner.subtitle_ar || banner.subtitle_en
                      : banner.subtitle_en || banner.subtitle_ar}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => openEditor(banner)}
                >
                  {t.actions.edit}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    handleToggleStatus(banner.id, banner.is_active)
                  }
                  className="gap-1.5"
                >
                  {banner.is_active ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {banner.is_active
                      ? t.bannersView.hide
                      : t.bannersView.publish}
                  </span>
                </Button>

                <Button aria-label={t.actions.delete}
                  variant="danger"
                  size="sm"
                  onClick={() => setDeleteTargetId(banner.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      <Modal closeLabel={t.actions.close}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? t.actions.edit : t.actions.addBanner}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {error && (
            <p role="alert" className="text-red-400 text-sm">
              {error}
            </p>
          )}
          <p className="text-xs text-ink-muted">
            {t.bannersManagement.saveThenPublishFromThe}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <LanguageFields
              name="title"
              label={t.bannersView.titleLabel}
              languages={languages}
              required
              maxLength={500}
              placeholder={t.bannersView.titleEnPlaceholder}
              en={titleEn}
              ar={titleAr}
              onChange={(v) => { setTitleEn(v.en); setTitleAr(v.ar); }}
            />
            <LanguageFields
              name="subtitle"
              label={t.bannersView.subtitleLabel}
              languages={languages}
              maxLength={500}
              placeholder={t.bannersView.subtitleEnPlaceholder}
              en={subtitleEn}
              ar={subtitleAr}
              onChange={(v) => { setSubtitleEn(v.en); setSubtitleAr(v.ar); }}
            />
          </div>

          <div className="space-y-4">
            <div className="sm:max-w-xs">
              <label className="text-xs text-ink mb-1.5 block">
                {t.bannersView.mediaType}
              </label>
              <Select
                value={mediaType}
                onChange={(e) => setMediaType(e.target.value as any)}
              >
                <option value="video" className="bg-surface text-ink">
                  {t.bannersView.videoReel}
                </option>
                <option value="image" className="bg-surface text-ink">
                  {t.bannersView.highResImage}
                </option>
              </Select>
            </div>
            <div>
              <label className="text-xs text-ink mb-1.5 block">
                {t.bannersView.mediaUrl}
              </label>
              {mediaType === "image" ? (
                <AssetUrlInput
                  value={mediaUrl}
                  onChange={setMediaUrl}
                  resource="banners"
                  placeholder={t.bannersView.mediaUrlPlaceholder}
                  required
                />
              ) : (
                <Input
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder={t.bannersView.mediaUrlPlaceholder}
                  required
                />
              )}
            </div>
            <div>
              <label className="text-xs text-ink mb-1.5 block">
                {t.bannersView.posterUrl}
              </label>
              <AssetUrlInput
                value={posterUrl}
                onChange={setPosterUrl}
                resource="banners"
                placeholder={t.bannersView.posterUrlPlaceholder}
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <LanguageFields
              name="cta"
              label={t.bannersManagement.ctaLabel}
              languages={languages}
              maxLength={100}
              en={ctaEn}
              ar={ctaAr}
              onChange={(v) => { setCtaEn(v.en); setCtaAr(v.ar); }}
            />
            <label className="text-sm">
              {t.bannersManagement.ctaDestination}
              <Input
                value={ctaLink}
                onChange={(e) => setCtaLink(e.target.value)}
                placeholder={t.copy.routeExample}
              />
            </label>
            <label className="text-sm">
              {t.bannersManagement.displayOrder}
              <Input
                type="number"
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
              />
            </label>
          </div>
          <div className="pt-4 flex justify-end gap-3 border-t border-ink/10">
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

      <ConfirmDialog
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={async () => {
          if (deleteTargetId) {
            await handleDeleteBanner(deleteTargetId);
            setDeleteTargetId(null);
          }
        }}
        title={t.actions.delete}
        description={t.bannersView.confirmDelete}
        confirmLabel={t.actions.delete}
        cancelLabel={t.actions.cancel}
      />
    </div>
  );
}
