"use client";
import { BUSINESS_ACTIVITIES, ACTIVITY_PRESETS, type BusinessActivity } from "@platform/database/website-presets";
import { INDUSTRY_PAGES, industryPageBlocks } from "@platform/database/cms/industry-pages";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Select, Button, Card, Input, Textarea } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import { BLOCK_TYPES, CODE_BLOCKS, EMBED_PRESETS, newBlockData, type Block, type BlockType, type LocalText } from "@platform/database/cms/blocks";
import type { CmsPageRecord } from "@platform/database/queries/cms-pages";
import type { ContentLanguage } from "@platform/database/constants/languages";
import { previewWebsiteAction } from "../../app/actions/website";
import { saveCmsPageAction } from "../../app/actions/cms-pages";
import { ROUTES } from "../../constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { AssetUrlInput } from "../shared/AssetUrlInput";
import { Field, LanguageFields } from "../setup/LanguageFields";
import { RichTextEditor } from "./RichTextEditor";
import { PageHeader } from "../layout/PageHeader";

const blockId = () => Math.random().toString(36).slice(2, 10);

export function PageEditorView({ page, languages, canCode, catalogueSlug, activity }: { activity: BusinessActivity; page: CmsPageRecord; languages: readonly ContentLanguage[]; canCode: boolean; catalogueSlug: string }) {
  const { t, locale } = useAdminLocale();
  const copy = t.cmsPages;
  const router = useRouter();
  const [draft, setDraft] = React.useState(page);
  const [presetActivity, setPresetActivity] = React.useState(activity);
  const [presetIndex, setPresetIndex] = React.useState(0);
  const markSaved = useUnsavedChanges(draft);
  const [open, setOpen] = React.useState<string | null>(null);
  const [adding, setAdding] = React.useState<BlockType | "">("");
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(page);
  const builtIn = page.page_type !== "custom";

  const setBlocks = (update: (blocks: Block[]) => Block[]) => setDraft((current) => ({ ...current, blocks: update(current.blocks) }));
  const patchBlock = (id: string, data: Partial<Block["data"]>) => setBlocks((blocks) => blocks.map((b) => (b.id === id ? ({ ...b, data: { ...b.data, ...data } } as Block) : b)));
  const move = (index: number, by: number) =>
    setBlocks((blocks) => {
      const next = [...blocks];
      const target = index + by;
      if (target < 0 || target >= next.length) return blocks;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const addBlock = () => {
    if (!adding) return;
    const block = { id: blockId(), type: adding, visible: true, data: newBlockData(adding) } as Block;
    setBlocks((blocks) => [...blocks, block]);
    setOpen(block.id);
    setAdding("");
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const { id, slug, title_en, title_ar, seo_title_en, seo_title_ar, seo_description_en, seo_description_ar, blocks, is_visible, in_header, in_footer } = draft;
      const saved = await saveCmsPageAction({ id: id || undefined, slug, title_en, title_ar, seo_title_en, seo_title_ar, seo_description_en, seo_description_ar, blocks, is_visible, in_header, in_footer });
      if (!markSaved(saved.page)) return;
      setMessage({ tone: "ok", text: copy.saved });
      if (!id) return router.replace(ROUTES.cms.page(saved.page.id));
      setDraft(saved.page);
      router.refresh();
    } catch (error) {
      setMessage({ tone: "error", text: errorMessage(error, t) });
    } finally {
      setSaving(false);
    }
  };

  const preview = async () => {
    try {
      const url = await previewWebsiteAction(locale, `/${locale}${draft.slug ? `/${draft.slug}` : ""}`);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      setMessage({ tone: "error", text: errorMessage(error, t) });
    }
  };

  const text = (block: Block, key: string, label: string, options: { multiline?: boolean; max?: number } = {}) => (
    <LanguageFields
      label={label}
      languages={languages}
      multiline={options.multiline}
      maxLength={options.max ?? 300}
      en={((block.data as Record<string, LocalText>)[key] ?? { en: "" }).en}
      ar={((block.data as Record<string, LocalText>)[key] ?? { ar: "" }).ar}
      onChange={(value) => patchBlock(block.id, { [key]: value } as never)}
    />
  );
  const urlField = (block: Block, key: string, label: string, hint?: string) => (
    <Field label={label} hint={hint} wide>
      {(id) => <Input id={id} dir="ltr" value={String((block.data as Record<string, unknown>)[key] ?? "")} onChange={(e) => patchBlock(block.id, { [key]: e.target.value } as never)} className="rounded-lg" />}
    </Field>
  );
  const image = (block: Block, key: string, label: string) => (
    <Field label={label} wide>
      {(id) => <AssetUrlInput id={id} resource="pages" value={String((block.data as Record<string, unknown>)[key] ?? "")} onChange={(url) => patchBlock(block.id, { [key]: url } as never)} />}
    </Field>
  );
  const select = <T extends string>(block: Block, key: string, label: string, values: readonly T[], labels: Record<string, string>) => (
    <Field label={label}>
      {(id) => (
        <Select id={id} value={String((block.data as Record<string, unknown>)[key])} onChange={(e) => patchBlock(block.id, { [key]: Number.isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value) } as never)} className="w-full h-9 rounded-lg border border-outline-variant bg-surface px-3 text-sm">
          {values.map((value) => (
            <option key={value} value={value}>{labels[value] ?? value}</option>
          ))}
        </Select>
      )}
    </Field>
  );

  const editor = (block: Block) => {
    const d = block.data as Record<string, unknown>;
    switch (block.type) {
      case "hero":
        return (
          <>
            {select(block, "style", copy.fields.heroStyle, ["inherit", "cinematic", "split", "centered"], { ...copy.heroStyles, inherit: copy.fields.websiteDefault })}
            {text(block, "title", copy.fields.title)}
            {text(block, "subtitle", copy.fields.subtitle, { max: 600 })}
            <p className="sm:col-span-2 text-xs text-ink-muted">{copy.hints.hero}</p>
          </>
        );
      case "rich_text":
        return (
          <div className="sm:col-span-2 space-y-4">
            {languages.map((language) => (
              <RichTextEditor
                key={language}
                label={languages.length > 1 ? (language === "en" ? t.websiteEditor.inEnglish : t.websiteEditor.inArabic) : copy.fields.text}
                dir={language === "ar" ? "rtl" : "ltr"}
                value={(d.doc as Record<string, unknown>)?.[language] ?? null}
                onChange={(doc) => {
                  const docs = { ...((d.doc as Record<string, unknown>) ?? {}), [language]: doc };
                  if (languages.length === 1) docs[language === "en" ? "ar" : "en"] = doc;
                  patchBlock(block.id, { doc: docs } as never);
                }}
                imageResource="pages"
              />
            ))}
          </div>
        );
      case "image_text":
        return (
          <>
            {text(block, "title", copy.fields.title)}
            {text(block, "text", copy.fields.text, { multiline: true, max: 5000 })}
            {image(block, "imageUrl", copy.fields.image)}
            {select(block, "imageSide", copy.fields.imageSide, ["start", "end"], copy.sides)}
            {text(block, "buttonLabel", copy.fields.buttonLabel, { max: 80 })}
            {urlField(block, "buttonUrl", copy.fields.buttonUrl, copy.hints.link)}
          </>
        );
      case "gallery": {
        const images = (d.images as { url: string; caption: LocalText }[]) ?? [];
        return (
          <div className="sm:col-span-2 space-y-3">
            {text(block, "title", copy.fields.title)}
            {select(block, "columns", copy.fields.columns, ["2", "3", "4"], {})}
            {images.map((item, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="flex-1">
                  <AssetUrlInput resource="pages" value={item.url} onChange={(url) => patchBlock(block.id, { images: images.map((x, i) => (i === index ? { ...x, url } : x)) } as never)} />
                  <Input className="mt-1 rounded-lg" placeholder={copy.fields.caption} value={locale === "ar" ? item.caption.ar : item.caption.en} onChange={(e) => patchBlock(block.id, { images: images.map((x, i) => (i === index ? { ...x, caption: languages.length === 1 ? { en: e.target.value, ar: e.target.value } : { ...x.caption, [locale]: e.target.value } } : x)) } as never)} />
                </div>
                <button type="button" aria-label={copy.remove} className="h-9 w-9 grid place-items-center rounded-lg text-rose-600 hover:bg-rose-500/10" onClick={() => patchBlock(block.id, { images: images.filter((_, i) => i !== index) } as never)}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <Button type="button" size="sm" variant="outline" className="rounded-full gap-1.5" onClick={() => patchBlock(block.id, { images: [...images, { url: "", caption: { en: "", ar: "" } }] } as never)}>
              <Plus className="w-3.5 h-3.5" />
              {copy.addImage}
            </Button>
          </div>
        );
      }
      case "video":
        return (
          <>
            {text(block, "title", copy.fields.title)}
            {urlField(block, "url", copy.fields.videoUrl, copy.hints.video)}
            {image(block, "posterUrl", copy.fields.poster)}
          </>
        );
      case "catalogue":
        return (
          <>
            <Field label={copy.fields.categorySlug}>{id => <Input id={id} value={String(d.category ?? "")} maxLength={80} dir="ltr" onChange={e => patchBlock(block.id, { category: e.target.value } as never)} />}</Field>
            {select(block, "layout", copy.fields.layout, ["grid", "list"], copy.layouts)}
            {select(block, "presentation", copy.fields.catalogueCardStyle, ["inherit", "media", "case", "product", "listing"], { ...t.setupWizard.website.layouts, inherit: copy.fields.websiteDefault })}
            <Field label={copy.fields.limit}>{(id) => <Input id={id} type="number" min={1} max={60} value={Number(d.limit)} onChange={(e) => patchBlock(block.id, { limit: Number(e.target.value) || 12 } as never)} className="rounded-lg w-28" />}</Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={d.filterable !== false} onChange={(e) => patchBlock(block.id, { filterable: e.target.checked } as never)} />
              {copy.fields.filterable}
            </label>
          </>
        );
      case "cta":
        return (
          <>
            {text(block, "title", copy.fields.title)}
            {text(block, "text", copy.fields.text, { multiline: true, max: 1500 })}
            {text(block, "buttonLabel", copy.fields.buttonLabel, { max: 80 })}
            {urlField(block, "buttonUrl", copy.fields.buttonUrl, copy.hints.link)}
          </>
        );
      case "map":
        return (
          <>
            {text(block, "title", copy.fields.title)}
            {urlField(block, "embedUrl", copy.fields.mapUrl, copy.hints.map)}
          </>
        );
      case "team": {
        const members = (d.members as { name: LocalText; role: LocalText; photoUrl: string }[]) ?? [];
        const set = (index: number, patch: Partial<(typeof members)[number]>) => patchBlock(block.id, { members: members.map((m, i) => (i === index ? { ...m, ...patch } : m)) } as never);
        return (
          <div className="sm:col-span-2 space-y-3">
            {text(block, "title", copy.fields.title)}
            {members.map((member, index) => (
              <Card key={index} className="p-3 grid sm:grid-cols-2 gap-3">
                <LanguageFields label={copy.fields.name} languages={languages} en={member.name.en} ar={member.name.ar} onChange={(name) => set(index, { name })} maxLength={120} />
                <LanguageFields label={copy.fields.role} languages={languages} en={member.role.en} ar={member.role.ar} onChange={(role) => set(index, { role })} maxLength={120} />
                <div className="sm:col-span-2 flex items-start gap-2">
                  <div className="flex-1"><AssetUrlInput resource="pages" value={member.photoUrl} onChange={(photoUrl) => set(index, { photoUrl })} /></div>
                  <button type="button" aria-label={copy.remove} className="h-9 w-9 grid place-items-center rounded-lg text-rose-600 hover:bg-rose-500/10" onClick={() => patchBlock(block.id, { members: members.filter((_, i) => i !== index) } as never)}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            ))}
            <Button type="button" size="sm" variant="outline" className="rounded-full gap-1.5" onClick={() => patchBlock(block.id, { members: [...members, { name: { en: "", ar: "" }, role: { en: "", ar: "" }, photoUrl: "" }] } as never)}>
              <Plus className="w-3.5 h-3.5" />
              {copy.addMember}
            </Button>
          </div>
        );
      }
      case "latest_articles":
        return (
          <>
            {text(block, "title", copy.fields.title)}
            <Field label={copy.fields.count}>{(id) => <Input id={id} type="number" min={1} max={12} value={Number(d.count)} onChange={(e) => patchBlock(block.id, { count: Number(e.target.value) || 3 } as never)} className="rounded-lg w-28" />}</Field>
            {select(block, "category", copy.fields.category, ["", "news", "update", "post", "press_release"], { "": copy.allCategories, ...t.cmsArticles.categories })}
          </>
        );
      case "columns": {
        const columns = (d.columns as { title: LocalText; text: LocalText }[]) ?? [];
        const set = (index: number, patch: Partial<(typeof columns)[number]>) => patchBlock(block.id, { columns: columns.map((c, i) => (i === index ? { ...c, ...patch } : c)) } as never);
        return (
          <div className="sm:col-span-2 space-y-3">
            {text(block, "title", copy.fields.title)}
            {columns.map((column, index) => (
              <Card key={index} className="p-3 grid sm:grid-cols-2 gap-3">
                <LanguageFields label={copy.fields.title} languages={languages} en={column.title.en} ar={column.title.ar} onChange={(title) => set(index, { title })} maxLength={200} />
                <LanguageFields label={copy.fields.text} languages={languages} multiline en={column.text.en} ar={column.text.ar} onChange={(value) => set(index, { text: value })} maxLength={2000} />
                <button type="button" className="text-xs text-rose-600 justify-self-start" onClick={() => patchBlock(block.id, { columns: columns.filter((_, i) => i !== index) } as never)}>{copy.remove}</button>
              </Card>
            ))}
            {columns.length < 4 && (
              <Button type="button" size="sm" variant="outline" className="rounded-full gap-1.5" onClick={() => patchBlock(block.id, { columns: [...columns, { title: { en: "", ar: "" }, text: { en: "", ar: "" } }] } as never)}>
                <Plus className="w-3.5 h-3.5" />
                {copy.addColumn}
              </Button>
            )}
          </div>
        );
      }
      case "spacer":
        return select(block, "size", copy.fields.size, ["sm", "md", "lg"], copy.sizes);
      case "embed":
        return (
          <>
            {text(block, "title", copy.fields.title)}
            {select(block, "preset", copy.fields.preset, EMBED_PRESETS, copy.presets)}
            {urlField(block, "url", copy.fields.embedUrl, copy.hints.embed)}
          </>
        );
      case "code":
        return (
          <div className="sm:col-span-2 space-y-3">
            <p className="text-xs rounded-lg bg-amber-500/10 text-amber-800 dark:text-amber-300 px-3 py-2">{copy.hints.code}</p>
            {(["html", "css", "js"] as const).map((key) => (
              <Field key={key} label={copy.fields[key]} wide>
                {(id) => <Textarea id={id} dir="ltr" rows={key === "html" ? 8 : 5} disabled={!canCode} value={String(d[key] ?? "")} onChange={(e) => patchBlock(block.id, { [key]: e.target.value } as never)} className="font-mono text-xs rounded-lg" />}
              </Field>
            ))}
            <Field label={copy.fields.height} hint={formatMessage(copy.hints.height, { value: 0 })}>{(id) => <Input id={id} type="number" min={0} max={4000} disabled={!canCode} value={Number(d.height)} onChange={(e) => patchBlock(block.id, { height: Number(e.target.value) || 0 } as never)} className="rounded-lg w-32" />}</Field>
          </div>
        );
      case "divider":
        return null;
      default:
        return (
          <>
            {"title" in d && text(block, "title", copy.fields.title)}
            <p className="sm:col-span-2 text-xs text-ink-muted">{copy.hints.data}</p>
          </>
        );
    }
  };

  const available = BLOCK_TYPES.filter((type) => canCode || !CODE_BLOCKS.includes(type));

  return (
    <div inert={saving} aria-busy={saving} className="space-y-6 max-w-5xl mx-auto pb-16">
      <PageHeader
        back={{ href: ROUTES.cms.pages, label: copy.title }}
        actions={
          <>
          <Button type="button" variant="outline" size="sm" className="rounded-full gap-1.5" onClick={preview}>
            <Eye className="w-3.5 h-3.5" />
            {copy.preview}
          </Button>
          <Button type="button" variant="primary" size="sm" className="rounded-full gap-1.5" disabled={saving || !dirty} onClick={save}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {copy.save}
          </Button>
          </>
        }
      />

      {message && (
        <p role="status" className={`text-sm rounded-2xl px-4 py-3 ${message.tone === "ok" ? "bg-primary-container text-on-primary-container" : "bg-m3-error-container text-m3-on-error-container"}`}>
          {message.text}
        </p>
      )}

      {!page.id && <Card className="p-5 space-y-4">
        <h2 className="font-semibold">{copy.presetTitle}</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Select aria-label={copy.presetActivity} value={presetActivity} onChange={e => { setPresetActivity(e.target.value as BusinessActivity); setPresetIndex(0); }}>{BUSINESS_ACTIVITIES.map(value => <option key={value} value={value}>{t.setupWizard.company.activities[value].name}</option>)}</Select>
          <Select aria-label={copy.presetPage} value={String(presetIndex)} onChange={e => setPresetIndex(Number(e.target.value))}>{INDUSTRY_PAGES[presetActivity].map((preset, index) => <option key={preset.slug} value={index}>{locale === "ar" ? preset.ar : preset.en}</option>)}</Select>
        </div>
        <p className="text-sm text-ink-muted">{INDUSTRY_PAGES[presetActivity][presetIndex].blocks.map(type => copy.types[type]).join(" · ")}</p>
        <p className="text-xs text-ink-muted">{copy.presetNotice}</p>
        <Button type="button" variant="outline" disabled={!!draft.title_en || !!draft.title_ar || draft.blocks.length > 0} onClick={() => {
          const preset = INDUSTRY_PAGES[presetActivity][presetIndex];
          setDraft(current => ({ ...current, slug: preset.slug === catalogueSlug ? `${preset.slug}-information` : preset.slug, title_en: preset.en, title_ar: preset.ar, blocks: industryPageBlocks(preset, blockId, ACTIVITY_PRESETS[presetActivity].collection.layout), is_visible: false, in_header: false, in_footer: false }));
        }}>{copy.presetApply}</Button>
      </Card>}

      <Card className="p-5 grid sm:grid-cols-2 gap-4">
        <LanguageFields label={copy.fields.pageTitle} languages={languages} required maxLength={200} en={draft.title_en} ar={draft.title_ar} onChange={({ en, ar }) => setDraft({ ...draft, title_en: en, title_ar: ar })} />
        <Field label={copy.fields.slug} hint={builtIn ? copy.hints.slugBuiltIn : formatMessage(copy.hints.slug, { catalogue: catalogueSlug })}>
          {(id) => <Input id={id} dir="ltr" disabled={builtIn} value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value.toLowerCase() })} className="rounded-lg" />}
        </Field>
        <LanguageFields label={copy.fields.seoTitle} languages={languages} maxLength={200} en={draft.seo_title_en} ar={draft.seo_title_ar} onChange={({ en, ar }) => setDraft({ ...draft, seo_title_en: en, seo_title_ar: ar })} />
        <LanguageFields label={copy.fields.seoDescription} languages={languages} multiline maxLength={400} en={draft.seo_description_en} ar={draft.seo_description_ar} onChange={({ en, ar }) => setDraft({ ...draft, seo_description_en: en, seo_description_ar: ar })} />
        {page.page_type !== "home" && (
          <div className="sm:col-span-2 flex flex-wrap gap-5 text-sm">
            {(["is_visible", "in_header", "in_footer"] as const).map((key) => (
              <label key={key} className="flex items-center gap-2">
                <input type="checkbox" checked={draft[key]} onChange={(e) => setDraft({ ...draft, [key]: e.target.checked })} />
                {copy.flags[key]}
              </label>
            ))}
          </div>
        )}
      </Card>

      <ol className="space-y-3" aria-label={copy.blocks}>
        {draft.blocks.map((block, index) => {
          const locked = CODE_BLOCKS.includes(block.type) && !canCode;
          return (
            <li key={block.id}>
              <Card className={`p-0 overflow-hidden transition-shadow ${block.visible ? "" : "opacity-60"} ${open === block.id ? "shadow-md ring-1 ring-accent/30" : ""}`}>
                <div className="flex items-center gap-2 px-4 py-3">
                  <button type="button" className="flex-1 text-start" aria-expanded={open === block.id} onClick={() => setOpen(open === block.id ? null : block.id)}>
                    <span className="font-semibold text-sm text-ink">{copy.types[block.type]}</span>
                    {"title" in (block.data as object) && (block.data as { title: LocalText }).title[locale === "ar" ? "ar" : "en"] && (
                      <span className="ms-2 text-xs text-ink-muted">{(block.data as { title: LocalText }).title[locale === "ar" ? "ar" : "en"]}</span>
                    )}
                  </button>
                  <button type="button" aria-label={copy.moveUp} disabled={index === 0} onClick={() => move(index, -1)} className="p-1.5 rounded-md text-ink-muted hover:bg-ink/5 disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5" /></button>
                  <button type="button" aria-label={copy.moveDown} disabled={index === draft.blocks.length - 1} onClick={() => move(index, 1)} className="p-1.5 rounded-md text-ink-muted hover:bg-ink/5 disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5" /></button>
                  <button type="button" aria-label={block.visible ? copy.hide : copy.show} onClick={() => setBlocks((blocks) => blocks.map((b) => (b.id === block.id ? { ...b, visible: !b.visible } : b)))} className="p-1.5 rounded-md text-ink-muted hover:bg-ink/5">
                    {block.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                  {!locked && (
                    <button type="button" aria-label={copy.duplicate} onClick={() => setBlocks((blocks) => [...blocks.slice(0, index + 1), { ...structuredClone(block), id: blockId() }, ...blocks.slice(index + 1)])} className="p-1.5 rounded-md text-ink-muted hover:bg-ink/5"><Copy className="w-3.5 h-3.5" /></button>
                  )}
                  {!locked && (
                    <button type="button" aria-label={copy.remove} onClick={() => setBlocks((blocks) => blocks.filter((b) => b.id !== block.id))} className="p-1.5 rounded-md text-rose-600 hover:bg-rose-500/10"><Trash2 className="w-3.5 h-3.5" /></button>
                  )}
                </div>
                {open === block.id && <div className="border-t border-outline-variant p-4 grid sm:grid-cols-2 gap-4 animate-in fade-in duration-150"><label className="sm:col-span-2 space-y-1 text-sm"><span>{copy.fields.sectionToneMixed}</span><Select value={block.tone ?? "inherit"} disabled={locked} onChange={e => setBlocks(blocks => blocks.map(b => b.id === block.id ? { ...b, tone: e.target.value as "inherit" | "light" | "dark" } : b))}><option value="inherit">{copy.fields.toneInherit}</option><option value="light">{copy.fields.toneLight}</option><option value="dark">{copy.fields.toneDark}</option></Select></label>{editor(block)}</div>}
              </Card>
            </li>
          );
        })}
      </ol>

      <Card className="p-4 flex flex-wrap items-end gap-3">
        <Field label={copy.addBlock}>
          {(id) => (
            <Select id={id} value={adding} onChange={(e) => setAdding(e.target.value as BlockType)} className="h-9 rounded-lg border border-outline-variant bg-surface px-3 text-sm min-w-[220px]">
              <option value="">{copy.chooseBlock}</option>
              {available.map((type) => (
                <option key={type} value={type}>{copy.types[type]}</option>
              ))}
            </Select>
          )}
        </Field>
        <Button type="button" variant="outline" size="sm" className="rounded-full gap-1.5" disabled={!adding} onClick={addBlock}>
          <Plus className="w-3.5 h-3.5" />
          {copy.add}
        </Button>
      </Card>
    </div>
  );
}
