"use client";
import { formatMessage } from "@platform/locales";
import { errorMessage } from "../../../lib/error-text";
import { uploadFileDirectly } from "../../../lib/upload-client";
import { ContentImage } from "../../shared/ContentImage";

import * as React from "react";
import type { CompanySettings } from "@platform/database/types";
import type { CompanyAssetItem } from "@platform/database";
import { Card } from "@platform/ui";
import {
  Image as ImageIcon,
  UploadCloud,
  Loader2,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import type { Translations } from "../../../lib/translations";
import {
  saveCompanyAssetAction,
  deleteCompanyAssetAction,
} from "../../../app/actions/settings";

interface BrandAssetsTabProps {
  settings: CompanySettings;
  setSettings: React.Dispatch<React.SetStateAction<CompanySettings>>;
  assets: CompanyAssetItem[];
  setAssets: React.Dispatch<React.SetStateAction<CompanyAssetItem[]>>;
  t: Translations;
  locale: string;
  isRTL: boolean;
}

interface AssetSlotDef {
  key: string;
  titleKey: keyof Translations["branding"]["assets"];
  descKey: keyof Translations["branding"]["assets"];
  accept: string;
  recommended: keyof Translations["copy"];
  themeContext?: "light" | "dark" | "any";
}

const ASSET_SLOTS: AssetSlotDef[] = [
  {
    key: "logo_light",
    titleKey: "logoLight",
    descKey: "logoLightDesc",
    accept: "image/svg+xml,image/png,image/webp",
    recommended: "formatVectorDark",
    themeContext: "light",
  },
  {
    key: "logo_dark",
    titleKey: "logoDark",
    descKey: "logoDarkDesc",
    accept: "image/svg+xml,image/png,image/webp",
    recommended: "formatVectorLight",
    themeContext: "dark",
  },
  {
    key: "full_logo_light",
    titleKey: "fullLogoLight",
    descKey: "fullLogoLightDesc",
    accept: "image/svg+xml,image/png,image/webp",
    recommended: "formatFullLogo",
    themeContext: "light",
  },
  {
    key: "full_logo_dark",
    titleKey: "fullLogoDark",
    descKey: "fullLogoDarkDesc",
    accept: "image/svg+xml,image/png,image/webp",
    recommended: "formatFullLogo",
    themeContext: "dark",
  },
  {
    key: "icon_light",
    titleKey: "iconLight",
    descKey: "iconLightDesc",
    accept: "image/svg+xml,image/png",
    recommended: "formatIconLight",
    themeContext: "light",
  },
  {
    key: "icon_dark",
    titleKey: "iconDark",
    descKey: "iconDarkDesc",
    accept: "image/svg+xml,image/png",
    recommended: "formatIconDark",
    themeContext: "dark",
  },
  {
    key: "favicon",
    titleKey: "favicon",
    descKey: "faviconDesc",
    accept: "image/svg+xml,image/png,image/x-icon",
    recommended: "formatFavicon",
    themeContext: "any",
  },
  {
    key: "stamp",
    titleKey: "stamp",
    descKey: "stampDesc",
    accept: "image/png,image/webp",
    recommended: "formatStamp",
    themeContext: "light",
  },
  {
    key: "signature",
    titleKey: "signature",
    descKey: "signatureDesc",
    accept: "image/png,image/webp",
    recommended: "formatSignature",
    themeContext: "light",
  },
  {
    key: "letterhead_header",
    titleKey: "letterheadHeader",
    descKey: "letterheadHeaderDesc",
    accept: "image/png,image/jpeg,image/webp",
    recommended: "formatHeader",
    themeContext: "light",
  },
  {
    key: "letterhead_footer",
    titleKey: "letterheadFooter",
    descKey: "letterheadFooterDesc",
    accept: "image/png,image/jpeg,image/webp",
    recommended: "formatFooter",
    themeContext: "light",
  },
  {
    key: "watermark",
    titleKey: "watermark",
    descKey: "watermarkDesc",
    accept: "image/png,image/svg+xml",
    recommended: "formatWatermark",
    themeContext: "light",
  },
];

export function BrandAssetsTab({
  settings,
  setSettings,
  assets,
  setAssets,
  t,
  locale,
  isRTL,
}: BrandAssetsTabProps) {
  const [uploadingKey, setUploadingKey] = React.useState<string | null>(null);
  const [errorKey, setErrorKey] = React.useState<{ [key: string]: string }>({});
  const fileInputRefs = React.useRef<{ [key: string]: HTMLInputElement | null }>({});

  const assetMap = React.useMemo(() => {
    const map = new Map<string, CompanyAssetItem>();
    for (const a of assets) {
      map.set(a.assetKey, a);
    }
    return map;
  }, [assets]);

  const handleFileUpload = async (slot: AssetSlotDef, file: File) => {
    setUploadingKey(slot.key);
    setErrorKey((prev) => ({ ...prev, [slot.key]: "" }));

    try {
      const data = await uploadFileDirectly(file, { entityType: "company_asset", entityId: slot.key, customName: `${slot.key}-${file.name}`, documentType: "branding_asset" });
      const res = { ok: true }; // polyfill for following code
      if (!res.ok || !data.success) {
        throw new Error(data.error || t.brandAssetsTab.uploadFailed);
      }

      const title = (t.branding.assets[slot.titleKey] as string) || slot.key;

      const result = await saveCompanyAssetAction(slot.key, {
        title,
        fileUrl: data.fileUrl,
        mimeType: file.type,
        fileSize: file.size,
      });

      if (result.success && result.asset) {
        setAssets((prev) => {
          const filtered = prev.filter((a) => a.assetKey !== slot.key);
          return [...filtered, result.asset];
        });

        // Also update local settings state for matched keys
        if (slot.key === "logo_light") setSettings((s) => ({ ...s, logo_url: data.fileUrl }));
        if (slot.key === "logo_dark") setSettings((s) => ({ ...s, dark_logo_url: data.fileUrl }));
        if (slot.key === "full_logo_light") setSettings((s) => ({ ...s, full_logo_url: data.fileUrl }));
        if (slot.key === "full_logo_dark") setSettings((s) => ({ ...s, dark_full_logo_url: data.fileUrl }));
        if (slot.key === "letterhead_header") setSettings((s) => ({ ...s, document_header_url: data.fileUrl }));
        if (slot.key === "letterhead_footer") setSettings((s) => ({ ...s, document_footer_url: data.fileUrl }));
        if (slot.key === "icon_light") setSettings((s) => ({ ...s, icon_url: data.fileUrl }));
        if (slot.key === "icon_dark") setSettings((s) => ({ ...s, dark_icon_url: data.fileUrl }));
        if (slot.key === "stamp") setSettings((s) => ({ ...s, stamp_url: data.fileUrl }));
        if (slot.key === "signature") setSettings((s) => ({ ...s, signature_url: data.fileUrl }));
      }
    } catch (err: any) {
      setErrorKey((prev) => ({ ...prev, [slot.key]: errorMessage(err, t, t.brandAssetsTab.failedToUploadAsset) }));
    } finally {
      setUploadingKey(null);
      if (fileInputRefs.current[slot.key]) {
        fileInputRefs.current[slot.key]!.value = "";
      }
    }
  };

  const handleRemoveAsset = async (slotKey: string) => {
    try {
      await deleteCompanyAssetAction(slotKey);
      setAssets((prev) => prev.filter((a) => a.assetKey !== slotKey));

      if (slotKey === "logo_light") setSettings((s) => ({ ...s, logo_url: "" }));
      if (slotKey === "logo_dark") setSettings((s) => ({ ...s, dark_logo_url: "" }));
      if (slotKey === "full_logo_light") setSettings((s) => ({ ...s, full_logo_url: "" }));
      if (slotKey === "full_logo_dark") setSettings((s) => ({ ...s, dark_full_logo_url: "" }));
      if (slotKey === "letterhead_header") setSettings((s) => ({ ...s, document_header_url: "" }));
      if (slotKey === "letterhead_footer") setSettings((s) => ({ ...s, document_footer_url: "" }));
      if (slotKey === "icon_light") setSettings((s) => ({ ...s, icon_url: "" }));
      if (slotKey === "icon_dark") setSettings((s) => ({ ...s, dark_icon_url: "" }));
      if (slotKey === "stamp") setSettings((s) => ({ ...s, stamp_url: "" }));
      if (slotKey === "signature") setSettings((s) => ({ ...s, signature_url: "" }));
    } catch (err: any) {
      setErrorKey((prev) => ({ ...prev, [slotKey]: errorMessage(err, t, t.brandAssetsTab.failedToRemoveAsset) }));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="p-6 bg-surface-raised dark:bg-surface-container-low border border-outline-variant dark:border-outline-variant shadow-xs rounded-2xl space-y-6">
        <div className="flex items-center gap-3 pb-3 border-b border-outline-variant dark:border-outline-variant">
          <div className="p-2 rounded-xl bg-accent/10 text-accent">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-ink dark:text-ink">
              {t.companySettingsTabs.brandAssets}
            </h2>
            <p className="text-xs text-ink-muted dark:text-ink-muted">
              {t.companySettingsTabs.brandAssetsSubtitle}
            </p>
          </div>
        </div>

        {/* Brand Pairing Live Verification Card */}
        <div className="p-5 rounded-2xl bg-surface-container border border-outline-variant dark:border-outline-variant space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold text-ink dark:text-ink uppercase tracking-wider flex items-center gap-2">
                <span>{t.brandAssetsTab.brandIdentityPairingIconWordmark}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20  lowercase">
                  {t.brandAssetsTab.liveDatabaseState}
                </span>
              </h3>
              <p className="text-[11px] text-ink-muted dark:text-ink-muted mt-0.5">
                {t.brandAssetsTab.alwaysEnsureTheBrandIcon}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Light Theme Surface */}
            <div className="p-6 rounded-xl bg-surface-raised border border-outline-variant shadow-xs flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between text-[11px] text-ink-muted font-semibold border-b border-outline-variant pb-2">
                <span>{t.brandAssetsTab.lightSurfaceInvoicesLettersPrint}</span>
              </div>
              <div className="min-h-[80px] flex items-center justify-center gap-3.5 py-4">
                {settings.full_logo_url ? (
                  <ContentImage
                    src={settings.full_logo_url}
                    alt={t.branding.assets.fullLogoLight}
                    className="h-10 w-auto object-contain"
                  />
                ) : (
                  <>
                    {settings.icon_url ? (
                      <ContentImage
                        src={settings.icon_url}
                        alt={t.brandAssetsTab.brandIconLight}
                        className="h-10 w-auto object-contain shrink-0"
                      />
                    ) : null}
                    {settings.logo_url ? (
                      <ContentImage
                        src={settings.logo_url}
                        alt={t.brandAssetsTab.brandWordmarkDarkText}
                        className="h-7 w-auto object-contain"
                      />
                    ) : null}
                  </>
                )}
              </div>
              <div className="text-[10px] text-ink-muted text-center ">
                {t.copy.logoLightPreview}</div>
            </div>

            {/* Dark Theme Surface */}
            <div className="p-6 rounded-xl bg-surface-sunken border border-outline-variant shadow-xs flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between text-[11px] text-ink/70 font-semibold border-b border-outline-variant pb-2">
                <span>{t.brandAssetsTab.darkSurfaceWebAdminPortal}</span>
              </div>
              <div className="min-h-[80px] flex items-center justify-center gap-3.5 py-4">
                {settings.dark_full_logo_url ? (
                  <ContentImage
                    src={settings.dark_full_logo_url}
                    alt={t.branding.assets.fullLogoDark}
                    className="h-10 w-auto object-contain"
                  />
                ) : (
                  <>
                    {settings.dark_icon_url ? (
                      <ContentImage
                        src={settings.dark_icon_url}
                        alt={t.brandAssetsTab.brandIconDark}
                        className="h-10 w-auto object-contain shrink-0"
                      />
                    ) : null}
                    {settings.dark_logo_url ? (
                      <ContentImage
                        src={settings.dark_logo_url}
                        alt={t.brandAssetsTab.brandWordmarkLightText}
                        className="h-7 w-auto object-contain"
                      />
                    ) : null}
                  </>
                )}
              </div>
              <div className="text-[10px] text-ink/40 text-center ">
                {t.copy.logoDarkPreview}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {ASSET_SLOTS.map((slot) => {
            const currentAsset = assetMap.get(slot.key);
            const isUploading = uploadingKey === slot.key;
            const error = errorKey[slot.key];
            const title = (t.branding.assets[slot.titleKey] as string) || slot.key;
            const desc = (t.branding.assets[slot.descKey] as string) || "";

            return (
              <div
                key={slot.key}
                className="p-4 rounded-xl border border-outline-variant dark:border-outline-variant bg-surface-raised/50 dark:bg-surface-raised/30 flex flex-col justify-between space-y-4 hover:border-accent/40 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-bold text-ink dark:text-ink">
                        {title}
                      </h3>
                      <p className="text-[11px] text-ink-muted dark:text-ink-muted mt-0.5 line-clamp-2">
                        {desc}
                      </p>
                    </div>
                    {currentAsset?.fileUrl ? (
                      <span className="p-1 rounded-full text-accent bg-emerald-50 dark:bg-emerald-950/40 shrink-0" title={t.brandAssetsTab.configuredInDatabase}>
                        <CheckCircle2 className="w-4 h-4" />
                      </span>
                    ) : null}
                  </div>

                  {/* Preview Display Box */}
                  <div className="mt-3 relative h-28 w-full rounded-lg border border-outline-variant dark:border-outline-variant/80 overflow-hidden flex items-center justify-center">
                    {slot.themeContext === "dark" ? (
                      <div className="absolute inset-0 bg-surface" />
                    ) : (
                      <div className="absolute inset-0 bg-surface-raised" />
                    )}

                    {currentAsset?.fileUrl ? (
                      <ContentImage
                        src={currentAsset.fileUrl}
                        alt={title}
                        className="relative max-h-20 max-w-[85%] object-contain p-2"
                      />
                    ) : (
                      <div className="relative flex flex-col items-center justify-center text-ink-muted dark:text-ink-muted">
                        <ImageIcon className="w-7 h-7 stroke-1 mb-1" />
                        <span className="text-[10px] font-medium">
                          {t.companySettingsTabs.assetEmpty}
                        </span>
                      </div>
                    )}
                  </div>

                  <p className="text-[10px] text-ink-muted dark:text-ink-muted mt-2">
                    {formatMessage(t.copy[slot.recommended], { sizes: "64 × 64 / 32 × 32", dimensions: slot.key === "letterhead_header" ? "2480 × 350" : "2480 × 250", percent: "10–15" })}
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-outline-variant/60 dark:border-outline-variant">
                  <input
                    ref={(el) => {
                      fileInputRefs.current[slot.key] = el;
                    }}
                    type="file"
                    accept={slot.accept}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(slot, file);
                    }}
                  />

                  {error ? (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                      {error}
                    </p>
                  ) : null}

                  <div className="flex items-center gap-2 justify-between">
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={() => fileInputRefs.current[slot.key]?.click()}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors shadow-2xs disabled:opacity-60"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>{t.companySettingsTabs.uploading}</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>
                            {currentAsset?.fileUrl
                              ? t.companySettingsTabs.assetReplace
                              : t.companySettingsTabs.assetUpload}
                          </span>
                        </>
                      )}
                    </button>

                    {currentAsset?.fileUrl ? (
                      <>
                        <a
                          href={currentAsset.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg border border-outline-variant dark:border-outline-variant text-ink-muted dark:text-ink hover:text-primary dark:hover:text-mint hover:bg-surface-sunken dark:hover:bg-surface-raised transition-colors"
                          title={t.actions.view}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleRemoveAsset(slot.key)}
                          className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title={t.companySettingsTabs.assetRemove}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
