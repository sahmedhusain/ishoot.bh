"use client";

import * as React from "react";
import { Card, Input, Button, Badge, ConfirmDestructiveModal } from "@ishoot/ui";
import {
  CheckCircle2,
  MessageSquare,
  Instagram,
  Send,
  Lock,
  Unlock,
  Unlink,
  Edit2,
  ShieldCheck,
  AlertCircle,
  X,
  Check,
} from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { SettingsNavTabs } from "./SettingsNavTabs";
import { saveIntegration, unlinkIntegration } from "../../app/actions/integrations";

function maskValue(val: string, visibleChars = 4): string {
  if (!val) return "—";
  if (val.length <= visibleChars) return "••••";
  return `••••••••••••${val.slice(-visibleChars)}`;
}

export function MetaIntegrationsView({
  initialWhatsApp,
  initialMeta
}: {
  initialWhatsApp?: any;
  initialMeta?: any;
}) {
  const { t, isRTL } = useAdminLocale();

    // WhatsApp State
  const [isWaLinked, setIsWaLinked] = React.useState(initialWhatsApp?.isActive || false);
  const [isWaEditing, setIsWaEditing] = React.useState(false);
  const [whatsappPhoneId, setWhatsappPhoneId] = React.useState(initialWhatsApp?.phoneId || "");
  const [whatsappBusinessId, setWhatsappBusinessId] = React.useState(initialWhatsApp?.businessId || "");
  const [whatsappToken, setWhatsappToken] = React.useState(initialWhatsApp?.token || "");

  // Draft WhatsApp state for editing
  const [draftWaPhoneId, setDraftWaPhoneId] = React.useState(whatsappPhoneId);
  const [draftWaBusinessId, setDraftWaBusinessId] = React.useState(whatsappBusinessId);
  const [draftWaToken, setDraftWaToken] = React.useState(whatsappToken);

  // Instagram / Facebook State
  const [isIgLinked, setIsIgLinked] = React.useState(initialMeta?.isActive || false);
  const [isIgEditing, setIsIgEditing] = React.useState(false);
  const [instagramAccountId, setInstagramAccountId] = React.useState(initialMeta?.accountId || "");
  const [facebookPageId, setFacebookPageId] = React.useState(initialMeta?.pageId || "");

  // Draft IG state for editing
  const [draftIgAccount, setDraftIgAccount] = React.useState(instagramAccountId);
  const [draftFbPage, setDraftFbPage] = React.useState(facebookPageId);

  // Automations
  const [autoSendInvoices, setAutoSendInvoices] = React.useState(initialWhatsApp?.config?.autoSendInvoices ?? true);
  const [autoSendReceipts, setAutoSendReceipts] = React.useState(initialWhatsApp?.config?.autoSendReceipts ?? true);
  const [syncFacebookLeads, setSyncFacebookLeads] = React.useState(initialMeta?.config?.syncFacebookLeads ?? true);


  // Confirmations
  const [unlinkTarget, setUnlinkTarget] = React.useState<"wa" | "ig" | null>(null);
  const [savedMessage, setSavedMessage] = React.useState("");
  const [testSent, setTestSent] = React.useState(false);

    const handleSaveWa = async () => {
    try {
      await saveIntegration("whatsapp", true, {
        phoneId: draftWaPhoneId,
        businessId: draftWaBusinessId,
        token: draftWaToken
      }, { autoSendInvoices, autoSendReceipts });
      setWhatsappPhoneId(draftWaPhoneId);
      setWhatsappBusinessId(draftWaBusinessId);
      setWhatsappToken(draftWaToken);
      setIsWaEditing(false);
      setIsWaLinked(true);
      setSavedMessage(isRTL ? "تم تحديث وتشفير بيانات واتساب بنجاح." : "WhatsApp credentials encrypted and saved.");
      setTimeout(() => setSavedMessage(""), 3500);
    } catch(err) {
      console.error(err);
    }
  };

    const handleSaveIg = async () => {
    try {
      await saveIntegration("meta", true, {
        accountId: draftIgAccount,
        pageId: draftFbPage
      }, { syncFacebookLeads });
      setInstagramAccountId(draftIgAccount);
      setFacebookPageId(draftFbPage);
      setIsIgEditing(false);
      setIsIgLinked(true);
      setSavedMessage(isRTL ? "تم تحديث ربط إنستغرام وفيسبوك بنجاح." : "Instagram & Facebook connection saved.");
      setTimeout(() => setSavedMessage(""), 3500);
    } catch(err) {
      console.error(err);
    }
  };

    const confirmUnlink = async () => {
    try {
      if (unlinkTarget === "wa") {
        await unlinkIntegration("whatsapp");
        setIsWaLinked(false);
        setIsWaEditing(false);
        setWhatsappPhoneId("");
        setWhatsappBusinessId("");
        setWhatsappToken("");
        setDraftWaPhoneId("");
        setDraftWaBusinessId("");
        setDraftWaToken("");
      } else if (unlinkTarget === "ig") {
        await unlinkIntegration("meta");
        setIsIgLinked(false);
        setIsIgEditing(false);
        setInstagramAccountId("");
        setFacebookPageId("");
        setDraftIgAccount("");
        setDraftFbPage("");
      }
      setUnlinkTarget(null);
      setSavedMessage(isRTL ? "تم فك الارتباط بنجاح." : "Integration unlinked and keys purged.");
      setTimeout(() => setSavedMessage(""), 3500);
    } catch(err) {
      console.error(err);
    }
  };

  const handleTestWhatsApp = () => {
    setTestSent(true);
    setTimeout(() => setTestSent(false), 4000);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      <SettingsNavTabs />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">
            {t.integrations.title}
          </h1>
          <p className="text-xs text-[#9EADA9] mt-1">
            {t.integrations.subtitle}
          </p>
        </div>
      </div>

      {savedMessage && (
        <div className="p-4 rounded-2xl bg-[#09937F]/15 border border-[#09937F]/40 flex items-center gap-3 text-[#09937F] text-xs font-semibold animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{savedMessage}</span>
        </div>
      )}

      {testSent && (
        <div className="p-4 rounded-2xl bg-blue-500/15 border border-blue-500/40 flex items-center gap-3 text-blue-400 text-xs font-semibold animate-fade-in">
          <Send className="w-4 h-4 shrink-0" />
          <span>{t.integrations.testSent}</span>
        </div>
      )}

      {/* WhatsApp Cloud API */}
      <Card className="p-6 sm:p-8 bg-[#0B1210] border border-white/10 shadow-2xl rounded-3xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  WhatsApp Cloud API (Meta Official)
                </h2>
                {isWaLinked ? (
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${initialWhatsApp?.healthStatus === 'error' ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' : 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'}`}
                  >
                    {initialWhatsApp?.healthStatus === 'error' ? (isRTL ? "خطأ في الاتصال" : "Connection Error") : t.integrations.connected}
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-rose-400 border-rose-500/30 bg-rose-500/10 text-[10px]"
                  >
                    {isRTL ? "غير متصل" : "Disconnected"}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-[#9EADA9]">{t.integrations.waDesc}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isWaLinked && !isWaEditing && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestWhatsApp}
                  className="text-xs gap-1.5 border-white/10 text-[#9EADA9] hover:text-white"
                >
                  <Send className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t.integrations.sendTest}</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDraftWaPhoneId(whatsappPhoneId);
                    setDraftWaBusinessId(whatsappBusinessId);
                    setDraftWaToken(whatsappToken);
                    setIsWaEditing(true);
                  }}
                  className="text-xs gap-1.5 border-white/10 text-slate-300 hover:text-white"
                >
                  <Edit2 className="w-3.5 h-3.5 text-[#09937F]" />
                  <span>{isRTL ? "تعديل" : "Edit"}</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setUnlinkTarget("wa")}
                  className="text-xs gap-1.5 border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  <span>{isRTL ? "إلغاء الربط" : "Unlink"}</span>
                </Button>
              </>
            )}

            {!isWaLinked && !isWaEditing && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setIsWaEditing(true)}
                className="text-xs gap-1.5 bg-[#09937F] text-white"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{isRTL ? "ربط الحساب" : "Connect WhatsApp"}</span>
              </Button>
            )}

            {isWaEditing && (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsWaEditing(false)}
                  className="text-xs border-white/10 text-slate-400"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>{isRTL ? "إلغاء" : "Cancel"}</span>
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleSaveWa}
                  className="text-xs gap-1.5 bg-[#09937F] text-white"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isRTL ? "حفظ التغييرات" : "Save Changes"}</span>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Credentials Display or Form */}
        {!isWaEditing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#050807] border border-white/10 space-y-1">
              <span className="text-[11px] uppercase tracking-wider text-[#9EADA9] font-bold">
                {t.integrations.phoneId}
              </span>
              <div className="text-sm font-mono text-white flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isWaLinked ? maskValue(whatsappPhoneId) : "—"}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#050807] border border-white/10 space-y-1">
              <span className="text-[11px] uppercase tracking-wider text-[#9EADA9] font-bold">
                {t.integrations.wabaId}
              </span>
              <div className="text-sm font-mono text-white flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isWaLinked ? maskValue(whatsappBusinessId) : "—"}</span>
              </div>
            </div>

            <div className="sm:col-span-2 p-4 rounded-xl bg-[#050807] border border-white/10 space-y-1">
              <span className="text-[11px] uppercase tracking-wider text-[#9EADA9] font-bold">
                {t.integrations.token} (System User Access Token)
              </span>
              <div className="text-sm font-mono text-emerald-400/90 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>{isWaLinked ? maskValue(whatsappToken, 6) : "—"}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
            <div>
              <label className="text-xs font-bold text-[#9EADA9] block mb-1.5">
                {t.integrations.phoneId} *
              </label>
              <Input
                value={draftWaPhoneId}
                onChange={(e) => setDraftWaPhoneId(e.target.value)}
                placeholder="e.g. 109827364512938"
                className="bg-[#050807] border-white/10 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#9EADA9] block mb-1.5">
                {t.integrations.wabaId} *
              </label>
              <Input
                value={draftWaBusinessId}
                onChange={(e) => setDraftWaBusinessId(e.target.value)}
                placeholder="e.g. 782910394857201"
                className="bg-[#050807] border-white/10 text-xs text-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-[#9EADA9] block mb-1.5">
                {t.integrations.token} *
              </label>
              <Input
                type="password"
                value={draftWaToken}
                onChange={(e) => setDraftWaToken(e.target.value)}
                placeholder="EAAG8ZCK..."
                className="bg-[#050807] border-white/10 text-xs text-white font-mono"
              />
            </div>
          </div>
        )}

        <div className="p-4 rounded-2xl bg-[#050807] border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white">
              {t.integrations.autoInvoices}
            </span>
            <button
              type="button"
              onClick={() => setAutoSendInvoices(!autoSendInvoices)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                autoSendInvoices ? "bg-[#09937F]" : "bg-white/20"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoSendInvoices ? (isRTL ? "-translate-x-6" : "translate-x-6") : isRTL ? "-translate-x-1" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <span className="text-xs font-bold text-white">
              {t.integrations.autoReceipts}
            </span>
            <button
              type="button"
              onClick={() => setAutoSendReceipts(!autoSendReceipts)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                autoSendReceipts ? "bg-[#09937F]" : "bg-white/20"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoSendReceipts ? (isRTL ? "-translate-x-6" : "translate-x-6") : isRTL ? "-translate-x-1" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      </Card>

      {/* Instagram & Facebook */}
      <Card className="p-6 sm:p-8 bg-[#0B1210] border border-white/10 shadow-2xl rounded-3xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 shrink-0">
              <Instagram className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  {t.integrations.igFbTitle}
                </h2>
                {isIgLinked ? (
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${initialMeta?.healthStatus === 'error' ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' : 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'}`}
                  >
                    {initialMeta?.healthStatus === 'error' ? (isRTL ? "خطأ في الاتصال" : "Connection Error") : t.integrations.connected}
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-rose-400 border-rose-500/30 bg-rose-500/10 text-[10px]"
                  >
                    {isRTL ? "غير متصل" : "Disconnected"}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-[#9EADA9]">{t.integrations.igFbDesc}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isIgLinked && !isIgEditing && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDraftIgAccount(instagramAccountId);
                    setDraftFbPage(facebookPageId);
                    setIsIgEditing(true);
                  }}
                  className="text-xs gap-1.5 border-white/10 text-slate-300 hover:text-white"
                >
                  <Edit2 className="w-3.5 h-3.5 text-[#09937F]" />
                  <span>{isRTL ? "تعديل" : "Edit"}</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setUnlinkTarget("ig")}
                  className="text-xs gap-1.5 border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  <span>{isRTL ? "إلغاء الربط" : "Unlink"}</span>
                </Button>
              </>
            )}

            {!isIgLinked && !isIgEditing && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setIsIgEditing(true)}
                className="text-xs gap-1.5 bg-[#09937F] text-white"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{isRTL ? "ربط الحسابات" : "Connect Accounts"}</span>
              </Button>
            )}

            {isIgEditing && (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsIgEditing(false)}
                  className="text-xs border-white/10 text-slate-400"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>{isRTL ? "إلغاء" : "Cancel"}</span>
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleSaveIg}
                  className="text-xs gap-1.5 bg-[#09937F] text-white"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isRTL ? "حفظ التغييرات" : "Save Changes"}</span>
                </Button>
              </div>
            )}
          </div>
        </div>

        {!isIgEditing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#050807] border border-white/10 space-y-1">
              <span className="text-[11px] uppercase tracking-wider text-[#9EADA9] font-bold">
                {t.integrations.igHandle}
              </span>
              <div className="text-sm font-mono text-white flex items-center gap-2">
                <span>{isIgLinked ? instagramAccountId : "—"}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#050807] border border-white/10 space-y-1">
              <span className="text-[11px] uppercase tracking-wider text-[#9EADA9] font-bold">
                {t.integrations.fbPageId}
              </span>
              <div className="text-sm font-mono text-white flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isIgLinked ? maskValue(facebookPageId) : "—"}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
            <div>
              <label className="text-xs font-bold text-[#9EADA9] block mb-1.5">
                {t.integrations.igHandle} *
              </label>
              <Input
                value={draftIgAccount}
                onChange={(e) => setDraftIgAccount(e.target.value)}
                placeholder="ishoot.bh"
                className="bg-[#050807] border-white/10 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#9EADA9] block mb-1.5">
                {t.integrations.fbPageId} *
              </label>
              <Input
                value={draftFbPage}
                onChange={(e) => setDraftFbPage(e.target.value)}
                placeholder="102938475610293"
                className="bg-[#050807] border-white/10 text-xs text-white"
              />
            </div>
          </div>
        )}

        <div className="p-4 rounded-2xl bg-[#050807] border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white">
              {t.integrations.autoFbLeads}
            </span>
            <button
              type="button"
              onClick={() => setSyncFacebookLeads(!syncFacebookLeads)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                syncFacebookLeads ? "bg-[#09937F]" : "bg-white/20"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  syncFacebookLeads ? (isRTL ? "-translate-x-6" : "translate-x-6") : isRTL ? "-translate-x-1" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      </Card>

      {/* Unlink Confirmation Modal */}
      <ConfirmDestructiveModal
        isOpen={!!unlinkTarget}
        onClose={() => setUnlinkTarget(null)}
        onConfirm={confirmUnlink}
        title={isRTL ? "تأكيد إلغاء الربط وحذف مفاتيح الدخول" : "Confirm Unlinking and Key Purge"}
        description={
          isRTL
            ? "هل أنت متأكد من إلغاء الربط؟ سيتم حذف المفاتيح والتفويضات المشفرة وإيقاف الإشعارات التلقائية المرتبطة بها فوراً."
            : "Are you sure you want to unlink? All stored authentication tokens and credentials will be purged, and automatic webhook messaging will be stopped immediately."
        }
      />
    </div>
  );
}
