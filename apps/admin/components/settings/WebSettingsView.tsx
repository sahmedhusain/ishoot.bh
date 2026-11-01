"use client";
import { PhoneInput } from "@platform/ui";
import { domainOrigin } from "@platform/database/constants/domains";
import { DomainSettingsCard } from "./DomainSettingsCard";

import { formatMessage } from "@platform/locales";
import { ROUTES } from "../../constants/routes";
import * as React from "react";
import Link from "next/link";
import type { CompanySettings, SocialLink } from "@platform/database/types";
import { Card, Input, Textarea } from "@platform/ui";
import {
  Globe,
  ExternalLink,
  RefreshCw, CheckCircle2,
  Film,
  Building2,
  Share2, User, Phone,
  Mail,
  MapPin, Layers,
  Star,
  HelpCircle, Camera,
  FolderOpen,
  Users,
  Shield,
  Save,
  Loader2
} from "lucide-react";
import {
  updateWebSettingsAction,
  revalidateEntireSiteAction,
  createSocialLinkAction,
  updateSocialLinkAction,
  deleteSocialLinkAction,
} from "../../app/actions/settings";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { usePermissions } from "../../hooks/usePermissions";
import { SettingsNavTabs } from "./SettingsNavTabs";
import { IconPicker } from "../shared/LazyIconPicker";
import { PlatformPicker, SocialBrandIcon } from "../shared/PlatformPicker";
import { PageHeader } from "../layout/PageHeader";

interface WebSettingsViewProps {
  initialSettings: CompanySettings;
  socialLinks?: SocialLink[];
  cmsCounts: {
    banners: number;
    portfolio: number;
    clients: number;
    equipment: number;
    reviews: number;
    pendingReviews: number;
    faqs: number;
    stats: number;
  };
}

