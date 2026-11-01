"use client";
import { DataTable } from "@platform/ui";
import { errorMessage } from "../../lib/error-text";
import { ROUTES } from "../../constants/routes";
import { ContentImage } from "../shared/ContentImage";
import Link from "next/link";

import * as React from "react";
import { AssetUrlInput } from "../shared/AssetUrlInput";
import type { PortfolioItem, PortfolioCategory } from "@platform/database/types";
import {
  Button, Badge,
  Modal,
  Input,
  Select,
  ConfirmDialog
} from "@platform/ui";
import {
  Plus, Trash2,
  Star,
  CheckCircle2, Filter
} from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { CurrencyDisplay } from "@platform/ui";
import type { ContentLanguage } from "@platform/database/constants/languages";
import type { CollectionField, CollectionLayout } from "@platform/database/website-presets";
import { LanguageFields } from "../setup/LanguageFields";
import {
  togglePortfolioFeaturedAction,
  deletePortfolioItemAction,
  createPortfolioItemAction,
  updatePortfolioContentAction,
} from "../../app/actions/cms";
import { PageHeader } from "../layout/PageHeader";

interface PortfolioManagementViewProps {
  initialItems: PortfolioItem[];
  categories: PortfolioCategory[];
  /** The website catalogue: its name, card layout and the item details its activity uses. */
  catalogue: { nameEn: string; nameAr: string; layout: CollectionLayout; fields: readonly CollectionField[]; currency: string };
  languages: readonly ContentLanguage[];
}

type Attribute = NonNullable<PortfolioItem["attributes"]>[number];

