"use client";

import * as React from "react";
import Link from "next/link";
import type { EnrichedAttachment } from "@ishoot/database";
import type { CRMContact, CRMDeal, Invoice } from "@ishoot/database/types";
import { Card, Button, Input, Select, ConfirmDestructiveModal } from "@ishoot/ui";
import {
  FolderOpen,
  Plus,
  Search,
  FileText,
  FileCode,
  Image as ImageIcon,
  Film,
  Download,
  Trash2,
  ExternalLink,
  Building2,
  Briefcase,
  Receipt,
  File,
  X,
  UploadCloud,
  CheckCircle2,
} from "lucide-react";
import {
  createAttachmentAction,
  deleteAttachmentAction,
} from "../../app/actions/attachments";
import { useAdminLocale } from "../../hooks/useAdminLocale";

interface ArchiveManagementViewProps {
  initialAttachments: EnrichedAttachment[];
  contacts?: CRMContact[];
  deals?: CRMDeal[];
  invoices?: Invoice[];
}

export function ArchiveManagementView({
  initialAttachments,
  contacts = [],
  deals = [],
  invoices = [],
}: ArchiveManagementViewProps) {
  const { isRTL, locale } = useAdminLocale();
  const [attachments, setAttachments] =
    React.useState<EnrichedAttachment[]>(initialAttachments);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState<string>("all");
  const [isUploadOpen, setIsUploadOpen] = React.useState(false);
  const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(null);

  // Upload Form State
  const [fileName, setFileName] = React.useState("");
  const [fileUrl, setFileUrl] = React.useState("");
  const [fileSizeKb, setFileSizeKb] = React.useState<number>(1024);
  const [mimeType, setMimeType] = React.useState("application/pdf");
  const [entityType, setEntityType] = React.useState<
    "contact" | "customer_vault" | "deal" | "invoice" | "general"
  >("contact");
  const [entityId, setEntityId] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  // Filter attachments
  const filteredAttachments = React.useMemo(() => {
    return attachments.filter((att) => {
      // Type filter
      if (activeFilter === "contact" && att.entity_type !== "contact" && att.entity_type !== "customer_vault") return false;
      if (activeFilter === "deal" && att.entity_type !== "deal") return false;
      if (activeFilter === "invoice" && att.entity_type !== "invoice") return false;
      if (activeFilter === "pdf" && !att.mime_type?.includes("pdf") && !att.file_name.endsWith(".pdf")) return false;
      if (
        activeFilter === "image" &&
        !att.mime_type?.includes("image") &&
        !att.file_name.match(/\.(jpg|jpeg|png|webp|svg)$/i)
      )
        return false;

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = att.file_name.toLowerCase().includes(q);
        const matchesEntity = att.entity_label?.toLowerCase().includes(q) || false;
        const matchesUploader = att.uploaded_by?.toLowerCase().includes(q) || false;
        if (!matchesName && !matchesEntity && !matchesUploader) return false;
      }
      return true;
    });
  }, [attachments, activeFilter, searchTerm]);

  // Handle Form Submission
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName.trim() || !fileUrl.trim()) return;

    setSubmitting(true);
    try {
      const resolvedEntityId =
        entityId.trim() ||
        (entityType === "contact"
          ? contacts[0]?.id || "default"
          : entityType === "deal"
            ? deals[0]?.id || "default"
            : entityType === "invoice"
              ? invoices[0]?.id || "default"
              : "general-vault");

      const res = await createAttachmentAction({
        fileName: fileName.trim(),
        fileUrl: fileUrl.trim(),
        fileSize: Math.round(Number(fileSizeKb) * 1024),
        mimeType,
        entityType,
        entityId: resolvedEntityId,
      });

      if (res.success && res.attachment) {
        // Find label
        let entityLabel = resolvedEntityId;
        let entityLink: string | undefined;

        if (entityType === "contact" || entityType === "customer_vault") {
          const c = contacts.find((item) => item.id === resolvedEntityId);
          entityLabel = c ? c.company || c.full_name : "Client Document";
          entityLink = `/dashboard/crm/customers/${resolvedEntityId}`;
        } else if (entityType === "deal") {
          const d = deals.find((item) => item.id === resolvedEntityId);
          entityLabel = d ? d.title : "Deal Document";
          entityLink = `/dashboard/crm/deals/${resolvedEntityId}`;
        } else if (entityType === "invoice") {
          const i = invoices.find((item) => item.id === resolvedEntityId);
          entityLabel = i ? i.invoice_number : "Invoice Document";
          entityLink = `/dashboard/invoices/${resolvedEntityId}`;
        }

        const newEnriched: EnrichedAttachment = {
          id: res.attachment.id,
          file_name: res.attachment.fileName,
          file_url: res.attachment.fileUrl,
          file_size: res.attachment.fileSize || undefined,
          mime_type: res.attachment.mimeType || undefined,
          entity_type: res.attachment.entityType,
          entity_id: res.attachment.entityId,
          entity_label: entityLabel,
          entity_link: entityLink,
          created_at: res.attachment.createdAt.toISOString(),
        };

        setAttachments((prev) => [newEnriched, ...prev]);
        setIsUploadOpen(false);
        setFileName("");
        setFileUrl("");
      }
    } catch (err) {
      console.error("Failed to upload attachment:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await deleteAttachmentAction(deleteTargetId);
      setAttachments((prev) => prev.filter((a) => a.id !== deleteTargetId));
    } catch (err) {
      console.error("Failed to delete attachment:", err);
    } finally {
      setDeleteTargetId(null);
    }
  };

  const getFileIcon = (name: string, mime?: string) => {
    if (mime?.includes("pdf") || name.endsWith(".pdf")) {
      return <FileText className="w-4 h-4 text-rose-500" />;
    }
    if (
      mime?.includes("image") ||
      name.match(/\.(jpg|jpeg|png|webp|svg|ai)$/i)
    ) {
      return <ImageIcon className="w-4 h-4 text-amber-500" />;
    }
    if (mime?.includes("video") || name.match(/\.(mp4|mov|mkv)$/i)) {
      return <Film className="w-4 h-4 text-purple-500" />;
    }
    return <File className="w-4 h-4 text-[#09937F]" />;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "—";
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${Math.round(bytes / 1024)} KB`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Archive & Attachments Vault
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Central repository for legal contracts, media assets, shoot permits, and invoice PDFs.
          </p>
        </div>

        <Button
          onClick={() => setIsUploadOpen(true)}
          className="bg-[#014842] hover:bg-[#014842]/90 text-white gap-2 rounded-full px-4 h-9 text-xs font-semibold self-start sm:self-auto shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Upload File</span>
        </Button>
      </div>

      {/* KPI Cards / Google Cloud Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white dark:bg-[#1a1a1a] border border-[#dadce0] dark:border-[#3c4043] rounded-xl">
          <div className="text-[11px] font-medium text-slate-500 dark:text-neutral-400">Total Documents</div>
          <div className="text-lg font-bold text-slate-900 dark:text-white font-mono mt-0.5">
            {attachments.length}
          </div>
        </div>
        <div className="p-3.5 bg-white dark:bg-[#1a1a1a] border border-[#dadce0] dark:border-[#3c4043] rounded-xl">
          <div className="text-[11px] font-medium text-slate-500 dark:text-neutral-400">Client Vaults</div>
          <div className="text-lg font-bold text-[#014842] dark:text-[#7de0d1] font-mono mt-0.5">
            {attachments.filter((a) => a.entity_type === "contact" || a.entity_type === "customer_vault").length}
          </div>
        </div>
        <div className="p-3.5 bg-white dark:bg-[#1a1a1a] border border-[#dadce0] dark:border-[#3c4043] rounded-xl">
          <div className="text-[11px] font-medium text-slate-500 dark:text-neutral-400">Invoice PDFs</div>
          <div className="text-lg font-bold text-slate-900 dark:text-white font-mono mt-0.5">
            {attachments.filter((a) => a.entity_type === "invoice").length}
          </div>
        </div>
        <div className="p-3.5 bg-white dark:bg-[#1a1a1a] border border-[#dadce0] dark:border-[#3c4043] rounded-xl">
          <div className="text-[11px] font-medium text-slate-500 dark:text-neutral-400">Deal Assets</div>
          <div className="text-lg font-bold text-slate-900 dark:text-white font-mono mt-0.5">
            {attachments.filter((a) => a.entity_type === "deal").length}
          </div>
        </div>
      </div>

      {/* Filter Chips & Search Bar */}
      <div className="bg-white dark:bg-[#1a1a1a] border border-[#dadce0] dark:border-[#3c4043] rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 text-slate-400 absolute start-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by file name, client, or deal..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full ps-9 pe-4 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 dark:bg-neutral-800 dark:border-neutral-700 dark:text-white focus:outline-none focus:border-[#09937F]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 sm:pb-0">
          {[
            { id: "all", label: "All Files" },
            { id: "contact", label: "Clients" },
            { id: "invoice", label: "Invoices" },
            { id: "deal", label: "Deals" },
            { id: "pdf", label: "PDFs" },
            { id: "image", label: "Images" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors shrink-0 ${
                activeFilter === tab.id
                  ? "bg-[#e6f5f2] text-[#014842] border border-[#014842]/30 dark:bg-[#004d40]/40 dark:text-[#7de0d1] dark:border-[#004d40] font-semibold"
                  : "text-slate-600 hover:bg-slate-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Attachments Table */}
      <div className="bg-white dark:bg-[#1a1a1a] border border-[#dadce0] dark:border-[#3c4043] rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-[#f8fafd] dark:bg-[#202124] border-b border-[#dadce0] dark:border-[#3c4043] text-slate-600 dark:text-neutral-400 uppercase font-mono tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5 text-start font-semibold">Document Name</th>
                <th className="p-3.5 text-start font-semibold">Linked Entity</th>
                <th className="p-3.5 text-start font-semibold">Category</th>
                <th className="p-3.5 text-end font-semibold">File Size</th>
                <th className="p-3.5 text-start font-semibold">Date Uploaded</th>
                <th className="p-3.5 text-end font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dadce0]/70 dark:divide-[#3c4043]/70">
              {filteredAttachments.map((att) => (
                <tr
                  key={att.id}
                  className="hover:bg-slate-50/70 dark:hover:bg-neutral-800/40 transition-colors"
                >
                  {/* File Name */}
                  <td className="p-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="shrink-0 p-1.5 rounded-lg bg-slate-100 dark:bg-neutral-800">
                        {getFileIcon(att.file_name, att.mime_type)}
                      </div>
                      <div className="min-w-0">
                        <a
                          href={att.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-slate-900 dark:text-white hover:text-[#014842] dark:hover:text-[#7de0d1] hover:underline transition-colors truncate block max-w-xs"
                          title={att.file_name}
                        >
                          {att.file_name}
                        </a>
                        <div className="text-[10px] text-slate-400 dark:text-neutral-500 font-mono">
                          {att.mime_type || "application/octet-stream"}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Linked Entity */}
                  <td className="p-3.5">
                    {att.entity_link ? (
                      <Link
                        href={att.entity_link}
                        className="inline-flex items-center gap-1.5 text-slate-800 dark:text-neutral-200 hover:text-[#014842] dark:hover:text-[#7de0d1] hover:underline font-medium"
                      >
                        {att.entity_type === "contact" || att.entity_type === "customer_vault" ? (
                          <Building2 className="w-3.5 h-3.5 text-[#09937F] shrink-0" />
                        ) : att.entity_type === "deal" ? (
                          <Briefcase className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        ) : (
                          <Receipt className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                        )}
                        <span className="truncate max-w-[160px]">{att.entity_label || att.entity_id}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                      </Link>
                    ) : (
                      <span className="text-slate-500 dark:text-neutral-400">
                        {att.entity_label || "General Repository"}
                      </span>
                    )}
                  </td>

                  {/* Category Pill */}
                  <td className="p-3.5">
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-mono font-medium capitalize bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-neutral-300">
                      {att.entity_type.replace("_", " ")}
                    </span>
                  </td>

                  {/* File Size */}
                  <td className="p-3.5 text-end font-mono text-slate-600 dark:text-neutral-400">
                    {formatFileSize(att.file_size)}
                  </td>

                  {/* Date Uploaded */}
                  <td className="p-3.5 font-mono text-[11px] text-slate-500 dark:text-neutral-400">
                    {att.created_at.split("T")[0]}
                    {att.uploaded_by && (
                      <div className="text-[10px] text-slate-400">
                        by {att.uploaded_by}
                      </div>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="p-3.5 text-end">
                    <div className="flex items-center justify-end gap-1">
                      <a
                        href={att.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800 transition-colors"
                        title="Download / View"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => setDeleteTargetId(att.id)}
                        className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        title="Delete Attachment"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredAttachments.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400 dark:text-neutral-500">
                    <FolderOpen className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-neutral-600" />
                    No documents found matching your filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload File Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white dark:bg-[#1a1a1a] border border-[#dadce0] dark:border-[#3c4043] rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-[#dadce0] dark:border-[#3c4043]">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-[#014842] dark:text-[#7de0d1]" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Upload Vault Document
                </h2>
              </div>
              <button
                onClick={() => setIsUploadOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-neutral-300 font-semibold mb-1">
                  Document / File Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master Production Agreement 2026.pdf"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 dark:bg-neutral-800 dark:border-neutral-700 dark:text-white focus:outline-none focus:border-[#09937F]"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-neutral-300 font-semibold mb-1">
                  File URL or Storage Path *
                </label>
                <input
                  type="text"
                  required
                  placeholder="https://... or /uploads/contracts/agreement.pdf"
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 dark:bg-neutral-800 dark:border-neutral-700 dark:text-white focus:outline-none focus:border-[#09937F]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-neutral-300 font-semibold mb-1">
                    Entity Category
                  </label>
                  <select
                    value={entityType}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setEntityType(val);
                      setEntityId("");
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 dark:bg-neutral-800 dark:border-neutral-700 dark:text-white focus:outline-none focus:border-[#09937F]"
                  >
                    <option value="contact">Client Dossier</option>
                    <option value="deal">Commercial Deal</option>
                    <option value="invoice">Billed Invoice</option>
                    <option value="general">General Vault</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-neutral-300 font-semibold mb-1">
                    Mime Type
                  </label>
                  <select
                    value={mimeType}
                    onChange={(e) => setMimeType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 dark:bg-neutral-800 dark:border-neutral-700 dark:text-white focus:outline-none focus:border-[#09937F]"
                  >
                    <option value="application/pdf">PDF Document (.pdf)</option>
                    <option value="image/png">PNG Image (.png)</option>
                    <option value="image/jpeg">JPEG Image (.jpg)</option>
                    <option value="video/mp4">MP4 Video (.mp4)</option>
                    <option value="application/octet-stream">Other File</option>
                  </select>
                </div>
              </div>

              {/* Linked Record Selector */}
              {entityType === "contact" && (
                <div>
                  <label className="block text-slate-700 dark:text-neutral-300 font-semibold mb-1">
                    Select Client
                  </label>
                  <select
                    value={entityId}
                    onChange={(e) => setEntityId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 dark:bg-neutral-800 dark:border-neutral-700 dark:text-white focus:outline-none focus:border-[#09937F]"
                  >
                    <option value="">Select a client...</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.company ? `${c.company} (${c.full_name})` : c.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {entityType === "deal" && (
                <div>
                  <label className="block text-slate-700 dark:text-neutral-300 font-semibold mb-1">
                    Select Deal
                  </label>
                  <select
                    value={entityId}
                    onChange={(e) => setEntityId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 dark:bg-neutral-800 dark:border-neutral-700 dark:text-white focus:outline-none focus:border-[#09937F]"
                  >
                    <option value="">Select a deal...</option>
                    {deals.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title} ({d.contact?.company || d.contact?.full_name || "Direct"})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {entityType === "invoice" && (
                <div>
                  <label className="block text-slate-700 dark:text-neutral-300 font-semibold mb-1">
                    Select Invoice
                  </label>
                  <select
                    value={entityId}
                    onChange={(e) => setEntityId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 dark:bg-neutral-800 dark:border-neutral-700 dark:text-white focus:outline-none focus:border-[#09937F]"
                  >
                    <option value="">Select an invoice...</option>
                    {invoices.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.invoice_number} ({i.contact?.company || i.contact?.full_name || "Client"})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#dadce0] dark:border-[#3c4043]">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsUploadOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#014842] hover:bg-[#014842]/90 text-white rounded-full px-5 text-xs font-semibold"
                >
                  {submitting ? "Uploading..." : "Save Document"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDestructiveModal
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDelete}
        title="Delete Document"
        description="Are you sure you want to remove this document from the vault? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
      />
    </div>
  );
}