export function WebSettingsView({
  initialSettings,
  cmsCounts,
  socialLinks = [],
}: WebSettingsViewProps) {
  const { t } = useAdminLocale();
  const { can } = usePermissions();
  const [settings, setSettings] =
    React.useState<CompanySettings>(initialSettings);
  const [activeTab, setActiveTab] = React.useState<
    "hero" | "narrative" | "legal" | "social" | "cms"
  >("hero");
  const [links, setLinks] = React.useState<SocialLink[]>(socialLinks);
  const [newLink, setNewLink] = React.useState({
    platform: "",
    url: "",
    icon: "",
    is_active: true,
    display_order: 0,
  });
  const [isSaving, setIsSaving] = React.useState(false);
  const [isRevalidating, setIsRevalidating] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [revalidateSuccess, setRevalidateSuccess] = React.useState(false);

  const handleAddSocialLink = async () => {
    if (!newLink.platform || !newLink.url) return;
    try {
      const res = await createSocialLinkAction(newLink);
      if (res.success) {
        setLinks([...links, res.link]);
        setNewLink({
          platform: "",
          url: "",
          icon: "",
          is_active: true,
          display_order: 0,
        });
      }
    } catch (e) { }
  };

  const handleToggleSocialLink = async (id: string, current: boolean) => {
    try {
      const res = await updateSocialLinkAction(id, { is_active: !current });
      if (res.success) {
        setLinks(links.map((l) => (l.id === id ? res.link : l)));
      }
    } catch (e) { }
  };

  const handleDeleteSocialLink = async (id: string) => {
    try {
      await deleteSocialLinkAction(id);
      setLinks(links.filter((l) => l.id !== id));
    } catch (e) { }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const res = await updateWebSettingsAction({ company_name_en: settings.company_name_en, company_name_ar: settings.company_name_ar, address_en: settings.address_en, address_ar: settings.address_ar, phone: settings.phone, whatsapp_phone: settings.whatsapp_phone, email: settings.email, website: settings.website, instagram_url: settings.instagram_url, linkedin_url: settings.linkedin_url, youtube_url: settings.youtube_url, ceo_name_en: settings.ceo_name_en, ceo_name_ar: settings.ceo_name_ar, ceo_title_en: settings.ceo_title_en, ceo_title_ar: settings.ceo_title_ar, ceo_quote_en: settings.ceo_quote_en, ceo_quote_ar: settings.ceo_quote_ar, mission_en: settings.mission_en, mission_ar: settings.mission_ar, vision_en: settings.vision_en, vision_ar: settings.vision_ar, about_text_en: settings.about_text_en, about_text_ar: settings.about_text_ar, terms_en: settings.terms_en, terms_ar: settings.terms_ar, rules_en: settings.rules_en, rules_ar: settings.rules_ar });
      if (res.success && res.settings) {
        setSettings(res.settings);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Failed to save web settings:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevalidate = async () => {
    setIsRevalidating(true);
    setRevalidateSuccess(false);

    try {
      await revalidateEntireSiteAction();
      setRevalidateSuccess(true);
      setTimeout(() => setRevalidateSuccess(false), 3000);
    } catch (err) {
      console.error("Revalidation failed:", err);
    } finally {
      setIsRevalidating(false);
    }
  };

  const webUrl = process.env.NEXT_PUBLIC_WEB_URL || domainOrigin(settings.website_domain) || settings.website || "";

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 animate-fade-in select-none">
      <Link
        href={ROUTES.cms.website}
        className="block rounded-xl bg-emerald-900 text-white p-5 font-semibold"
      >
        {t.webSettings.websiteEditorPreviewAndPublishing}
      </Link>
      {/* Top Navigation */}
      <PageHeader
        title={<><span>{t.webSettingsView.title}</span><span className="text-xs font-bold text-accent font-sans">
              &lt;&lt; {t.webSettingsView.badge} &gt;&gt;
            </span></>}
        actions={<div className="flex items-center gap-2.5">
          <button
            type="button"
            disabled={isRevalidating}
            onClick={handleRevalidate}
            className="px-3.5 py-2 rounded-xl bg-surface-raised border border-outline-variant dark:border-white/10 hover:border-accent/40 text-xs font-semibold text-ink hover:text-accent inline-flex items-center gap-2 transition-all shadow-2xs"
            title={t.webSettingsView.purgeTooltip}
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRevalidating ? "animate-spin text-accent" : ""}`}
            />
            <span>
              {revalidateSuccess
                ? t.webSettingsView.cachePurged
                : t.webSettingsView.purgeCache}
            </span>
          </button>

          <a
            href={webUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold inline-flex items-center gap-2 transition-all shadow-sm"
          >
            <Globe className="w-3.5 h-3.5 text-primary dark:text-mint" />
            <span>{t.webSettingsView.viewLiveWebsite}</span>
            <ExternalLink className="w-3 h-3 text-white/70" />
          </a>
        </div>}
      />

      {/* Settings Navigation Tabs */}
      <SettingsNavTabs />

      <DomainSettingsCard initialWebsiteDomain={settings.website_domain} initialAdminDomain={settings.admin_domain} canEdit={can("settings", "write")} />

      {/* Web Management Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-outline-variant dark:border-white/10 pb-3 overflow-x-auto" role="tablist">
        <button
          type="button"
          onClick={() => setActiveTab("hero")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === "hero"
            ? "bg-primary text-primary-foreground shadow-xs"
            : "text-ink-muted dark:text-ink-muted hover:text-ink dark:hover:text-white hover:bg-surface-sunken dark:hover:bg-white/5"
            }`}
         tabIndex={activeTab === "hero" ? 0 : -1} role="tab" aria-selected={activeTab === "hero"}>
          <Film className="w-4 h-4 text-accent" />
          <span>{t.webSettingsView.tabHero}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("narrative")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === "narrative"
            ? "bg-primary text-primary-foreground shadow-xs"
            : "text-ink-muted dark:text-ink-muted hover:text-ink dark:hover:text-white hover:bg-surface-sunken dark:hover:bg-white/5"
            }`}
         tabIndex={activeTab === "narrative" ? 0 : -1} role="tab" aria-selected={activeTab === "narrative"}>
          <Building2 className="w-4 h-4 text-accent" />
          <span>{t.webSettingsView.tabNarrative}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("legal")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === "legal"
            ? "bg-primary text-primary-foreground shadow-xs"
            : "text-ink-muted dark:text-ink-muted hover:text-ink dark:hover:text-white hover:bg-surface-sunken dark:hover:bg-white/5"
            }`}
         tabIndex={activeTab === "legal" ? 0 : -1} role="tab" aria-selected={activeTab === "legal"}>
          <Shield className="w-4 h-4 text-accent" />
          <span>{t.webSettings.termsAndPrivacy}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("social")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === "social"
            ? "bg-primary text-primary-foreground shadow-xs"
            : "text-ink-muted dark:text-ink-muted hover:text-ink dark:hover:text-white hover:bg-surface-sunken dark:hover:bg-white/5"
            }`}
         tabIndex={activeTab === "social" ? 0 : -1} role="tab" aria-selected={activeTab === "social"}>
          <Share2 className="w-4 h-4 text-accent" />
          <span>{t.webSettingsView.tabSocial}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("cms")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === "cms"
            ? "bg-primary text-primary-foreground shadow-xs"
            : "text-ink-muted dark:text-ink-muted hover:text-ink dark:hover:text-white hover:bg-surface-sunken dark:hover:bg-white/5"
            }`}
         tabIndex={activeTab === "cms" ? 0 : -1} role="tab" aria-selected={activeTab === "cms"}>
          <Layers className="w-4 h-4 text-accent" />
          <span>{t.webSettingsView.tabCms}</span>
          {cmsCounts.pendingReviews > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">
              {cmsCounts.pendingReviews}
            </span>
          )}
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* TAB 1: Hero & Media Showcase */}
        {activeTab === "hero" && (
          <div className="space-y-6" data-tab-panel>
            <Card className="p-6 bg-surface-raised border border-outline-variant dark:border-white/10 rounded-2xl space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-outline-variant dark:border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-accent/10 text-accent">
                    <Film className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-ink">
                      {t.webSettingsView.heroCardTitle}
                    </h3>
                    <p className="text-xs text-ink-muted">
                      {t.webSettingsView.heroCardDesc}
                    </p>
                  </div>
                </div>

                <Link
                  href={ROUTES.cms.banners}
                  className="px-3 py-1.5 rounded-lg bg-surface-sunken dark:bg-white/5 hover:bg-surface-sunken dark:hover:bg-white/10 text-xs font-semibold text-ink inline-flex items-center gap-1.5 transition-colors"
                >
                  <span>
                    {formatMessage(t.webSettingsView.manageBanners, { count: String(cmsCounts.banners) })}
                  </span>
                  <ExternalLink className="w-3 h-3 text-ink-muted" />
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-ink">
                    {t.webSettingsView.webNameEn}
                  </span>
                  <Input
                    value={settings.company_name_en}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        company_name_en: e.target.value,
                      })
                    }
                   dir="ltr"/>
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-ink">
                    {t.webSettingsView.webNameAr}
                  </span>
                  <Input
                    value={settings.company_name_ar}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        company_name_ar: e.target.value,
                      })
                    }
                    className="text-end font-arabic"
                   dir="rtl"/>
                </label>
              </div>

              <div className="p-4 rounded-xl bg-surface-raised dark:bg-white/[0.02] border border-outline-variant dark:border-white/5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-ink">
                    {t.webSettingsView.brandPresentationTitle}
                  </div>
                  <div className="text-[11px] text-ink-muted mt-0.5">
                    {t.webSettingsView.brandPresentationDesc}
                  </div>
                </div>
                <Link
                  href={ROUTES.settings.company}
                  className="text-xs font-bold text-accent hover:underline flex items-center gap-1"
                >
                  <span>{t.webSettingsView.brandPortal}</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 2: Brand Story, CEO & About */}
        {activeTab === "narrative" && (
          <div className="space-y-6" data-tab-panel>
            <Card className="p-6 bg-surface-raised border border-outline-variant dark:border-white/10 rounded-2xl space-y-6">
              <div className="flex items-center gap-2.5 pb-3 border-b border-outline-variant dark:border-white/10">
                <div className="p-2 rounded-xl bg-accent/10 text-accent">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink">
                    {t.webSettingsView.ceoStoryTitle}
                  </h3>
                  <p className="text-xs text-ink-muted">
                    {t.webSettingsView.ceoStoryDesc}
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {(["about_text_en", "about_text_ar"] as const).map(key => <label key={key} className="text-sm">{t.webSettings.studioStory} ({key === "about_text_ar" ? t.websiteEditor.inArabic : t.websiteEditor.inEnglish})<textarea rows={5} maxLength={20000} className="w-full border rounded p-3 bg-transparent" dir={key.endsWith("ar") ? "rtl" : "ltr"} value={settings[key] || ""} onChange={e => setSettings({ ...settings, [key]: e.target.value })} /></label>)}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-ink">
                    {t.webSettingsView.ceoNameEn}
                  </span>
                  <Input
                    placeholder={t.webSettingsView.ceoNameEnPlaceholder}
                    value={settings.ceo_name_en || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, ceo_name_en: e.target.value })
                    }
                   dir="ltr"/>
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-ink">
                    {t.webSettingsView.ceoNameAr}
                  </span>
                  <Input
                    placeholder={t.webSettingsView.ceoNameArPlaceholder}
                    value={settings.ceo_name_ar || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, ceo_name_ar: e.target.value })
                    }
                    className="text-end font-arabic"
                   dir="rtl"/>
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-ink">
                    {t.webSettingsView.ceoTitleEn}
                  </span>
                  <Input
                    placeholder={t.webSettingsView.ceoTitleEnPlaceholder}
                    value={settings.ceo_title_en || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, ceo_title_en: e.target.value })
                    }
                   dir="ltr"/>
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-ink">
                    {t.webSettingsView.ceoTitleAr}
                  </span>
                  <Input
                    placeholder={t.webSettingsView.ceoTitleArPlaceholder}
                    value={settings.ceo_title_ar || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, ceo_title_ar: e.target.value })
                    }
                    className="text-end font-arabic"
                   dir="rtl"/>
                </label>

                <label className="block space-y-1 md:col-span-2">
                  <span className="text-xs font-semibold text-ink">
                    {t.webSettingsView.ceoQuoteEn}
                  </span>
                  <Textarea
                    rows={2}
                    placeholder={t.webSettingsView.ceoQuoteEnPlaceholder}
                    value={settings.ceo_quote_en || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, ceo_quote_en: e.target.value })
                    }
                   dir="ltr"/>
                </label>

                <label className="block space-y-1 md:col-span-2">
                  <span className="text-xs font-semibold text-ink">
                    {t.webSettingsView.ceoQuoteAr}
                  </span>
                  <Textarea
                    rows={2}
                    placeholder={t.webSettingsView.ceoQuoteArPlaceholder}
                    value={settings.ceo_quote_ar || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, ceo_quote_ar: e.target.value })
                    }
                    className="text-end font-arabic"
                   dir="rtl"/>
                </label>
              </div>

              {/* Mission & Vision */}
              <div className="pt-4 border-t border-outline-variant dark:border-white/10 space-y-4">
                <div className="text-xs font-bold text-ink uppercase tracking-wider">
                  {t.webSettingsView.corporateMissionVision}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-ink">
                      {t.webSettingsView.missionEn}
                    </span>
                    <Textarea
                      rows={3}
                      value={settings.mission_en || ""}
                      onChange={(e) =>
                        setSettings({ ...settings, mission_en: e.target.value })
                      }
                      placeholder={t.webSettingsView.missionEnPlaceholder}
                     dir="ltr"/>
                  </label>

                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-ink">
                      {t.webSettingsView.missionAr}
                    </span>
                    <Textarea
                      rows={3}
                      value={settings.mission_ar || ""}
                      onChange={(e) =>
                        setSettings({ ...settings, mission_ar: e.target.value })
                      }
                      placeholder={t.webSettingsView.missionArPlaceholder}
                      className="text-end font-arabic"
                     dir="rtl"/>
                  </label>

                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-ink">
                      {t.webSettingsView.visionEn}
                    </span>
                    <Textarea
                      rows={3}
                      value={settings.vision_en || ""}
                      onChange={(e) =>
                        setSettings({ ...settings, vision_en: e.target.value })
                      }
                      placeholder={t.webSettingsView.visionEnPlaceholder}
                     dir="ltr"/>
                  </label>

                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-ink">
                      {t.webSettingsView.visionAr}
                    </span>
                    <Textarea
                      rows={3}
                      value={settings.vision_ar || ""}
                      onChange={(e) =>
                        setSettings({ ...settings, vision_ar: e.target.value })
                      }
                      placeholder={t.webSettingsView.visionArPlaceholder}
                      className="text-end font-arabic"
                     dir="rtl"/>
                  </label>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 2.5: Legal & Rules */}
        {activeTab === "legal" && (
          <div className="space-y-6" data-tab-panel>
            <Card className="p-6 bg-surface-raised border border-outline-variant dark:border-white/10 rounded-2xl space-y-6">
              <div className="flex items-center gap-2.5 pb-3 border-b border-outline-variant dark:border-white/10">
                <div className="p-2 rounded-xl bg-accent/10 text-accent">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink">
                    {t.webSettings.termsOfConditionsAndPrivacy}
                  </h3>
                  <p className="text-xs text-ink-muted">
                    {t.webSettings.manageTheTermsOfConditions}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-ink">
                    {t.webSettings.termsOfConditionsEnglish}
                  </span>
                  <Textarea
                    rows={6}
                    value={settings.terms_en || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, terms_en: e.target.value })
                    }
                   dir="ltr"/>
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-ink">
                    {t.webSettings.termsOfConditionsArabic}
                  </span>
                  <Textarea
                    rows={6}
                    value={settings.terms_ar || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, terms_ar: e.target.value })
                    }
                    className="text-end font-arabic"
                   dir="rtl"/>
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-ink">
                    {t.webSettings.privacyAndSecurityPolicyEnglish}
                  </span>
                  <Textarea
                    rows={6}
                    value={settings.rules_en || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, rules_en: e.target.value })
                    }
                   dir="ltr"/>
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-ink">
                    {t.webSettings.privacyAndSecurityPolicyArabic}
                  </span>
                  <Textarea
                    rows={6}
                    value={settings.rules_ar || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, rules_ar: e.target.value })
                    }
                    className="text-end font-arabic"
                   dir="rtl"/>
                </label>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 3: Contact & Social Channels */}
        {activeTab === "social" && (
          <div className="space-y-6" data-tab-panel>
            <Card className="p-6 bg-surface-raised border border-outline-variant dark:border-white/10 rounded-2xl space-y-6">
              <div className="flex items-center gap-2.5 pb-3 border-b border-outline-variant dark:border-white/10">
                <div className="p-2 rounded-xl bg-accent/10 text-accent">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink">
                    {t.webSettings.dynamicSocialLinks}
                  </h3>
                  <p className="text-xs text-ink-muted">
                    {t.webSettings.addAndManageSocialMedia}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_128px_auto] gap-3 items-end">
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] uppercase font-bold text-ink-muted">
                      {t.webSettings.platform}
                    </label>
                    <PlatformPicker
                      platform={newLink.platform}
                      onPlatformChange={(name, icon) => {
                        setNewLink((prev) => ({
                          ...prev,
                          platform: name,
                          icon: icon || prev.icon,
                        }));
                      }}
                    />
                  </div>
                  <label className="flex-1 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-ink-muted">
                      {t.copy.url}</span>
                    <Input
                      placeholder={t.copy.urlExample}
                      value={newLink.url}
                      onChange={(e) =>
                        setNewLink({ ...newLink, url: e.target.value })
                      }
                    />
                  </label>
                  <div className="min-w-0 space-y-1">
                    <label className="text-[10px] uppercase font-bold text-ink-muted">
                      {t.webSettings.iconOptional}
                    </label>
                    <IconPicker
                      value={newLink.icon}
                      onChange={(val) => setNewLink({ ...newLink, icon: val })}
                      placeholder={t.webSettings.eGInstagram}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSocialLink}
                    className="h-10 px-4 rounded-xl bg-accent text-accent-foreground text-xs font-bold hover:bg-accent-hover transition-colors"
                  >
                    {t.webSettings.addLink}
                  </button>
                </div>

                <div className="border border-outline-variant dark:border-white/10 rounded-xl overflow-x-auto">
                  <table className="w-full text-start text-sm">
                    <thead className="bg-surface-raised dark:bg-white/5 text-xs text-ink-muted">
                      <tr>
                        <th className="px-4 py-3 font-semibold">{t.webSettings.platform}</th>
                        <th className="px-4 py-3 font-semibold">{t.shared.url}</th>
                        <th className="px-4 py-3 font-semibold text-end">
                          {t.webSettings.actions}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant dark:divide-white/5">
                      {links.map((link) => (
                        <tr
                          key={link.id}
                          className="bg-surface-raised dark:bg-surface"
                        >
                          <td className="px-4 py-3 font-medium flex items-center gap-2">
                            <SocialBrandIcon name={link.platform} hint={link.icon} className="w-4 h-4 text-accent" />
                            {link.platform}
                            {!link.is_active && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-500/10 text-rose-500">
                                {t.webSettings.hidden}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-ink-muted truncate max-w-[200px]">
                            {link.url}
                          </td>
                          <td className="px-4 py-3 text-end space-x-2 rtl:space-x-reverse">
                            <button
                              type="button"
                              onClick={() =>
                                handleToggleSocialLink(link.id, link.is_active)
                              }
                              className="text-xs text-ink-muted hover:text-accent"
                            >
                              {link.is_active ? t.webSettings.hideLink : t.webSettings.showLink}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSocialLink(link.id)}
                              className="text-xs text-rose-500 hover:text-rose-400"
                            >
                              {t.webSettings.delete}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {links.length === 0 && (
                        <tr>
                          <td
                            colSpan={3}
                            className="px-4 py-8 text-center text-ink-muted text-xs"
                          >
                            {t.webSettings.noSocialLinksAddedYet}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-surface-raised border border-outline-variant dark:border-white/10 rounded-2xl space-y-6">
              <div className="flex items-center gap-2.5 pb-3 border-b border-outline-variant dark:border-white/10">
                <div className="p-2 rounded-xl bg-accent/10 text-accent">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink">
                    {t.webSettings.contactDetails}
                  </h3>
                  <p className="text-xs text-ink-muted">
                    {t.webSettings.phoneNumbersAndAddressesFor}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{t.webSettingsView.waPhone}</span>
                  </span>
                  <PhoneInput
                    value={settings.whatsapp_phone || ""}
                    onChange={(whatsapp_phone) => setSettings({ ...settings, whatsapp_phone })}
                    dir="ltr"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-ink-muted" />
                    <span>{t.webSettingsView.studioPhone}</span>
                  </span>
                  <PhoneInput
                    value={settings.phone}
                    onChange={(phone) => setSettings({ ...settings, phone })}
                    dir="ltr"
                  />
                </label>

                <label className="block space-y-1 md:col-span-2">
                  <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-ink-muted" />
                    <span>{t.webSettingsView.inquiriesEmail}</span>
                  </span>
                  <Input
                    value={settings.email}
                    onChange={(e) =>
                      setSettings({ ...settings, email: e.target.value })
                    }
                    dir="ltr"
                  />
                </label>

                <label className="block space-y-1 md:col-span-2">
                  <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-ink-muted" />
                    <span>{t.webSettingsView.addressEn}</span>
                  </span>
                  <Input
                    value={settings.address_en}
                    onChange={(e) =>
                      setSettings({ ...settings, address_en: e.target.value })
                    }
                   dir="ltr"/>
                </label>

                <label className="block space-y-1 md:col-span-2">
                  <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-ink-muted" />
                    <span>{t.webSettingsView.addressAr}</span>
                  </span>
                  <Input
                    value={settings.address_ar}
                    onChange={(e) =>
                      setSettings({ ...settings, address_ar: e.target.value })
                    }
                    className="text-end font-arabic"
                   dir="rtl"/>
                </label>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 4: CMS Content Hub & Live Stats */}
        {activeTab === "cms" && (
          <div className="space-y-6" data-tab-panel>
            <Card className="p-6 bg-surface-raised border border-outline-variant dark:border-white/10 rounded-2xl space-y-6">
              <div className="flex items-center gap-2.5 pb-3 border-b border-outline-variant dark:border-white/10">
                <div className="p-2 rounded-xl bg-accent/10 text-accent">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink">
                    {t.webSettingsView.cmsHubTitle}
                  </h3>
                  <p className="text-xs text-ink-muted">
                    {t.webSettingsView.cmsHubDesc}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Link
                  href={ROUTES.cms.banners}
                  className="p-4 rounded-xl border border-outline-variant dark:border-white/10 hover:border-accent/40 bg-surface-raised/50 dark:bg-white/[0.02] flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary text-primary-foreground">
                      <Film className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-ink group-hover:text-accent transition-colors">
                        {t.webSettingsView.manageShowcaseBanners}
                      </div>
                      <div className="text-[11px] text-ink-muted ">
                        {formatMessage(t.webSettingsView.cmsSlidesConfigured, { count: String(cmsCounts.banners) })}
                      </div>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-ink dark:text-ink-muted group-hover:text-accent" />
                </Link>

                <Link
                  href={ROUTES.cms.portfolio}
                  className="p-4 rounded-xl border border-outline-variant dark:border-white/10 hover:border-accent/40 bg-surface-raised/50 dark:bg-white/[0.02] flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary text-primary-foreground">
                      <FolderOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-ink group-hover:text-accent transition-colors">
                        {t.webSettingsView.managePortfolio}
                      </div>
                      <div className="text-[11px] text-ink-muted ">
                        {formatMessage(t.webSettingsView.cmsProjectsPublished, { count: String(cmsCounts.portfolio) })}
                      </div>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-ink dark:text-ink-muted group-hover:text-accent" />
                </Link>

                <Link
                  href={ROUTES.cms.clients}
                  className="p-4 rounded-xl border border-outline-variant dark:border-white/10 hover:border-accent/40 bg-surface-raised/50 dark:bg-white/[0.02] flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary text-primary-foreground">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-ink group-hover:text-accent transition-colors">
                        {t.webSettingsView.manageClients}
                      </div>
                      <div className="text-[11px] text-ink-muted ">
                        {formatMessage(t.webSettingsView.cmsPartnerLogos, { count: String(cmsCounts.clients) })}
                      </div>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-ink dark:text-ink-muted group-hover:text-accent" />
                </Link>

                <Link
                  href={ROUTES.cms.equipment}
                  className="p-4 rounded-xl border border-outline-variant dark:border-white/10 hover:border-accent/40 bg-surface-raised/50 dark:bg-white/[0.02] flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary text-primary-foreground">
                      <Camera className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-ink group-hover:text-accent transition-colors">
                        {t.webSettingsView.manageEquipment}
                      </div>
                      <div className="text-[11px] text-ink-muted ">
                        {formatMessage(t.webSettingsView.cmsCameraSystems, { count: String(cmsCounts.equipment) })}
                      </div>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-ink dark:text-ink-muted group-hover:text-accent" />
                </Link>

                <Link
                  href={ROUTES.cms.reviews}
                  className="p-4 rounded-xl border border-outline-variant dark:border-white/10 hover:border-accent/40 bg-surface-raised/50 dark:bg-white/[0.02] flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary text-primary-foreground">
                      <Star className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-ink group-hover:text-accent transition-colors flex items-center gap-1.5">
                        <span>{t.webSettingsView.manageReviews}</span>
                        {cmsCounts.pendingReviews > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500 text-white">
                            {formatMessage(t.webSettingsView.cmsNewBadge, { count: String(cmsCounts.pendingReviews) })}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-ink-muted ">
                        {formatMessage(t.webSettingsView.cmsClientReviews, { count: String(cmsCounts.reviews) })}
                      </div>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-ink dark:text-ink-muted group-hover:text-accent" />
                </Link>

                <Link
                  href={ROUTES.cms.faqs}
                  className="p-4 rounded-xl border border-outline-variant dark:border-white/10 hover:border-accent/40 bg-surface-raised/50 dark:bg-white/[0.02] flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary text-primary-foreground">
                      <HelpCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-ink group-hover:text-accent transition-colors">
                        {t.webSettingsView.manageFaqs}
                      </div>
                      <div className="text-[11px] text-ink-muted ">
                        {formatMessage(t.webSettingsView.cmsQuestionsConfigured, { count: String(cmsCounts.faqs) })}
                      </div>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-ink dark:text-ink-muted group-hover:text-accent" />
                </Link>
              </div>
            </Card>
          </div>
        )}

        {/* Save Bar */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-raised border border-outline-variant dark:border-white/10 shadow-xs">
          <div className="text-xs text-ink-muted flex items-center gap-2">
            {saveSuccess ? (
              <span className="text-emerald-500 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                {t.webSettingsView.savedSuccessMsg}
              </span>
            ) : (
              <span>{t.webSettingsView.instantUpdateNotice}</span>
            )}
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold inline-flex items-center gap-2 transition-all border border-accent/40 shadow-sm disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t.webSettingsView.saving}</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-primary dark:text-mint" />
                <span>{t.webSettingsView.saveSettings}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
