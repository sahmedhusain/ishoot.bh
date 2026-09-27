"use client";

import * as React from "react";
import type { ClientLogo } from "@ishoot/database/types";
import {
  Button,
  Card,
  Badge,
  Modal,
  Input,
  ConfirmDestructiveModal,
} from "@ishoot/ui";
import { Plus, Trash2, Globe, CheckCircle2 } from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import {
  deleteClientLogoAction,
  createClientLogoAction,
} from "../../app/actions/cms";

interface ClientsManagementViewProps {
  initialLogos: ClientLogo[];
}

export function ClientsManagementView({
  initialLogos,
}: ClientsManagementViewProps) {
  const { t, locale } = useAdminLocale();
  const [logos, setLogos] = React.useState<ClientLogo[]>(initialLogos);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(
    null,
  );
  const [saving, setSaving] = React.useState(false);

  const [clientName, setClientName] = React.useState("");
  const [logoSvgUrl, setLogoSvgUrl] = React.useState("");
  const [websiteUrl, setWebsiteUrl] = React.useState("");

  const handleDelete = async (id: string) => {
    setLogos((prev) => prev.filter((l) => l.id !== id));
    try {
      await deleteClientLogoAction(id);
    } catch (err) {
      console.error("Failed to delete client logo:", err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !logoSvgUrl) return;
    setSaving(true);

    try {
      const res = await createClientLogoAction({
        client_name: clientName,
        logo_svg_url: logoSvgUrl,
        website_url: websiteUrl || undefined,
      });

      if (res.logo) {
        setLogos((prev) => [...prev, res.logo]);
      }
      setIsModalOpen(false);
      setClientName("");
      setLogoSvgUrl("");
      setWebsiteUrl("");
    } catch (err) {
      console.error("Failed to create client logo:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">
            {t.cms.clientsTitle}
          </h1>
          <p className="text-xs text-[#9EADA9] mt-1">
            {t.clientsView.subtitle}
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          className="gap-1.5 self-start sm:self-auto"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t.actions.addClient}</span>
        </Button>
      </div>

      {logos.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-[#0B1210] border border-white/10 text-[#9EADA9]">
          {t.clientsView.emptyState}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {logos.map((logo) => (
            <Card
              key={logo.id}
              className="p-6 text-center space-y-4 bg-[#0B1210] border border-white/10 hover:border-[#09937F]/40 transition-all rounded-3xl relative group"
            >
              <button
                onClick={() => setDeleteTargetId(logo.id)}
                className="absolute top-4 right-4 p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                title={t.actions.delete}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              <div className="w-16 h-16 rounded-2xl mx-auto bg-white/5 border border-white/10 flex items-center justify-center p-3">
                {logo.logo_svg_url.startsWith("http") ||
                logo.logo_svg_url.startsWith("/") ? (
                  <img
                    src={logo.logo_svg_url}
                    alt={logo.client_name}
                    className="w-full h-full object-contain filter invert opacity-80 group-hover:opacity-100 transition-opacity"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <span className="w-4 h-4 rounded-full bg-[#09937F]" />
                )}
              </div>

              <div className="space-y-1">
                <div className="font-bold text-white text-sm">
                  {logo.client_name}
                </div>
                {logo.website_url && (
                  <a
                    href={logo.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-[#09937F] hover:underline font-mono"
                  >
                    <Globe className="w-3 h-3" />
                    <span>{t.clientsView.website}</span>
                  </a>
                )}
              </div>

              <Badge variant="emerald" className="mx-auto text-[10px]">
                {t.clientsView.liveMarquee}
              </Badge>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t.actions.addClient}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-xs text-white mb-1.5 block">
              {t.clientsView.clientBrandName}
            </label>
            <Input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder={t.clientsView.clientBrandPlaceholder}
              required
            />
          </div>

          <div>
            <label className="text-xs text-white mb-1.5 block">
              {t.clientsView.logoVectorUrl}
            </label>
            <Input
              value={logoSvgUrl}
              onChange={(e) => setLogoSvgUrl(e.target.value)}
              placeholder={t.clientsView.logoVectorPlaceholder}
              required
            />
          </div>

          <div>
            <label className="text-xs text-white mb-1.5 block">
              {t.clientsView.officialWebsiteUrl}
            </label>
            <Input
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder={t.clientsView.officialWebsitePlaceholder}
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              {t.actions.cancel}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={saving}
              className="gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{t.actions.save}</span>
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDestructiveModal
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={async () => {
          if (deleteTargetId) {
            await handleDelete(deleteTargetId);
            setDeleteTargetId(null);
          }
        }}
        title={t.actions.delete}
        description={t.clientsView.confirmDelete}
        confirmLabel={t.actions.delete}
        cancelLabel={t.actions.cancel}
      />
    </div>
  );
}
