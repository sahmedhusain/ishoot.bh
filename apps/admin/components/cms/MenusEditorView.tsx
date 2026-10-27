"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Loader2, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { Select, Button, Card, Input } from "@platform/ui";
import type { WebsiteArticles, WebsiteMenuItem, WebsiteMenus } from "@platform/database/website-config";
import type { ContentLanguage } from "@platform/database/constants/languages";
import { saveWebsiteMenusAction } from "../../app/actions/website";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { Field, LanguageFields } from "../setup/LanguageFields";

type PageOption = { id: string; title_en: string; title_ar: string; in_header: boolean; in_footer: boolean; is_visible: boolean; page_type: string };

/** The menus the pages' own header and footer flags give, as a starting point for editing. */
function menusFromPages(pages: PageOption[]): WebsiteMenus {
  const item = (page: PageOption): WebsiteMenuItem => ({ kind: "page", pageId: page.id, labelEn: "", labelAr: "" });
  const home = pages.find((page) => page.page_type === "home");
  const start: WebsiteMenuItem[] = [...(home ? [item(home)] : []), { kind: "catalogue", labelEn: "", labelAr: "" }, { kind: "articles", labelEn: "", labelAr: "" }];
  return {
    header: [...start, ...pages.filter((p) => p.in_header && p.is_visible).map(item)],
    footer: [...start, ...pages.filter((p) => p.in_footer && p.is_visible).map(item)],
  };
}

