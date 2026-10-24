"use client";
import { errorMessage } from "../../lib/error-text";
import { ContentImage } from "../shared/ContentImage";

import * as React from "react";
import type { ClientLogo } from "@platform/database/types";
import {
Button,
Card,
Badge,
Modal,
Input,
ConfirmDestructiveModal,
} from "@platform/ui";
import { Plus,Trash2,Globe,CheckCircle2,Pencil } from "lucide-react";
import { AssetUrlInput } from "../shared/AssetUrlInput";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import {
deleteClientLogoAction,
createClientLogoAction,
updateClientLogoAction,
} from "../../app/actions/cms";

interface ClientsManagementViewProps {
  initialLogos: ClientLogo[];
}

export function ClientsManagementView({
  initialLogos,
}: ClientsManagementViewProps) {
  const { t } = useAdminLocale();
  const [logos, setLogos] = React.useState<ClientLogo[]>(initialLogos);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(
    null,
  );
  const [saving, setSaving] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState("");

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

  const openEditor = (logo?: ClientLogo) => {
    setEditingId(logo?.id ?? null);
    setClientName(logo?.client_name ?? "");
    setLogoSvgUrl(logo?.logo_svg_url ?? "");
    setWebsiteUrl(logo?.website_url ?? "");
    setError("");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !logoSvgUrl) return;
    setSaving(true);
    setError("");

    try {
      const payload = {
        client_name: clientName,
        logo_svg_url: logoSvgUrl,
        website_url: websiteUrl || undefined,
      };
      if (editingId) {
        const res = await updateClientLogoAction(editingId, { ...payload, website_url: websiteUrl });
        if (res.logo) setLogos((prev) => prev.map((l) => (l.id === editingId ? res.logo! : l)));
      } else {
        const res = await createClientLogoAction(payload);
        if (res.logo) setLogos((prev) => [...prev, res.logo]);
      }
      setIsModalOpen(false);
      setEditingId(null);
      setClientName("");
      setLogoSvgUrl("");
      setWebsiteUrl("");
    } catch (err) {
      setError(errorMessage(err, t, t.clientsView.saveFailed));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink font-display">
            {t.cms.clientsTitle}
          </h1>
          <p className="text-xs text-ink-muted mt-1">
            {t.clientsView.subtitle}
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          className="gap-1.5 self-start sm:self-auto"
          onClick={() => openEditor()}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t.actions.addClient}</span>
        </Button>
      </div>

      {logos.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-surface border border-ink/10 text-ink-muted">
          {t.clientsView.emptyState}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {logos.map((logo) => (
            <Card
              key={logo.id}
              className="p-6 text-center space-y-4 bg-surface border border-ink/10 hover:border-accent/40 transition-all rounded-3xl relative group"
            >
              <div className="absolute top-4 end-4 flex gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                <button
                  onClick={() => openEditor(logo)}
                  className="p-1.5 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent"
                  title={t.actions.edit}
                  aria-label={t.actions.edit}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDeleteTargetId(logo.id)}
                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                  title={t.actions.delete}
                  aria-label={t.actions.delete}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="w-16 h-16 rounded-2xl mx-auto bg-ink/5 border border-ink/10 flex items-center justify-center p-3">
                {logo.logo_svg_url.startsWith("http") ||
                logo.logo_svg_url.startsWith("/") ? (
                  <ContentImage
                    src={logo.logo_svg_url}
                    alt={logo.client_name}
                    className="w-full h-full object-contain opacity-80 group-hover:opacity-100 transition-opacity"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <span className="w-4 h-4 rounded-full bg-accent" />
                )}
              </div>

              <div className="space-y-1">
                <div className="font-bold text-ink text-sm">
                  {logo.client_name}
                </div>
                {logo.website_url && (
                  <a
                    href={logo.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline "
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

      <Modal closeLabel={t.actions.close}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? t.clientsView.editClient : t.actions.addClient}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs text-ink mb-1.5 block">
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
            <label className="text-xs text-ink mb-1.5 block">
              {t.clientsView.logoVectorUrl}
            </label>
            <AssetUrlInput
              value={logoSvgUrl}
              onChange={setLogoSvgUrl}
              resource="clients"
              placeholder={t.clientsView.logoVectorPlaceholder}
              required
            />
          </div>

          <div>
            <label className="text-xs text-ink mb-1.5 block">
              {t.clientsView.officialWebsiteUrl}
            </label>
            <Input
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder={t.clientsView.officialWebsitePlaceholder}
            />
          </div>

          {error && <p className="text-xs text-rose-500">{error}</p>}

          <div className="pt-4 flex justify-end gap-3 border-t border-ink/10">
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
