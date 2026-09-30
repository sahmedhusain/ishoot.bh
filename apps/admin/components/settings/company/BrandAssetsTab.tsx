"use client";

import * as React from "react";
import type { CompanySettings } from "@ishoot/database/types";
import type { CompanyAssetItem } from "@ishoot/database";
import { Card } from "@ishoot/ui";
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
  recommended: string;
  themeContext?: "light" | "dark" | "any";
}

const ASSET_SLOTS: AssetSlotDef[] = [
  {
    key: "logo_light",
    titleKey: "logoLight",
    descKey: "logoLightDesc",
    accept: "image/svg+xml,image/png,image/webp",
    recommended: "Vector SVG or transparent PNG (Dark Text for Light Surfaces)",
    themeContext: "light",
  },
  {
    key: "logo_dark",
    titleKey: "logoDark",
    descKey: "logoDarkDesc",
    accept: "image/svg+xml,image/png,image/webp",
    recommended: "Vector SVG or white monochrome PNG (Light Text for Dark Surfaces)",
    themeContext: "dark",
  },
  {
    key: "icon_light",
    titleKey: "iconLight",
    descKey: "iconLightDesc",
    accept: "image/svg+xml,image/png",
    recommended: "Square 1:1 or 310x470 SVG or transparent PNG (Light Background)",
    themeContext: "light",
  },
  {
    key: "icon_dark",
    titleKey: "iconDark",
    descKey: "iconDarkDesc",
    accept: "image/svg+xml,image/png",
    recommended: "Square 1:1 or 310x470 SVG or transparent PNG (Dark Background)",
    themeContext: "dark",
  },
  {
    key: "favicon",
    titleKey: "favicon",
    descKey: "faviconDesc",
    accept: "image/svg+xml,image/png,image/x-icon",
    recommended: "Square 64x64px or 32x32px .png or .ico file",
    themeContext: "any",
  },
  {
    key: "stamp",
    titleKey: "stamp",
    descKey: "stampDesc",
    accept: "image/png,image/webp",
    recommended: "High-resolution circular or oval transparent PNG",
    themeContext: "light",
  },
  {
    key: "signature",
    titleKey: "signature",
    descKey: "signatureDesc",
    accept: "image/png,image/webp",
    recommended: "High-contrast clean transparent PNG with minimal padding",
    themeContext: "light",
  },
  {
    key: "letterhead_header",
    titleKey: "letterheadHeader",
    descKey: "letterheadHeaderDesc",
    accept: "image/png,image/jpeg,image/webp",
    recommended: "Full-width landscape banner (approx 2480x350px for A4 print)",
    themeContext: "light",
  },
  {
    key: "letterhead_footer",
    titleKey: "letterheadFooter",
    descKey: "letterheadFooterDesc",
    accept: "image/png,image/jpeg,image/webp",
    recommended: "Full-width landscape footer banner (approx 2480x250px)",
    themeContext: "light",
  },
  {
    key: "watermark",
    titleKey: "watermark",
    descKey: "watermarkDesc",
    accept: "image/png,image/svg+xml",
    recommended: "Large monochrome watermark with 10-15% transparency",
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
      const formData = new FormData();
      formData.append("file", file);
      formData.append("entityType", "company_asset");
      formData.append("entityId", slot.key);
      formData.append("customName", `${slot.key}-${file.name}`);
      formData.append("documentType", "branding_asset");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Upload failed");
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
        if (slot.key === "icon_light") setSettings((s) => ({ ...s, icon_url: data.fileUrl }));
        if (slot.key === "icon_dark") setSettings((s) => ({ ...s, dark_icon_url: data.fileUrl }));
        if (slot.key === "stamp") setSettings((s) => ({ ...s, stamp_url: data.fileUrl }));
        if (slot.key === "signature") setSettings((s) => ({ ...s, signature_url: data.fileUrl }));
      }
    } catch (err: any) {
      setErrorKey((prev) => ({ ...prev, [slot.key]: err.message || "Failed to upload asset" }));
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
      if (slotKey === "icon_light") setSettings((s) => ({ ...s, icon_url: "" }));
      if (slotKey === "icon_dark") setSettings((s) => ({ ...s, dark_icon_url: "" }));
      if (slotKey === "stamp") setSettings((s) => ({ ...s, stamp_url: "" }));
      if (slotKey === "signature") setSettings((s) => ({ ...s, signature_url: "" }));
    } catch (err: any) {
      setErrorKey((prev) => ({ ...prev, [slotKey]: err.message || "Failed to remove asset" }));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="p-6 bg-white dark:bg-[#202124] border border-[#dadce0] dark:border-[#3c4043] shadow-xs rounded-2xl space-y-6">
        <div className="flex items-center gap-3 pb-3 border-b border-[#dadce0] dark:border-[#3c4043]">
          <div className="p-2 rounded-xl bg-[#09937F]/10 text-[#09937F]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {t.companySettingsTabs.brandAssets}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t.companySettingsTabs.brandAssetsSubtitle}
            </p>
          </div>
        </div>

        {/* Brand Pairing Live Verification Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-100 to-slate-50 dark:from-neutral-900/60 dark:to-neutral-900/30 border border-slate-200 dark:border-neutral-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <span>Brand Identity Pairing (Icon + Wordmark)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono lowercase">
                  live database state
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">
                Always ensure the Brand Icon (mark) and Brand Wordmark (text) are placed side-by-side without mixing them up.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Light Theme Surface */}
            <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold border-b border-slate-100 pb-2">
                <span>{isRTL ? "الخلفية الفاتحة (فواتير، مستندات رسمية، طباعة)" : "Light Surface (Invoices, Letters, Print)"}</span>
                <span className="text-[10px] text-slate-400 font-mono">Pine Green + Emerald</span>
              </div>
              <div className="min-h-[80px] flex items-center justify-center gap-3.5 py-4">
                <img
                  src={settings.icon_url || "/brand/icon-light.svg"}
                  alt="Brand Icon Light"
                  className="h-10 w-auto object-contain shrink-0"
                />
                <img
                  src={settings.logo_url || "/brand/logo-text-dark.svg"}
                  alt="Brand Wordmark Dark Text"
                  className="h-7 w-auto object-contain"
                />
              </div>
              <div className="text-[10px] text-slate-400 text-center font-mono">
                icon_light (mark) + logo_light (dark text)
              </div>
            </div>

            {/* Dark Theme Surface */}
            <div className="p-6 rounded-xl bg-[#050807] border border-white/10 shadow-xs flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between text-[11px] text-white/70 font-semibold border-b border-white/10 pb-2">
                <span>{isRTL ? "الخلفية الداكنة (الموقع، لوحة التحكم، السينما)" : "Dark Surface (Web, Admin Portal, Cinema)"}</span>
                <span className="text-[10px] text-emerald-400 font-mono">Crisp White + Emerald</span>
              </div>
              <div className="min-h-[80px] flex items-center justify-center gap-3.5 py-4">
                <img
                  src={settings.dark_icon_url || "/brand/icon-dark.svg"}
                  alt="Brand Icon Dark"
                  className="h-10 w-auto object-contain shrink-0"
                />
                <img
                  src={settings.dark_logo_url || "/brand/logo-text-light.svg"}
                  alt="Brand Wordmark Light Text"
                  className="h-7 w-auto object-contain"
                />
              </div>
              <div className="text-[10px] text-white/40 text-center font-mono">
                icon_dark (mark) + logo_dark (light text)
              </div>
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
                className="p-4 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/30 flex flex-col justify-between space-y-4 hover:border-[#09937F]/40 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                        {title}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5 line-clamp-2">
                        {desc}
                      </p>
                    </div>
                    {currentAsset?.fileUrl ? (
                      <span className="p-1 rounded-full text-[#09937F] bg-emerald-50 dark:bg-emerald-950/40 shrink-0" title="Configured in Database">
                        <CheckCircle2 className="w-4 h-4" />
                      </span>
                    ) : null}
                  </div>

                  {/* Preview Display Box */}
                  <div className="mt-3 relative h-28 w-full rounded-lg border border-slate-200 dark:border-neutral-700/80 overflow-hidden flex items-center justify-center">
                    {slot.themeContext === "dark" ? (
                      <div className="absolute inset-0 bg-[#0B1210]" />
                    ) : (
                      <div className="absolute inset-0 bg-white" />
                    )}

                    {currentAsset?.fileUrl ? (
                      <img
                        src={currentAsset.fileUrl}
                        alt={title}
                        className="relative max-h-20 max-w-[85%] object-contain p-2"
                      />
                    ) : (
                      <div className="relative flex flex-col items-center justify-center text-slate-400 dark:text-neutral-500">
                        <ImageIcon className="w-7 h-7 stroke-1 mb-1" />
                        <span className="text-[10px] font-medium">
                          {t.companySettingsTabs.assetEmpty}
                        </span>
                      </div>
                    )}
                  </div>

                  <p className="text-[10px] text-slate-400 dark:text-neutral-500 mt-2">
                    {slot.recommended}
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-neutral-800">
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
                      className="flex-1 px-3 py-1.5 rounded-lg bg-[#014842] hover:bg-[#014842]/90 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors shadow-2xs disabled:opacity-60"
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
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-neutral-700 text-slate-600 dark:text-neutral-300 hover:text-[#014842] dark:hover:text-[#7de0d1] hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
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
