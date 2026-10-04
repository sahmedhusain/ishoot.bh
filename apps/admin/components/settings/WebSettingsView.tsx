"use client";

import * as React from "react";
import Link from "next/link";
import type { CompanySettings, SocialLink } from "@ishoot/database/types";
import { Card, Input, Textarea } from "@ishoot/ui";
import {
  Globe,
  ExternalLink,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Film,
  Building2,
  Share2,
  FileText,
  User,
  Instagram,
  Linkedin,
  Youtube,
  Phone,
  Mail,
  MapPin,
  Sliders,
  Layers,
  Star,
  HelpCircle,
  BarChart3,
  Camera,
  FolderOpen,
  Users,
  Shield,
  Save,
  Loader2,
} from "lucide-react";
import {
  updateWebSettingsAction,
  revalidateEntireSiteAction,
  createSocialLinkAction,
  updateSocialLinkAction,
  deleteSocialLinkAction,
} from "../../app/actions/settings";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { SettingsNavTabs } from "./SettingsNavTabs";
import { IconPicker } from "../shared/IconPicker";
import { PlatformPicker } from "../shared/PlatformPicker";

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
  const { isRTL, t } = useAdminLocale();
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
    } catch (e) {}
  };

  const handleToggleSocialLink = async (id: string, current: boolean) => {
    try {
      const res = await updateSocialLinkAction(id, { is_active: !current });
      if (res.success) {
        setLinks(links.map((l) => (l.id === id ? res.link : l)));
      }
    } catch (e) {}
  };

  const handleDeleteSocialLink = async (id: string) => {
    try {
      await deleteSocialLinkAction(id);
      setLinks(links.filter((l) => l.id !== id));
    } catch (e) {}
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const res = await updateWebSettingsAction(settings);
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

  const webUrl = process.env.NEXT_PUBLIC_WEB_URL || "https://ishoot.bh";

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 animate-fade-in select-none">
      <Link
        href="/dashboard/cms/website"
        className="block rounded-xl bg-emerald-900 text-white p-5 font-semibold"
      >
        {isRTL
          ? "تحرير الموقع والمعاينة والنشر ←"
          : "Website editor, preview & publishing →"}
      </Link>
      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <span>{t.webSettingsView.title}</span>
            <span className="text-xs font-bold text-[#09937F] font-sans">
              &lt;&lt; {t.webSettingsView.badge} &gt;&gt;
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
            {t.webSettingsView.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            disabled={isRevalidating}
            onClick={handleRevalidate}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#111C19] border border-slate-200 dark:border-white/10 hover:border-[#09937F]/40 text-xs font-semibold text-slate-700 dark:text-neutral-200 hover:text-[#09937F] inline-flex items-center gap-2 transition-all shadow-2xs"
            title={t.webSettingsView.purgeTooltip}
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRevalidating ? "animate-spin text-[#09937F]" : ""}`}
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
            className="px-4 py-2 rounded-xl bg-[#014842] hover:bg-[#014842]/90 text-white text-xs font-bold inline-flex items-center gap-2 transition-all shadow-sm"
          >
            <Globe className="w-3.5 h-3.5 text-[#5EEAD4]" />
            <span>{t.webSettingsView.viewLiveWebsite}</span>
            <ExternalLink className="w-3 h-3 text-white/70" />
          </a>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <SettingsNavTabs />

      {/* Web Management Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-3 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("hero")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "hero"
              ? "bg-[#014842] text-white shadow-xs"
              : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
          }`}
        >
          <Film className="w-4 h-4 text-[#09937F]" />
          <span>{t.webSettingsView.tabHero}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("narrative")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "narrative"
              ? "bg-[#014842] text-white shadow-xs"
              : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
          }`}
        >
          <Building2 className="w-4 h-4 text-[#09937F]" />
          <span>{t.webSettingsView.tabNarrative}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("legal")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "legal"
              ? "bg-[#014842] text-white shadow-xs"
              : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
          }`}
        >
          <Shield className="w-4 h-4 text-[#09937F]" />
          <span>Terms & Privacy</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("social")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "social"
              ? "bg-[#014842] text-white shadow-xs"
              : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
          }`}
        >
          <Share2 className="w-4 h-4 text-[#09937F]" />
          <span>{t.webSettingsView.tabSocial}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("cms")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "cms"
              ? "bg-[#014842] text-white shadow-xs"
              : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
          }`}
        >
          <Layers className="w-4 h-4 text-[#09937F]" />
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
          <div className="space-y-6">
            <Card className="p-6 bg-white dark:bg-[#111C19] border border-slate-200 dark:border-white/10 rounded-2xl space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#09937F]/10 text-[#09937F]">
                    <Film className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {t.webSettingsView.heroCardTitle}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-neutral-400">
                      {t.webSettingsView.heroCardDesc}
                    </p>
                  </div>
                </div>

                <Link
                  href="/dashboard/cms/banners"
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-semibold text-slate-700 dark:text-neutral-300 inline-flex items-center gap-1.5 transition-colors"
                >
                  <span>
                    {t.webSettingsView.manageBanners.replace(
                      "{count}",
                      String(cmsCounts.banners),
                    )}
                  </span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                    {t.webSettingsView.webNameEn}
                  </label>
                  <Input
                    value={settings.company_name_en}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        company_name_en: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                    {t.webSettingsView.webNameAr}
                  </label>
                  <Input
                    value={settings.company_name_ar}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        company_name_ar: e.target.value,
                      })
                    }
                    className="text-right font-arabic"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    {t.webSettingsView.brandPresentationTitle}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">
                    {t.webSettingsView.brandPresentationDesc}
                  </div>
                </div>
                <Link
                  href="/dashboard/settings/company"
                  className="text-xs font-bold text-[#09937F] hover:underline flex items-center gap-1"
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
          <div className="space-y-6">
            <Card className="p-6 bg-white dark:bg-[#111C19] border border-slate-200 dark:border-white/10 rounded-2xl space-y-6">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-white/10">
                <div className="p-2 rounded-xl bg-[#09937F]/10 text-[#09937F]">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {t.webSettingsView.ceoStoryTitle}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-neutral-400">
                    {t.webSettingsView.ceoStoryDesc}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                    {t.webSettingsView.ceoNameEn}
                  </label>
                  <Input
                    placeholder={t.webSettingsView.ceoNameEnPlaceholder}
                    value={settings.ceo_name_en || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, ceo_name_en: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                    {t.webSettingsView.ceoNameAr}
                  </label>
                  <Input
                    placeholder={t.webSettingsView.ceoNameArPlaceholder}
                    value={settings.ceo_name_ar || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, ceo_name_ar: e.target.value })
                    }
                    className="text-right font-arabic"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                    {t.webSettingsView.ceoTitleEn}
                  </label>
                  <Input
                    placeholder={t.webSettingsView.ceoTitleEnPlaceholder}
                    value={settings.ceo_title_en || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, ceo_title_en: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                    {t.webSettingsView.ceoTitleAr}
                  </label>
                  <Input
                    placeholder={t.webSettingsView.ceoTitleArPlaceholder}
                    value={settings.ceo_title_ar || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, ceo_title_ar: e.target.value })
                    }
                    className="text-right font-arabic"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                    {t.webSettingsView.ceoQuoteEn}
                  </label>
                  <Textarea
                    rows={2}
                    placeholder={t.webSettingsView.ceoQuoteEnPlaceholder}
                    value={settings.ceo_quote_en || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, ceo_quote_en: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                    {t.webSettingsView.ceoQuoteAr}
                  </label>
                  <Textarea
                    rows={2}
                    placeholder={t.webSettingsView.ceoQuoteArPlaceholder}
                    value={settings.ceo_quote_ar || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, ceo_quote_ar: e.target.value })
                    }
                    className="text-right font-arabic"
                  />
                </div>
              </div>

              {/* Mission & Vision */}
              <div className="pt-4 border-t border-slate-100 dark:border-white/10 space-y-4">
                <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  {t.webSettingsView.corporateMissionVision}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                      {t.webSettingsView.missionEn}
                    </label>
                    <Textarea
                      rows={3}
                      value={settings.mission_en || ""}
                      onChange={(e) =>
                        setSettings({ ...settings, mission_en: e.target.value })
                      }
                      placeholder={t.webSettingsView.missionEnPlaceholder}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                      {t.webSettingsView.missionAr}
                    </label>
                    <Textarea
                      rows={3}
                      value={settings.mission_ar || ""}
                      onChange={(e) =>
                        setSettings({ ...settings, mission_ar: e.target.value })
                      }
                      placeholder={t.webSettingsView.missionArPlaceholder}
                      className="text-right font-arabic"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                      {t.webSettingsView.visionEn}
                    </label>
                    <Textarea
                      rows={3}
                      value={settings.vision_en || ""}
                      onChange={(e) =>
                        setSettings({ ...settings, vision_en: e.target.value })
                      }
                      placeholder={t.webSettingsView.visionEnPlaceholder}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                      {t.webSettingsView.visionAr}
                    </label>
                    <Textarea
                      rows={3}
                      value={settings.vision_ar || ""}
                      onChange={(e) =>
                        setSettings({ ...settings, vision_ar: e.target.value })
                      }
                      placeholder={t.webSettingsView.visionArPlaceholder}
                      className="text-right font-arabic"
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 2.5: Legal & Rules */}
        {activeTab === "legal" && (
          <div className="space-y-6">
            <Card className="p-6 bg-white dark:bg-[#111C19] border border-slate-200 dark:border-white/10 rounded-2xl space-y-6">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-white/10">
                <div className="p-2 rounded-xl bg-[#09937F]/10 text-[#09937F]">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Terms of Conditions & Privacy & Security
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-neutral-400">
                    Manage the terms of conditions and privacy & security policies
                    displayed on the website.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                    Terms of Conditions (English)
                  </label>
                  <Textarea
                    rows={6}
                    value={settings.terms_en || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, terms_en: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                    Terms of Conditions (Arabic)
                  </label>
                  <Textarea
                    rows={6}
                    value={settings.terms_ar || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, terms_ar: e.target.value })
                    }
                    className="text-right font-arabic"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                    Privacy & Security Policy (English)
                  </label>
                  <Textarea
                    rows={6}
                    value={settings.rules_en || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, rules_en: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                    Privacy & Security Policy (Arabic)
                  </label>
                  <Textarea
                    rows={6}
                    value={settings.rules_ar || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, rules_ar: e.target.value })
                    }
                    className="text-right font-arabic"
                  />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 3: Contact & Social Channels */}
        {activeTab === "social" && (
          <div className="space-y-6">
            <Card className="p-6 bg-white dark:bg-[#111C19] border border-slate-200 dark:border-white/10 rounded-2xl space-y-6">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-white/10">
                <div className="p-2 rounded-xl bg-[#09937F]/10 text-[#09937F]">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Dynamic Social Links
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-neutral-400">
                    Add and manage social media links displayed on the website.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500">
                      Platform
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
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500">
                      URL
                    </label>
                    <Input
                      placeholder="https://..."
                      value={newLink.url}
                      onChange={(e) =>
                        setNewLink({ ...newLink, url: e.target.value })
                      }
                    />
                  </div>
                  <div className="w-32 space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500">
                      Icon (Optional)
                    </label>
                    <IconPicker
                      value={newLink.icon}
                      onChange={(val) => setNewLink({ ...newLink, icon: val })}
                      placeholder="e.g. Instagram"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSocialLink}
                    className="h-10 px-4 rounded-xl bg-[#09937F] text-white text-xs font-bold hover:bg-[#0BB49B] transition-colors"
                  >
                    Add Link
                  </button>
                </div>

                <div className="border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-white/5 text-xs text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Platform</th>
                        <th className="px-4 py-3 font-semibold">URL</th>
                        <th className="px-4 py-3 font-semibold text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                      {links.map((link) => (
                        <tr
                          key={link.id}
                          className="bg-white dark:bg-[#0B1210]"
                        >
                          <td className="px-4 py-3 font-medium flex items-center gap-2">
                            {link.platform}
                            {!link.is_active && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-500/10 text-rose-500">
                                Hidden
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-500 truncate max-w-[200px]">
                            {link.url}
                          </td>
                          <td className="px-4 py-3 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleToggleSocialLink(link.id, link.is_active)
                              }
                              className="text-xs text-slate-500 hover:text-white"
                            >
                              {link.is_active ? "Hide" : "Show"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSocialLink(link.id)}
                              className="text-xs text-rose-500 hover:text-rose-400"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {links.length === 0 && (
                        <tr>
                          <td
                            colSpan={3}
                            className="px-4 py-8 text-center text-slate-500 text-xs"
                          >
                            No social links added yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-white dark:bg-[#111C19] border border-slate-200 dark:border-white/10 rounded-2xl space-y-6">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-white/10">
                <div className="p-2 rounded-xl bg-[#09937F]/10 text-[#09937F]">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Contact Details
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-neutral-400">
                    Phone numbers and addresses for the website contact page.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{t.webSettingsView.waPhone}</span>
                  </label>
                  <Input
                    placeholder={t.webSettingsView.phonePlaceholder}
                    value={settings.whatsapp_phone || ""}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        whatsapp_phone: e.target.value,
                      })
                    }
                    dir="ltr"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{t.webSettingsView.studioPhone}</span>
                  </label>
                  <Input
                    value={settings.phone}
                    onChange={(e) =>
                      setSettings({ ...settings, phone: e.target.value })
                    }
                    dir="ltr"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{t.webSettingsView.inquiriesEmail}</span>
                  </label>
                  <Input
                    value={settings.email}
                    onChange={(e) =>
                      setSettings({ ...settings, email: e.target.value })
                    }
                    dir="ltr"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{t.webSettingsView.addressEn}</span>
                  </label>
                  <Input
                    value={settings.address_en}
                    onChange={(e) =>
                      setSettings({ ...settings, address_en: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{t.webSettingsView.addressAr}</span>
                  </label>
                  <Input
                    value={settings.address_ar}
                    onChange={(e) =>
                      setSettings({ ...settings, address_ar: e.target.value })
                    }
                    className="text-right font-arabic"
                  />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 4: CMS Content Hub & Live Stats */}
        {activeTab === "cms" && (
          <div className="space-y-6">
            <Card className="p-6 bg-white dark:bg-[#111C19] border border-slate-200 dark:border-white/10 rounded-2xl space-y-6">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-white/10">
                <div className="p-2 rounded-xl bg-[#09937F]/10 text-[#09937F]">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {t.webSettingsView.cmsHubTitle}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-neutral-400">
                    {t.webSettingsView.cmsHubDesc}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Link
                  href="/dashboard/cms/banners"
                  className="p-4 rounded-xl border border-slate-200 dark:border-white/10 hover:border-[#09937F]/40 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-[#014842] text-white">
                      <Film className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#09937F] transition-colors">
                        {t.webSettingsView.manageShowcaseBanners}
                      </div>
                      <div className="text-[11px] text-slate-400 ">
                        {t.webSettingsView.cmsSlidesConfigured.replace(
                          "{count}",
                          String(cmsCounts.banners),
                        )}
                      </div>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-300 dark:text-neutral-600 group-hover:text-[#09937F]" />
                </Link>

                <Link
                  href="/dashboard/cms/portfolio"
                  className="p-4 rounded-xl border border-slate-200 dark:border-white/10 hover:border-[#09937F]/40 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-[#014842] text-white">
                      <FolderOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#09937F] transition-colors">
                        {t.webSettingsView.managePortfolio}
                      </div>
                      <div className="text-[11px] text-slate-400 ">
                        {t.webSettingsView.cmsProjectsPublished.replace(
                          "{count}",
                          String(cmsCounts.portfolio),
                        )}
                      </div>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-300 dark:text-neutral-600 group-hover:text-[#09937F]" />
                </Link>

                <Link
                  href="/dashboard/cms/clients"
                  className="p-4 rounded-xl border border-slate-200 dark:border-white/10 hover:border-[#09937F]/40 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-[#014842] text-white">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#09937F] transition-colors">
                        {t.webSettingsView.manageClients}
                      </div>
                      <div className="text-[11px] text-slate-400 ">
                        {t.webSettingsView.cmsPartnerLogos.replace(
                          "{count}",
                          String(cmsCounts.clients),
                        )}
                      </div>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-300 dark:text-neutral-600 group-hover:text-[#09937F]" />
                </Link>

                <Link
                  href="/dashboard/cms/equipment"
                  className="p-4 rounded-xl border border-slate-200 dark:border-white/10 hover:border-[#09937F]/40 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-[#014842] text-white">
                      <Camera className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#09937F] transition-colors">
                        {t.webSettingsView.manageEquipment}
                      </div>
                      <div className="text-[11px] text-slate-400 ">
                        {t.webSettingsView.cmsCameraSystems.replace(
                          "{count}",
                          String(cmsCounts.equipment),
                        )}
                      </div>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-300 dark:text-neutral-600 group-hover:text-[#09937F]" />
                </Link>

                <Link
                  href="/dashboard/cms/reviews"
                  className="p-4 rounded-xl border border-slate-200 dark:border-white/10 hover:border-[#09937F]/40 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-[#014842] text-white">
                      <Star className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#09937F] transition-colors flex items-center gap-1.5">
                        <span>{t.webSettingsView.manageReviews}</span>
                        {cmsCounts.pendingReviews > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500 text-white">
                            {t.webSettingsView.cmsNewBadge.replace(
                              "{count}",
                              String(cmsCounts.pendingReviews),
                            )}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 ">
                        {t.webSettingsView.cmsClientReviews.replace(
                          "{count}",
                          String(cmsCounts.reviews),
                        )}
                      </div>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-300 dark:text-neutral-600 group-hover:text-[#09937F]" />
                </Link>

                <Link
                  href="/dashboard/cms/faqs"
                  className="p-4 rounded-xl border border-slate-200 dark:border-white/10 hover:border-[#09937F]/40 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-[#014842] text-white">
                      <HelpCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#09937F] transition-colors">
                        {t.webSettingsView.manageFaqs}
                      </div>
                      <div className="text-[11px] text-slate-400 ">
                        {t.webSettingsView.cmsQuestionsConfigured.replace(
                          "{count}",
                          String(cmsCounts.faqs),
                        )}
                      </div>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-300 dark:text-neutral-600 group-hover:text-[#09937F]" />
                </Link>
              </div>
            </Card>
          </div>
        )}

        {/* Save Bar */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-[#111C19] border border-slate-200 dark:border-white/10 shadow-xs">
          <div className="text-xs text-slate-500 dark:text-neutral-400 flex items-center gap-2">
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
            className="px-6 py-2.5 rounded-xl bg-[#014842] hover:bg-[#014842]/90 text-white text-xs font-bold inline-flex items-center gap-2 transition-all border border-[#09937F]/40 shadow-sm disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t.webSettingsView.saving}</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-[#5EEAD4]" />
                <span>{t.webSettingsView.saveSettings}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
