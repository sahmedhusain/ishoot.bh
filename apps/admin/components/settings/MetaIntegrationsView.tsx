"use client";

import * as React from "react";
import { Card, Input, Button, Badge } from "@ishoot/ui";
import { CheckCircle2, MessageSquare, Instagram, Send } from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { SettingsNavTabs } from "./SettingsNavTabs";

export function MetaIntegrationsView() {
  const { t, isRTL } = useAdminLocale();

  const [whatsappPhoneId, setWhatsappPhoneId] =
    React.useState("109827364512938");
  const [whatsappBusinessId, setWhatsappBusinessId] =
    React.useState("782910394857201");
  const [whatsappToken, setWhatsappToken] =
    React.useState("EAAG8ZCK...9482LDP");
  const [instagramAccountId, setInstagramAccountId] =
    React.useState("ishoot.bh");
  const [facebookPageId, setFacebookPageId] = React.useState("102938475610293");

  const [autoSendInvoices, setAutoSendInvoices] = React.useState(true);
  const [autoSendReceipts, setAutoSendReceipts] = React.useState(true);
  const [syncFacebookLeads, setSyncFacebookLeads] = React.useState(true);

  const [saved, setSaved] = React.useState(false);
  const [testSent, setTestSent] = React.useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
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

        <Button
          type="button"
          variant="primary"
          onClick={handleSave}
          className="gap-2 shadow-lg shadow-[#09937F]/20"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{t.actions.save}</span>
        </Button>
      </div>

      {saved && (
        <div className="p-4 rounded-2xl bg-[#09937F]/15 border border-[#09937F]/40 flex items-center gap-3 text-[#09937F] text-xs font-semibold animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{t.integrations.saved}</span>
        </div>
      )}

      {testSent && (
        <div className="p-4 rounded-2xl bg-blue-500/15 border border-blue-500/40 flex items-center gap-3 text-blue-400 text-xs font-semibold animate-fade-in">
          <Send className="w-4 h-4 shrink-0" />
          <span>{t.integrations.testSent}</span>
        </div>
      )}

      <Card className="p-6 sm:p-8 bg-[#0B1210] border border-white/10 shadow-2xl rounded-3xl space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  WhatsApp Cloud API (Meta Official)
                </h2>
                <Badge
                  variant="outline"
                  className="text-emerald-400 border-emerald-500/30 bg-emerald-500/10 text-[10px]"
                >
                  {t.integrations.connected}
                </Badge>
              </div>
              <p className="text-xs text-[#9EADA9]">{t.integrations.waDesc}</p>
            </div>
          </div>

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
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-[#9EADA9] block mb-1.5">
              {t.integrations.phoneId}
            </label>
            <Input
              value={whatsappPhoneId}
              onChange={(e) => setWhatsappPhoneId(e.target.value)}
              className="bg-[#050807] border-white/10  text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-[#9EADA9] block mb-1.5">
              {t.integrations.wabaId}
            </label>
            <Input
              value={whatsappBusinessId}
              onChange={(e) => setWhatsappBusinessId(e.target.value)}
              className="bg-[#050807] border-white/10  text-xs"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-[#9EADA9] block mb-1.5">
              {t.integrations.token}
            </label>
            <Input
              type="password"
              value={whatsappToken}
              onChange={(e) => setWhatsappToken(e.target.value)}
              className="bg-[#050807] border-white/10  text-xs"
            />
          </div>

          <div className="sm:col-span-2 p-4 rounded-2xl bg-[#050807] border border-white/10 space-y-3">
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
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoSendInvoices ? (isRTL ? "-translate-x-6" : "translate-x-6") : isRTL ? "-translate-x-1" : "translate-x-1"}`}
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
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoSendReceipts ? (isRTL ? "-translate-x-6" : "translate-x-6") : isRTL ? "-translate-x-1" : "translate-x-1"}`}
                />
              </button>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6 sm:p-8 bg-[#0B1210] border border-white/10 shadow-2xl rounded-3xl space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-white/10">
          <div className="w-9 h-9 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
            <Instagram className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">
              {t.integrations.igFbTitle}
            </h2>
            <p className="text-xs text-[#9EADA9]">{t.integrations.igFbDesc}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-[#9EADA9] block mb-1.5">
              {t.integrations.igHandle}
            </label>
            <Input
              value={instagramAccountId}
              onChange={(e) => setInstagramAccountId(e.target.value)}
              className="bg-[#050807] border-white/10  text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-[#9EADA9] block mb-1.5">
              {t.integrations.fbPageId}
            </label>
            <Input
              value={facebookPageId}
              onChange={(e) => setFacebookPageId(e.target.value)}
              className="bg-[#050807] border-white/10  text-xs"
            />
          </div>

          <div className="sm:col-span-2 p-4 rounded-2xl bg-[#050807] border border-white/10 space-y-3">
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
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${syncFacebookLeads ? (isRTL ? "-translate-x-6" : "translate-x-6") : isRTL ? "-translate-x-1" : "translate-x-1"}`}
                />
              </button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