export function PortfolioManagementView({
  initialItems,
  categories,
  catalogue,
  languages,
}: PortfolioManagementViewProps) {
  const modalFormId = React.useId();

  const { t, locale } = useAdminLocale();
  const uses = (field: CollectionField) => catalogue.fields.includes(field);
  const media = catalogue.layout === "media";
  const [items, setItems] = React.useState<PortfolioItem[]>(initialItems);
  const [selectedCat, setSelectedCat] = React.useState<string>("all");
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(
    null,
  );
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState("");
  const [descriptionEn, setDescriptionEn] = React.useState("");
  const [descriptionAr, setDescriptionAr] = React.useState("");
  const [fullVideo, setFullVideo] = React.useState("");
  const [gallery, setGallery] = React.useState("");
  const [order, setOrder] = React.useState(0);
  const [saving, setSaving] = React.useState(false);

  const [titleEn, setTitleEn] = React.useState("");
  const [titleAr, setTitleAr] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [clientName, setClientName] = React.useState("");
  const [year, setYear] = React.useState<number>(new Date().getFullYear());
  const [aspectRatio, setAspectRatio] = React.useState("16:9");
  const [thumbnailUrl, setThumbnailUrl] = React.useState("");
  const [previewVideoUrl, setPreviewVideoUrl] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [isFeatured, setIsFeatured] = React.useState(false);
  const [subtitle, setSubtitle] = React.useState({ en: "", ar: "" });
  const [price, setPrice] = React.useState("");
  const [priceNote, setPriceNote] = React.useState({ en: "", ar: "" });
  const [location, setLocation] = React.useState("");
  const [externalUrl, setExternalUrl] = React.useState("");
  const [attributes, setAttributes] = React.useState<Attribute[]>([]);

  function openEditor(item?: PortfolioItem) {
    setEditingId(item?.id || null);
    setError("");
    setTitleEn(item?.title_en || "");
    setTitleAr(item?.title_ar || "");
    setSlug(item?.slug || "");
    setClientName(item?.client_name || "");
    setYear(item?.year || new Date().getFullYear());
    setAspectRatio(item?.aspect_ratio || "16:9");
    setThumbnailUrl(item?.thumbnail_url || "");
    setPreviewVideoUrl(item?.preview_video_url || "");
    setCategoryId(item?.category_id || "");
    setIsFeatured(item?.is_featured || false);
    setDescriptionEn(item?.description_en || "");
    setDescriptionAr(item?.description_ar || "");
    setFullVideo(item?.full_video_url || "");
    setGallery(item?.gallery_urls?.join("\n") || "");
    setOrder(item?.display_order || 0);
    setSubtitle({ en: item?.subtitle_en || "", ar: item?.subtitle_ar || "" });
    setPrice(item?.price !== undefined ? String(item.price) : "");
    setPriceNote({ en: item?.price_note_en || "", ar: item?.price_note_ar || "" });
    setLocation(item?.location || "");
    setExternalUrl(item?.external_url || "");
    setAttributes(item?.attributes ?? []);
    setIsModalOpen(true);
  }
  const filteredItems =
    selectedCat === "all"
      ? items
      : items.filter((item) => item.category_id === selectedCat);

  const handleToggleFeatured = async (id: string, currentFeatured: boolean) => {
    const nextFeatured = !currentFeatured;
    try {
      await togglePortfolioFeaturedAction(id, nextFeatured);
      setItems((prev) =>
        prev.map((i) =>
          i.id === id ? { ...i, is_featured: nextFeatured } : i,
        ),
      );
    } catch (err) {
      setError(t.portfolioManagement.couldNotUpdateProjectPlease);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePortfolioItemAction(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      setError(t.portfolioManagement.couldNotDeleteProjectPlease);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleEn && !titleAr) return;
    if (!thumbnailUrl || (uses("client") && media && !clientName)) return;
    setSaving(true);

    const generatedSlug =
      slug || (titleEn || titleAr).toLowerCase().replace(/[^a-z0-9]+/g, "-");

    try {
      const data = {
        title_en: titleEn || titleAr,
        title_ar: titleAr || titleEn,
        slug: generatedSlug,
        client_name: uses("client") ? clientName : "",
        year: uses("year") ? year : undefined,
        subtitle_en: subtitle.en,
        subtitle_ar: subtitle.ar,
        price: uses("price") && price.trim() ? Number(price) : undefined,
        price_note_en: priceNote.en,
        price_note_ar: priceNote.ar,
        location,
        external_url: externalUrl.trim(),
        attributes,
        aspect_ratio: aspectRatio,
        thumbnail_url: thumbnailUrl,
        preview_video_url: previewVideoUrl,
        category_id: categoryId,
        is_featured: isFeatured,
        description_en: descriptionEn,
        description_ar: descriptionAr,
        full_video_url: fullVideo,
        gallery_urls: gallery
          .split("\n")
          .map((url) => url.trim())
          .filter(Boolean),
        display_order: order,
      };
      const res = editingId
        ? await updatePortfolioContentAction(editingId, data)
        : await createPortfolioItemAction(data);

      if (res.project) {
        setItems((prev) =>
          editingId
            ? prev.map((item) => (item.id === editingId ? res.project : item))
            : [res.project, ...prev],
        );
      }
      setIsModalOpen(false);
      setTitleEn("");
      setTitleAr("");
      setSlug("");
      setClientName("");
      setThumbnailUrl("");
      setPreviewVideoUrl("");
      setIsFeatured(false);
    } catch (err) {
      setError(errorMessage(err, t, t.portfolioManagement.couldNotSaveProject));
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
        {t.portfolioManagement.reviewAndPublishChangesIn}
      </Link>
      <PageHeader
        title={(locale === "ar" ? catalogue.nameAr : catalogue.nameEn) || t.cms.portfolioTitle}
        description={media ? t.portfolioView.subtitle : t.portfolioView.catalogueSubtitle}
        actions={<Button
          variant="primary"
          size="sm"
          className="gap-1.5 self-start sm:self-auto"
          onClick={() => openEditor()}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{media ? t.actions.newProject : t.portfolioView.newItem}</span>
        </Button>}
      />

      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <Filter className="w-4 h-4 text-ink-muted shrink-0" />
        <button
          onClick={() => setSelectedCat("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${selectedCat === "all"
            ? "bg-accent text-accent-foreground shadow-lg shadow-accent/20"
            : "bg-surface border border-outline-variant text-ink-muted hover:text-ink"
            }`}
        >
          {t.actions.all}
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCat(c.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${selectedCat === c.id
              ? "bg-accent text-accent-foreground shadow-lg shadow-accent/20"
              : "bg-surface border border-outline-variant text-ink-muted hover:text-ink"
              }`}
          >
            {locale === "ar" ? c.name_ar : c.name_en}
          </button>
        ))}
      </div>

      <div className="bg-surface border border-outline-variant rounded-3xl overflow-x-auto shadow-sm">
        <DataTable className="w-full text-start text-xs">
          <thead className="bg-surface-sunken border-b border-outline-variant text-ink-muted uppercase  tracking-wider">
            <tr>
              <th className="p-4 text-start">
                {media ? t.portfolioView.projectClient : t.portfolioView.itemColumn}
              </th>
              {media ? <th className="p-4 text-start">{t.portfolioView.aspectRatio}</th> : null}
              {uses("price") ? <th className="p-4 text-start">{t.portfolioView.price}</th> : null}
              {uses("year") ? <th className="p-4 text-start">{t.portfolioView.year}</th> : null}
              <th className="p-4 text-center">{t.cms.featured}</th>
              <th className="p-4 text-end">{t.equipmentView.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {filteredItems.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-ink/[0.02] transition-colors"
              >
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <ContentImage
                      src={item.thumbnail_url}
                      alt={locale === "ar" ? item.title_ar : item.title_en}
                      className="w-16 h-10 rounded-xl object-cover bg-black shrink-0 border border-outline-variant"
                    />
                    <div>
                      <div className="font-bold text-ink text-sm">
                        {locale === "ar" ? item.title_ar : item.title_en}
                      </div>
                      <div className="text-accent  text-[11px]">
                        {item.client_name || (locale === "ar" ? item.subtitle_ar : item.subtitle_en) || item.location}
                      </div>
                    </div>
                  </div>
                </td>
                {media ? (
                  <td className="p-4  text-ink-muted">
                    <Badge variant="outline">{item.aspect_ratio}</Badge>
                  </td>
                ) : null}
                {uses("price") ? <td className="p-4 text-ink">{item.price !== undefined ? <CurrencyDisplay amount={item.price} currency={catalogue.currency} /> : "—"}</td> : null}
                {uses("year") ? <td className="p-4  text-ink">{item.year ?? "—"}</td> : null}
                <td className="p-4 text-center">
                  <button
                    onClick={() =>
                      handleToggleFeatured(item.id, item.is_featured)
                    }
                    className={`p-1.5 rounded-lg transition-colors ${item.is_featured
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-ink/5 text-ink-muted hover:text-ink-muted"
                      }`}
                    title={
                      item.is_featured
                        ? t.portfolioView.unfeature
                        : t.portfolioView.feature
                    }
                  >
                    <Star className="w-4 h-4 fill-current" />
                  </button>
                </td>
                <td className="p-4 text-end space-x-2">
                  <button
                    className="p-2 text-emerald-700 dark:text-emerald-300"
                    onClick={() => openEditor(item)}
                  >
                    {t.actions.edit}
                  </button>
                  <button
                    onClick={() => setDeleteTargetId(item.id)}
                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors inline-flex"
                    title={t.actions.delete}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </div>

      <Modal closeLabel={t.actions.close}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? t.actions.edit : t.actions.newProject}
       footer={<div className="flex justify-end gap-3">
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
             form={modalFormId}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{t.actions.save}</span>
            </Button>
          </div>}>
        <form onSubmit={handleCreate} className="space-y-4" id={modalFormId}>
          {error && (
            <p role="alert" className="text-red-400 text-sm">
              {error}
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <LanguageFields name="title" label={t.portfolioView.title} languages={languages} required maxLength={500} en={titleEn} ar={titleAr} onChange={(v) => { setTitleEn(v.en); setTitleAr(v.ar); }} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {uses("client") ? (
              <label>
                <span className="text-xs text-ink mb-1.5 block">
                  <bdi dir="auto">{t.portfolioView.clientName}</bdi>
                </span>
                <Input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder={t.portfolioView.clientPlaceholder}
                  required={media}
                />
              </label>
            ) : null}
            <label>
              <span className="text-xs text-ink mb-1.5 block">
                {t.portfolioView.category}
              </span>
              <Select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="" className="bg-surface text-ink">
                  {t.portfolioView.selectCategory}
                </option>
                {categories.map((c) => (
                  <option
                    key={c.id}
                    value={c.id}
                    className="bg-surface text-ink"
                  >
                    {locale === "ar" ? c.name_ar : c.name_en}
                  </option>
                ))}
              </Select>
            </label>
          </div>

          {uses("subtitle") || uses("price") || uses("location") || uses("externalUrl") ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {uses("subtitle") ? <LanguageFields name="subtitle" label={t.portfolioView.subtitleLabel} languages={languages} maxLength={300} en={subtitle.en} ar={subtitle.ar} onChange={setSubtitle} /> : null}
              {uses("price") ? (
                <>
                  <div>
                    <label htmlFor="item-price" className="text-xs text-ink mb-1.5 block">{`${t.portfolioView.price} (${catalogue.currency})`}</label>
                    <Input id="item-price" type="number" min={0} step="any" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
                  </div>
                  <LanguageFields name="priceNote" label={t.portfolioView.priceNote} placeholder={t.portfolioView.priceNotePlaceholder} languages={languages} maxLength={300} en={priceNote.en} ar={priceNote.ar} onChange={setPriceNote} />
                </>
              ) : null}
              {uses("location") ? (
                <div>
                  <label htmlFor="item-location" className="text-xs text-ink mb-1.5 block">{t.portfolioView.location}</label>
                  <Input id="item-location" value={location} maxLength={300} onChange={(e) => setLocation(e.target.value)} />
                </div>
              ) : null}
              {uses("externalUrl") ? (
                <div>
                  <label htmlFor="item-link" className="text-xs text-ink mb-1.5 block">{t.portfolioView.externalUrl}</label>
                  <Input id="item-link" type="url" dir="ltr" value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} />
                  <p className="mt-1 text-[11px] text-ink-muted">{t.portfolioView.externalUrlHint}</p>
                </div>
              ) : null}
            </div>
          ) : null}

          {uses("attributes") ? (
            <fieldset className="space-y-2 rounded-xl border border-outline-variant p-3">
              <legend className="px-1 text-xs font-semibold text-ink">{t.portfolioView.attributes}</legend>
              <p className="text-[11px] text-ink-muted">{t.portfolioView.attributesHint}</p>
              {attributes.map((attribute, index) => (
                <div key={index} className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <LanguageFields label={t.portfolioView.attributeLabel} languages={languages} maxLength={200} en={attribute.labelEn} ar={attribute.labelAr} onChange={(v) => setAttributes(attributes.map((a, i) => (i === index ? { ...a, labelEn: v.en, labelAr: v.ar } : a)))} />
                  <LanguageFields label={t.portfolioView.attributeValue} languages={languages} maxLength={200} en={attribute.valueEn} ar={attribute.valueAr} onChange={(v) => setAttributes(attributes.map((a, i) => (i === index ? { ...a, valueEn: v.en, valueAr: v.ar } : a)))} />
                  <button type="button" onClick={() => setAttributes(attributes.filter((_, i) => i !== index))} aria-label={t.portfolioView.removeAttribute} className="mb-1 rounded-lg p-2 text-rose-400 hover:bg-rose-500/10">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" disabled={attributes.length >= 20} onClick={() => setAttributes([...attributes, { labelEn: "", labelAr: "", valueEn: "", valueAr: "" }])}>
                <Plus className="h-3.5 w-3.5" />
                {t.portfolioView.addAttribute}
              </Button>
            </fieldset>
          ) : null}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {media ? (
              <label>
                <span className="text-xs text-ink mb-1.5 block">
                  {t.portfolioView.aspectRatio}
                </span>
                <Select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                >
                  <option value="16:9" className="bg-surface text-ink">
                    {t.copy.aspectStandard}</option>
                  <option value="2.39:1" className="bg-surface text-ink">
                    {t.copy.aspectScope}</option>
                  <option value="9:16" className="bg-surface text-ink">
                    {t.copy.aspectVertical}</option>
                  <option value="4:3" className="bg-surface text-ink">
                    {t.copy.aspectAcademy}</option>
                </Select>
              </label>
            ) : null}
            {uses("year") ? (
              <label>
                <span className="text-xs text-ink mb-1.5 block">
                  {t.portfolioView.productionYear}
                </span>
                <Input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                />
              </label>
            ) : null}
            <label>
              <span className="text-xs text-ink mb-1.5 block">
                {t.portfolioView.slug}
              </span>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder={t.portfolioView.slugPlaceholder}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="text-xs text-ink mb-1.5 block">
                {t.portfolioView.thumbnailUrl}
              </label>
              <AssetUrlInput
                value={thumbnailUrl}
                onChange={setThumbnailUrl}
                resource="portfolio"
                placeholder={t.portfolioView.thumbnailPlaceholder}
                required
              />
            </div>
            {uses("video") ? (
              <label>
                <span className="text-xs text-ink mb-1.5 block">
                  {t.portfolioView.previewVideoUrl}
                </span>
                <Input
                  value={previewVideoUrl}
                  onChange={(e) => setPreviewVideoUrl(e.target.value)}
                  placeholder={t.portfolioView.previewVideoPlaceholder}
                />
              </label>
            ) : null}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <LanguageFields name="description" label={t.portfolioView.description} languages={languages} multiline maxLength={10000} en={descriptionEn} ar={descriptionAr} onChange={(v) => { setDescriptionEn(v.en); setDescriptionAr(v.ar); }} />
            {uses("video") ? (
              <label className="text-sm">
                {t.portfolioManagement.fullMediaUrl || t.portfolioManagement.fullFilmUrl}
                <Input
                  value={fullVideo}
                  onChange={(e) => setFullVideo(e.target.value)}
                />
              </label>
            ) : null}
            <label className="text-sm">
              {t.portfolioManagement.displayOrder}
              <Input
                type="number"
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
              />
            </label>
            {uses("gallery") ? (
              <label className="text-sm sm:col-span-2">
                {t.portfolioManagement.galleryImagesOneUrlPer}
                <textarea
                  className="w-full rounded-lg bg-ink/5 border border-outline-variant p-3"
                  rows={3}
                  value={gallery}
                  onChange={(e) => setGallery(e.target.value)}
                />
              </label>
            ) : null}
          </div>
          <div className="pt-2 flex items-center gap-2">
            <input
              type="checkbox"
              id="isFeatured"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="w-4 h-4 rounded text-accent bg-ink/5 border-outline-variant"
            />
            <label htmlFor="isFeatured" className="text-xs text-ink">
              {t.cms.featured}
            </label>
          </div>


        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={async () => {
          if (deleteTargetId) {
            await handleDelete(deleteTargetId);
            setDeleteTargetId(null);
          }
        }}
        title={t.actions.delete}
        description={t.portfolioView.confirmDelete}
        confirmLabel={t.actions.delete}
        cancelLabel={t.actions.cancel}
      />
    </div>
  );
}