/** Website → Menus: the header and footer links, and where the articles live. */
export function MenusEditorView({ initialMenus, articles: initialArticles, pages, languages }: { initialMenus: WebsiteMenus | null; articles: WebsiteArticles; pages: PageOption[]; languages: readonly ContentLanguage[] }) {
  const { t, locale } = useAdminLocale();
  const copy = t.cmsMenus;
  const router = useRouter();
  const [menus, setMenus] = React.useState<WebsiteMenus>(initialMenus ?? menusFromPages(pages));
  const [custom, setCustom] = React.useState(!!initialMenus);
  const [articles, setArticles] = React.useState(initialArticles);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const pageTitle = (id?: string) => {
    const page = pages.find((p) => p.id === id);
    return page ? (locale === "ar" ? page.title_ar : page.title_en) : copy.missingPage;
  };

  const update = (which: keyof WebsiteMenus, next: WebsiteMenuItem[]) => {
    setCustom(true);
    setMenus((current) => ({ ...current, [which]: next }));
  };

  const save = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await saveWebsiteMenusAction(custom ? menus : null, articles);
      setMessage({ tone: "ok", text: copy.saved });
      router.refresh();
    } catch (error) {
      setMessage({ tone: "error", text: errorMessage(error, t) });
    } finally {
      setBusy(false);
    }
  };

  const list = (which: keyof WebsiteMenus) => {
    const items = menus[which];
    const set = (index: number, patch: Partial<WebsiteMenuItem>) => update(which, items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
    const move = (index: number, by: number) => {
      const next = [...items];
      const target = index + by;
      if (target < 0 || target >= next.length) return;
      [next[index], next[target]] = [next[target], next[index]];
      update(which, next);
    };
    return (
      <Card className="p-5 space-y-3" data-page-section>
        <h2 className="font-bold text-ink">{copy[which]}</h2>
        {items.length === 0 && <p className="text-xs text-ink-muted">{copy.empty}</p>}
        <ol className="space-y-2">
          {items.map((item, index) => (
            <li key={index} className="rounded-xl border border-outline-variant p-3 space-y-3 transition-colors hover:border-outline-variant">
              <div className="flex flex-wrap items-center gap-2">
                <Select aria-label={copy.kind} value={item.kind} onChange={(e) => set(index, { kind: e.target.value as WebsiteMenuItem["kind"], pageId: e.target.value === "page" ? pages[0]?.id : undefined, url: e.target.value === "external" ? "https://" : undefined })} className="h-9 rounded-lg border border-outline-variant bg-surface px-2 text-sm">
                  {(["page", "catalogue", "articles", "external"] as const).map((kind) => (
                    <option key={kind} value={kind}>{copy.kinds[kind]}</option>
                  ))}
                </Select>
                {item.kind === "page" && (
                  <Select aria-label={copy.page} value={item.pageId} onChange={(e) => set(index, { pageId: e.target.value })} className="h-9 flex-1 min-w-[160px] rounded-lg border border-outline-variant bg-surface px-2 text-sm">
                    {pages.map((page) => (
                      <option key={page.id} value={page.id}>{locale === "ar" ? page.title_ar : page.title_en}{page.is_visible ? "" : ` (${copy.hidden})`}</option>
                    ))}
                  </Select>
                )}
                {item.kind === "external" && <Input aria-label={copy.url} dir="ltr" value={item.url ?? ""} onChange={(e) => set(index, { url: e.target.value })} className="h-9 flex-1 min-w-[180px] rounded-lg" />}
                <div className="ms-auto flex gap-1">
                  <button type="button" aria-label={t.cmsPages.moveUp} disabled={index === 0} onClick={() => move(index, -1)} className="p-1.5 rounded-md text-ink-muted hover:bg-ink/5 disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5" /></button>
                  <button type="button" aria-label={t.cmsPages.moveDown} disabled={index === items.length - 1} onClick={() => move(index, 1)} className="p-1.5 rounded-md text-ink-muted hover:bg-ink/5 disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5" /></button>
                  <button type="button" aria-label={t.cmsPages.remove} onClick={() => update(which, items.filter((_, i) => i !== index))} className="p-1.5 rounded-md text-rose-600 hover:bg-rose-500/10"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <LanguageFields
                  label={copy.label}
                  hint={item.kind === "page" ? pageTitle(item.pageId) : item.kind === "external" ? copy.labelRequired : copy.labelHint}
                  languages={languages}
                  maxLength={80}
                  en={item.labelEn}
                  ar={item.labelAr}
                  onChange={({ en, ar }) => set(index, { labelEn: en, labelAr: ar })}
                />
              </div>
            </li>
          ))}
        </ol>
        <Button type="button" size="sm" variant="outline" className="rounded-full gap-1.5" disabled={items.length >= 20} onClick={() => update(which, [...items, { kind: "page", pageId: pages[0]?.id, labelEn: "", labelAr: "" }])}>
          <Plus className="w-3.5 h-3.5" />
          {copy.addLink}
        </Button>
      </Card>
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4" data-page-header>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink dark:text-ink">{copy.title}</h1>
          <p className="text-xs text-ink-muted dark:text-ink-muted mt-1 max-w-2xl leading-relaxed">{custom ? copy.subtitleCustom : copy.subtitleAuto}</p>
        </div>
        <div className="flex gap-2">
          {custom && (
            <Button type="button" variant="outline" size="sm" className="rounded-full gap-1.5" onClick={() => { setCustom(false); setMenus(menusFromPages(pages)); }}>
              <RotateCcw className="w-3.5 h-3.5" />
              {copy.usePages}
            </Button>
          )}
          <Button type="button" variant="primary" size="sm" className="rounded-full gap-1.5" disabled={busy} onClick={save}>
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {copy.save}
          </Button>
        </div>
      </div>
      {message && <p role="status" className={`text-sm rounded-xl px-4 py-3 ${message.tone === "ok" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/10 text-rose-700 dark:text-rose-300"}`}>{message.text}</p>}
      <div className="grid lg:grid-cols-2 gap-4">
        {list("header")}
        {list("footer")}
      </div>
      <Card className="p-5 grid sm:grid-cols-2 gap-4" data-page-section>
        <h2 className="sm:col-span-2 font-bold text-ink">{copy.articlesTitle}</h2>
        <Field label={copy.articlesSlug} hint={copy.articlesSlugHint}>
          {(id) => <Input id={id} dir="ltr" value={articles.slug} onChange={(e) => setArticles({ ...articles, slug: e.target.value.toLowerCase() })} className="rounded-lg" />}
        </Field>
        <LanguageFields label={copy.articlesName} languages={languages} maxLength={120} required en={articles.navEn} ar={articles.navAr} onChange={({ en, ar }) => setArticles({ ...articles, navEn: en, navAr: ar })} />
      </Card>
    </div>
  );
}
