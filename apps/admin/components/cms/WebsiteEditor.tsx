"use client";
import { errorMessage } from "../../lib/error-text";
import { formatDate } from "@platform/ui";
import { ROUTES } from "../../constants/routes";
import * as React from "react";
import { AssetUrlInput } from "../shared/AssetUrlInput";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type WebsiteConfig,
  defaultWebsitePages,
} from "@platform/database/website-config";
import {
  saveWebsiteDraftAction,
  publishWebsiteAction,
  previewWebsiteAction,
  restoreWebsiteAction,
  updateWebsiteServiceAction,
} from "../../app/actions/website";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import type { WebsiteSnapshotSection } from "@platform/database";
import { UnpublishedChangesNotice } from "./UnpublishedChangesNotice";
export function WebsiteEditor({
  config,
  revision,
  publishedAt,
  canRestore,
  services,
  deliveryStatus,
  publication,
}: {
  config: WebsiteConfig;
  deliveryStatus?: string;
  publication: { isPublished: boolean; changedSections: WebsiteSnapshotSection[] };
  revision: number;
  publishedAt?: string;
  canRestore: boolean;
  services: {
    id: string;
    nameEn: string;
    nameAr: string;
    isPublic: boolean;
    imageUrl: string | null;
  }[];
}) {
  const { t, locale } = useAdminLocale();
  const ar = locale === "ar";
  const router = useRouter();
  const [draft, setDraft] = React.useState(config);
  const [version, setVersion] = React.useState(revision);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");
  const [preview, setPreview] = React.useState("");
  const [dirty, setDirty] = React.useState(false);
  React.useEffect(() => {
    setVersion(revision);
  }, [revision]);
  const field =
    "w-full rounded-lg border border-slate-300 dark:border-neutral-600 bg-transparent p-3 text-sm";
  const button =
    "rounded-lg border border-slate-300 dark:border-neutral-600 px-4 py-2 text-sm disabled:opacity-50";
  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
      router.refresh();
      setMessage(t.websiteEditor.saved);
    } catch (e) {
      setError(errorMessage(e, t, t.websiteEditor.couldNotSave));
    } finally {
      setBusy(false);
    }
  }
  function change(next: WebsiteConfig) {
    setDraft(next);
    setDirty(true);
    setPreview("");
  }
  async function save() {
    const saved = await saveWebsiteDraftAction(draft, version);
    setVersion(saved.revision);
    setDirty(false);
    return saved.revision;
  }
  function move(index: number, direction: number) {
    const sections = [...draft.sections];
    [sections[index], sections[index + direction]] = [
      sections[index + direction],
      sections[index],
    ];
    change({ ...draft, sections });
  }
  const labels = t.websiteEditor.sectionNames as Record<string, string>;
  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      <header>
        <Link className="text-sm underline" href={ROUTES.settings.web}>
          {t.websiteEditor.websiteSettings}
        </Link>
        <h1 className="text-2xl font-bold mt-3">
          {t.websiteEditor.websitePublishing}
        </h1>
        <p className="text-sm text-slate-500 mt-2">
          {t.websiteEditor.arrangeSectionsEditContactContent}
        </p>
        {publishedAt && (
          <p className="text-xs text-slate-500 mt-2">
            {`${t.websiteEditor.lastPublished} ${formatDate(publishedAt, locale, "time")}`}
          </p>
        )}
        <div className="mt-3">
          <UnpublishedChangesNotice status={publication} canPublish />
        </div>
        {deliveryStatus && (
          <p className="text-xs text-slate-500 mt-2">
            {t.websiteEditor.publicRefresh}{" "}
            {(t.websiteEditor.deliveryStatuses as Record<string, string>)[deliveryStatus] ?? deliveryStatus}
          </p>
        )}
      </header>
      <div className="flex flex-wrap gap-3 sticky top-0 z-10 bg-white dark:bg-neutral-900 py-3 border-b border-slate-200 dark:border-neutral-700">
        <button disabled={busy} className={button} onClick={() => run(save)}>
          {t.websiteEditor.saveDraft}
          {dirty ? " *" : ""}
        </button>
        <button
          disabled={busy}
          className={button}
          onClick={() =>
            run(async () => {
              if (dirty) await save();
              setPreview(await previewWebsiteAction(locale));
            })
          }
        >
          {t.websiteEditor.createPreviewLink}
        </button>
        <button
          disabled={busy}
          className={`${button} bg-emerald-900 text-white`}
          onClick={() =>
            run(async () => {
              const current = dirty ? await save() : version;
              const result = await publishWebsiteAction(current);
              setVersion(result.revision);
            })
          }
        >
          {t.websiteEditor.publishWebsite}
        </button>
        {canRestore && (
          <button
            disabled={busy}
            className={button}
            onClick={() => run(() => restoreWebsiteAction(version))}
          >
            {t.websiteEditor.restorePreviousPublication}
          </button>
        )}
      </div>
      {preview && (
        <a
          href={preview}
          target="_blank"
          rel="noreferrer"
          className="block underline text-emerald-700 dark:text-emerald-400"
        >
          {t.websiteEditor.openPreviewValidForTen}
        </a>
      )}
      {error && (
        <p role="alert" className="text-red-700 bg-red-50 p-3 rounded-lg">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-emerald-700 dark:text-emerald-400">
          {message}
        </p>
      )}
      <section className="space-y-4 rounded-xl border p-5">
        <h2 className="font-bold">{t.websiteEditor.studioImageAndHistory}</h2>
        <div className="block space-y-1"><span>{t.websiteEditor.imageUrl}</span><AssetUrlInput value={draft.aboutImageUrl || ""} onChange={(url)=>change({...draft,aboutImageUrl:url})} resource="settings" /></div>
        {(draft.pillars || []).map((entry,index)=><div key={index} className="grid gap-3 sm:grid-cols-2 border p-3 rounded">
          {(["titleEn","titleAr","textEn","textAr"] as const).map(key=><label key={key}>{key}<textarea className={field} maxLength={1500} value={entry[key]} onChange={e=>change({...draft,pillars:draft.pillars!.map((p,i)=>i===index?{...p,[key]:e.target.value}:p)})}/></label>)}
          <button className={button} onClick={()=>change({...draft,pillars:draft.pillars!.filter((_,i)=>i!==index)})}>{t.websiteEditor.remove}</button>
        </div>)}
        <button className={button} disabled={(draft.pillars?.length || 0)>=12} onClick={()=>change({...draft,pillars:[...(draft.pillars||[]),{titleEn:"",titleAr:"",textEn:"",textAr:""}]})}>{t.websiteEditor.addHistoryEntry}</button>
        <p className="text-xs">{t.websiteEditor.emptyContentStaysHiddenSave}</p>
      </section>
      <section className="space-y-4 rounded-xl border border-slate-200 dark:border-neutral-800 p-5 bg-slate-50/50 dark:bg-neutral-900/30">
        <div>
          <h2 className="font-bold text-lg">
            {t.websiteEditor.publicPageVisibility}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {t.websiteEditor.controlWhichPagesAreActive}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(draft.pages || defaultWebsitePages).map((p) => {
            const pagePaths: Record<string, string> = { works: "/works", about: "/about", contact: "/contact" };
            const meta = {
              title: (t.websiteEditor.pageNames as Record<string, string>)[p.id] ?? p.id,
              path: pagePaths[p.id] ?? `/${p.id}`,
            };
            return (
              <div
                key={p.id}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                  p.visible
                    ? "border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-500/10"
                    : "border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 opacity-60"
                }`}
              >
                <div>
                  <div className="font-semibold text-sm">
                    {meta.title}
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">
                    {meta.path}
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={p.visible}
                    onChange={(e) => {
                      const curPages = draft.pages || defaultWebsitePages;
                      const nextPages = curPages.map((item) =>
                        item.id === p.id
                          ? { ...item, visible: e.target.checked }
                          : item,
                      );
                      change({ ...draft, pages: nextPages });
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 dark:bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold text-lg">
          {t.websiteEditor.homepageSections}
        </h2>
        {draft.sections.map((section, index) => (
          <div
            key={section.id}
            className="flex items-center gap-3 border-b border-slate-200 dark:border-neutral-700 py-3"
          >
            <label className="flex-1 flex items-center gap-3">
              <input
                type="checkbox"
                checked={section.visible}
                onChange={(e) =>
                  change({
                    ...draft,
                    sections: draft.sections.map((s) =>
                      s.id === section.id
                        ? { ...s, visible: e.target.checked }
                        : s,
                    ),
                  })
                }
              />
              {labels[section.id]}
            </label>
            <button
              aria-label={`${t.websiteEditor.moveUp} ${labels[section.id]}`}
              disabled={index === 0}
              className={button}
              onClick={() => move(index, -1)}
            >
              ↑
            </button>
            <button
              aria-label={`${t.websiteEditor.moveDown} ${labels[section.id]}`}
              disabled={index === draft.sections.length - 1}
              className={button}
              onClick={() => move(index, 1)}
            >
              ↓
            </button>
          </div>
        ))}
      </section>
      <section className="space-y-4">
        <h2 className="font-bold text-lg">
          {t.websiteEditor.contactPageContent}
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {(
            [
              ["contactTitle"],
              ["contactIntro"],
              ["hours"],
              ["response"],
            ] as const
          ).flatMap(([key]) =>
            (["En", "Ar"] as const).map((lang) => {
              const name = `${key}${lang}` as `${typeof key}${typeof lang}`;
              return (
                <label key={name} className="text-sm space-y-2">
                  <span>
                    {(t.websiteEditor.contactFields as Record<string, string>)[key]} ({lang === "Ar" ? t.websiteEditor.inArabic : t.websiteEditor.inEnglish})
                  </span>
                  <textarea
                    dir={lang === "Ar" ? "rtl" : "ltr"}
                    rows={3}
                    maxLength={1500}
                    className={field}
                    value={draft[name] ?? ""}
                    onChange={(e) =>
                      change({ ...draft, [name]: e.target.value })
                    }
                  />
                </label>
              );
            }),
          )}
        </div>
      </section>
      <section className="space-y-4">
        <h2 className="font-bold text-lg">
          {t.websiteEditor.servicesShownOnTheWebsite}
        </h2>
        <p className="text-sm text-slate-500">
          {t.websiteEditor.namesAndDescriptionsComeFrom}{" "}
          <Link href={ROUTES.services} className="underline">
            {t.websiteEditor.serviceCatalogue}
          </Link>
        </p>
        {services.map((service) => (
          <form
            key={`${service.id}-${service.isPublic}-${service.imageUrl}`}
            className="grid sm:grid-cols-[1fr_2fr_auto] gap-3 items-center border-b border-slate-200 dark:border-neutral-700 pb-4"
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              run(() =>
                updateWebsiteServiceAction(
                  service.id,
                  form.get("isPublic") === "on",
                  String(form.get("imageUrl") || ""),
                ),
              );
            }}
          >
            <label className="flex items-center gap-2 text-sm">
              <input
                name="isPublic"
                type="checkbox"
                defaultChecked={service.isPublic}
              />
              {ar ? service.nameAr : service.nameEn}
            </label>
            <ServiceImageField
              initial={service.imageUrl || ""}
              placeholder={t.websiteEditor.imageUrlOptional}
            />
            <button disabled={busy} className={button}>
              {t.websiteEditor.save}
            </button>
          </form>
        ))}
      </section>
      <section className="space-y-3">
        <h2 className="font-bold">
          {t.websiteEditor.contentCollections}
        </h2>
        <p className="text-sm text-slate-500">
          {t.websiteEditor.afterTheFirstPublicationBanner}
        </p>
        <div className="flex flex-wrap gap-4">
          {(["banners", "portfolio", "clients", "faqs", "stats", "reviews"] as const).map(
            (path) => (
              <Link
                className="underline text-sm"
                key={path}
                href={ROUTES.cms[path]}
              >
                {path}
              </Link>
            ),
          )}
        </div>
      </section>
    </div>
  );
}

function ServiceImageField({ initial, placeholder }: { initial: string; placeholder: string }) {
  const [value, setValue] = React.useState(initial);
  return (
    <div>
      <input type="hidden" name="imageUrl" value={value} />
      <AssetUrlInput value={value} onChange={setValue} resource="settings" placeholder={placeholder} />
    </div>
  );
}
