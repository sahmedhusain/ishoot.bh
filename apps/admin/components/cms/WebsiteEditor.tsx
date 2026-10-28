"use client";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges";
import { formatMessage } from "@platform/locales";
import { useConfirmation } from "@platform/ui";
import { errorMessage } from "../../lib/error-text";
import { formatDate } from "@platform/ui";
import { ROUTES } from "../../constants/routes";
import * as React from "react";
import { AssetUrlInput } from "../shared/AssetUrlInput";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ResolvedWebsiteConfig } from "@platform/database/website-config";
import type { ContentLanguage } from "@platform/database/constants/languages";
import type { BusinessActivity } from "@platform/database/website-presets";
import { WebsiteSetupFields } from "../setup/WebsiteSetupFields";
import { LanguageFields } from "../setup/LanguageFields";
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
import { SampleContentCard } from "./SampleContentCard";
export function WebsiteEditor({
  config,
  revision,
  publishedAt,
  canRestore,
  services,
  deliveryStatus,
  publication,
  company,
  sampleCount,
  categories,
}: {
  config: ResolvedWebsiteConfig;
  categories?: { slug: string; name_en: string; name_ar: string }[];
  company: { languages: ContentLanguage[]; primaryLanguage: ContentLanguage; activity: BusinessActivity | null; hasWhatsapp: boolean };
  deliveryStatus?: string;
  sampleCount: number;
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
  const confirmAction = useConfirmation();
  const { t, locale } = useAdminLocale();
  const ar = locale === "ar";
  const router = useRouter();
  const [draft, setDraft] = React.useState(config);
  const markSaved = useUnsavedChanges(draft);
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
    "w-full rounded-lg border border-outline-variant dark:border-outline-variant bg-transparent p-3 text-sm";
  const button =
    "rounded-lg border border-outline-variant dark:border-outline-variant px-4 py-2 text-sm disabled:opacity-50";
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
  function change(next: ResolvedWebsiteConfig) {
    setDraft(next);
    setDirty(true);
    setPreview("");
  }
  async function save() {
    const saved = await saveWebsiteDraftAction(draft, version);
    markSaved(draft);
    setVersion(saved.revision);
    setDirty(false);
    return saved.revision;
  }
  return (
    <div inert={busy} aria-busy={busy} className="max-w-5xl mx-auto space-y-8 pb-16">
      <header>
        <Link className="text-sm underline" href={ROUTES.settings.web}>
          {t.websiteEditor.websiteSettings}
        </Link>
        <h1 className="text-2xl font-bold mt-3">
          {t.websiteEditor.websitePublishing}
        </h1>
        <p className="text-sm text-ink-muted mt-2">
          {t.websiteEditor.arrangeSectionsEditContactContent}
        </p>
        {publishedAt && (
          <p className="text-xs text-ink-muted mt-2">
            {`${t.websiteEditor.lastPublished} ${formatDate(publishedAt, locale, "time")}`}
          </p>
        )}
        <div className="mt-3">
          <UnpublishedChangesNotice status={publication} canPublish />
        </div>
        <div className="mt-3">
          <SampleContentCard activity={company.activity} count={sampleCount} />
        </div>
        {deliveryStatus && (
          <p className="text-xs text-ink-muted mt-2">
            {t.websiteEditor.publicRefresh}{" "}
            {(t.websiteEditor.deliveryStatuses as Record<string, string>)[deliveryStatus] ?? deliveryStatus}
          </p>
        )}
      </header>
      <div className="flex flex-wrap gap-3 sticky top-0 z-10 bg-surface-raised dark:bg-surface-raised py-3 border-b border-outline-variant dark:border-outline-variant">
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
          onClick={() => confirmAction({
            title: t.websiteEditor.publishWebsite,
            description: t.websiteEditor.publishConfirm,
            variant: "warning",
            onConfirm: () => run(async () => {
              const current = dirty ? await save() : version;
              const result = await publishWebsiteAction(current);
              setVersion(result.revision);
            }),
          })}
        >
          {t.websiteEditor.publishWebsite}
        </button>
        {canRestore && (
          <button
            disabled={busy}
            className={button}
            onClick={() => confirmAction({ title: t.websiteEditor.restorePreviousPublication, description: formatMessage(t.websiteEditor.restoreConfirm, { version }), confirmMatchText: String(version), onConfirm: () => run(() => restoreWebsiteAction(version)) })}
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
      <section className="space-y-4 rounded-xl border p-5" data-page-section>
        <h2 className="font-bold">{t.websiteEditor.studioImageAndHistory}</h2>
        <div className="block space-y-1"><span>{t.websiteEditor.imageUrl}</span><AssetUrlInput value={draft.aboutImageUrl || ""} onChange={(url) => change({ ...draft, aboutImageUrl: url })} resource="settings" /></div>
        {(draft.pillars || []).map((entry, index) => <div key={index} className="grid gap-3 sm:grid-cols-2 border p-3 rounded">
          {(["titleEn", "titleAr", "textEn", "textAr"] as const).map(key => <label key={key}>{key}<textarea className={field} maxLength={1500} value={entry[key]} onChange={e => change({ ...draft, pillars: draft.pillars!.map((p, i) => i === index ? { ...p, [key]: e.target.value } : p) })} /></label>)}
          <button className={button} onClick={() => change({ ...draft, pillars: draft.pillars!.filter((_, i) => i !== index) })}>{t.websiteEditor.remove}</button>
        </div>)}
        <button className={button} disabled={(draft.pillars?.length || 0) >= 12} onClick={() => change({ ...draft, pillars: [...(draft.pillars || []), { titleEn: "", titleAr: "", textEn: "", textAr: "" }] })}>{t.websiteEditor.addHistoryEntry}</button>
        <p className="text-xs">{t.websiteEditor.emptyContentStaysHiddenSave}</p>
      </section>
      <WebsiteSetupFields
        categories={categories}
        config={draft}
        onChange={change}
        languages={company.languages}
        primaryLanguage={company.primaryLanguage}
        companyActivity={company.activity}
        hasWhatsapp={company.hasWhatsapp}
      />
      <section className="space-y-4" data-page-section>
        <h2 className="font-bold text-lg">
          {t.websiteEditor.contactPageContent}
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {(["contactTitle", "contactIntro", "response"] as const).map((key) => (
            <LanguageFields
              key={key}
              name={key}
              label={(t.websiteEditor.contactFields as Record<string, string>)[key]}
              languages={company.languages}
              multiline={key !== "contactTitle"}
              required={key === "contactTitle"}
              en={draft[`${key}En`]}
              ar={draft[`${key}Ar`]}
              onChange={(v) => change({ ...draft, [`${key}En`]: v.en, [`${key}Ar`]: v.ar })}
            />
          ))}
        </div>
      </section>
      <section className="space-y-4" data-page-section>
        <h2 className="font-bold text-lg">
          {t.websiteEditor.servicesShownOnTheWebsite}
        </h2>
        <p className="text-sm text-ink-muted">
          {t.websiteEditor.namesAndDescriptionsComeFrom}{" "}
          <Link href={ROUTES.services} className="underline">
            {t.websiteEditor.serviceCatalogue}
          </Link>
        </p>
        {services.map((service) => (
          <form
            key={`${service.id}-${service.isPublic}-${service.imageUrl}`}
            className="grid sm:grid-cols-[1fr_2fr_auto] gap-3 items-center border-b border-outline-variant dark:border-outline-variant pb-4"
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
      <section className="space-y-3" data-page-section>
        <h2 className="font-bold">
          {t.websiteEditor.contentCollections}
        </h2>
        <p className="text-sm text-ink-muted">
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
