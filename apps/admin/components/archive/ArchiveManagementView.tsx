"use client";

import * as React from "react";
import Link from "next/link";
import type { EnrichedAttachment } from "@ishoot/database";
import type { CRMContact, CRMDeal, Invoice, Payment } from "@ishoot/database";
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
  Landmark,
  ShieldCheck,
  CreditCard,
  FileCheck,
  Loader2,
  AlertCircle,
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
  payments?: Payment[];
}

export function ArchiveManagementView({
  initialAttachments,
  contacts = [],
  deals = [],
  invoices = [],
  payments = [],
}: ArchiveManagementViewProps) {
  const { isRTL, locale, t } = useAdminLocale();
  const [attachments, setAttachments] =
    React.useState<EnrichedAttachment[]>(initialAttachments);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState<string>("all");
  const [isUploadOpen, setIsUploadOpen] = React.useState(false);
  const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(null);

  // Upload Form State
  const [uploadMode, setUploadMode] = React.useState<"file" | "url">("file");
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [dragActive, setDragActive] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const [fileName, setFileName] = React.useState("");
  const [fileUrl, setFileUrl] = React.useState("");
  const [fileSizeKb, setFileSizeKb] = React.useState<number>(1024);
  const [mimeType, setMimeType] = React.useState("application/pdf");
  const [entityType, setEntityType] = React.useState<
    "payment" | "company_setting" | "contact" | "customer_vault" | "deal" | "invoice" | "general"
  >("payment");
  const [documentSubtype, setDocumentSubtype] = React.useState<string>("cheque_copy");
  const [entityId, setEntityId] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);

  // File selection helper
  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setFileName(file.name);
    setMimeType(file.type || "application/octet-stream");
    setFileSizeKb(Math.round(file.size / 1024));
    setUploadError(null);
  };

  // Filter attachments
  const filteredAttachments = React.useMemo(() => {
    return attachments.filter((att) => {
      // Type filter
      if (activeFilter === "payment" && att.entity_type !== "payment") return false;
      if (activeFilter === "vat" && att.entity_type !== "company_setting") return false;
      if (
        activeFilter === "contact" &&
        att.entity_type !== "contact" &&
        att.entity_type !== "customer_vault"
      )
        return false;
      if (activeFilter === "deal" && att.entity_type !== "deal") return false;
      if (activeFilter === "invoice" && att.entity_type !== "invoice") return false;
      if (
        activeFilter === "pdf" &&
        !att.mime_type?.includes("pdf") &&
        !att.file_name.endsWith(".pdf")
      )
        return false;
      if (
        activeFilter === "image" &&
        !att.mime_type?.includes("image") &&
        !att.file_name.match(/\.(jpg|jpeg|png|webp|svg|ai)$/i)
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
    setUploadError(null);

    if (uploadMode === "file" && !selectedFile) {
      setUploadError("Please select a document or file to upload.");
      return;
    }
    if (uploadMode === "url" && (!fileName.trim() || !fileUrl.trim())) {
      setUploadError("Please enter document name and storage URL.");
      return;
    }

    setSubmitting(true);
    try {
      // Resolve entity ID and labels
      let resolvedEntityId = entityId.trim();
      let entityLabel = "General Vault";
      let entityLink: string | undefined = undefined;

      if (entityType === "payment") {
        if (!resolvedEntityId && payments.length > 0) {
          resolvedEntityId = payments[0].id;
        }
        const p = payments.find((item) => item.id === resolvedEntityId);
        entityLabel = p
          ? `Receipt ${p.receipt_number} (${p.amount} BHD)`
          : "Payment Proof";
        entityLink = resolvedEntityId ? `/dashboard/payments/${resolvedEntityId}` : undefined;
      } else if (entityType === "company_setting") {
        resolvedEntityId = "company_setting";
        entityLabel = "NBR VAT Registration Certificate";
        entityLink = "/dashboard/settings/company";
      } else if (entityType === "contact" || entityType === "customer_vault") {
        if (!resolvedEntityId && contacts.length > 0) {
          resolvedEntityId = contacts[0].id;
        }
        const c = contacts.find((item) => item.id === resolvedEntityId);
        entityLabel = c ? c.company || c.full_name : "Client Document";
        entityLink = resolvedEntityId ? `/dashboard/crm/customers/${resolvedEntityId}` : undefined;
      } else if (entityType === "deal") {
        if (!resolvedEntityId && deals.length > 0) {
          resolvedEntityId = deals[0].id;
        }
        const d = deals.find((item) => item.id === resolvedEntityId);
        entityLabel = d ? d.title : "Deal Document";
        entityLink = resolvedEntityId ? `/dashboard/crm/deals/${resolvedEntityId}` : undefined;
      } else if (entityType === "invoice") {
        if (!resolvedEntityId && invoices.length > 0) {
          resolvedEntityId = invoices[0].id;
        }
        const i = invoices.find((item) => item.id === resolvedEntityId);
        entityLabel = i ? i.invoice_number : "Invoice Document";
        entityLink = resolvedEntityId ? `/dashboard/invoices/${resolvedEntityId}` : undefined;
      } else {
        resolvedEntityId = "general-vault";
      }

      if (uploadMode === "file" && selectedFile) {
        // Send directly to /api/upload
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("entityType", entityType);
        formData.append("entityId", resolvedEntityId);
        formData.append("customName", fileName.trim() || selectedFile.name);
        formData.append("documentType", documentSubtype);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to upload file");
        }

        const newEnriched: EnrichedAttachment = {
          id: data.attachment?.id || `att-${Date.now()}`,
          file_name: data.fileName || fileName.trim() || selectedFile.name,
          file_url: data.fileUrl,
          file_size: data.fileSize || selectedFile.size,
          mime_type: data.mimeType || selectedFile.type,
          entity_type: entityType,
          entity_id: resolvedEntityId,
          entity_label: entityLabel,
          entity_link: entityLink,
          created_at: new Date().toISOString(),
          uploaded_by: "Admin",
        };

        setAttachments((prev) => [newEnriched, ...prev]);
      } else {
        // Fallback manual URL registration
        const res = await createAttachmentAction({
          fileName: fileName.trim(),
          fileUrl: fileUrl.trim(),
          fileSize: Math.round(Number(fileSizeKb) * 1024),
          mimeType,
          entityType,
          entityId: resolvedEntityId,
        });

        if (!res.success || !res.attachment) {
          throw new Error(res.error || "Failed to save attachment");
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
          uploaded_by: "Admin",
        };

        setAttachments((prev) => [newEnriched, ...prev]);
      }

      setIsUploadOpen(false);
      setSelectedFile(null);
      setFileName("");
      setFileUrl("");
      setEntityId("");
    } catch (err: any) {
      console.error("Failed to upload attachment:", err);
      setUploadError(err.message || "Failed to upload attachment");
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

  const getFileIcon = (name: string, mime?: string, entityType?: string) => {
    if (entityType === "payment") {
      return <Landmark className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
    }
    if (entityType === "company_setting") {
      return <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
    }
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
            {t.archiveView.title}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t.archiveView.subtitle}
          </p>
        </div>

        <Button
          onClick={() => {
            setIsUploadOpen(true);
            setSelectedFile(null);
            setUploadError(null);
          }}
          className="bg-[#014842] hover:bg-[#014842]/90 text-white gap-2 rounded-full px-4 h-9 text-xs font-semibold self-start sm:self-auto shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>{t.archiveView.uploadFile}</span>
        </Button>
      </div>

      {/* KPI Cards / Google Cloud Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 bg-white dark:bg-[#1a1a1a] border border-[#dadce0] dark:border-[#3c4043] rounded-xl">
          <div className="text-[11px] font-medium text-slate-500 dark:text-neutral-400">{t.archiveView.totalDocuments}</div>
          <div className="text-lg font-bold text-slate-900 dark:text-white font-mono mt-0.5">
            {attachments.length}
          </div>
        </div>
        <div className="p-3.5 bg-white dark:bg-[#1a1a1a] border border-[#dadce0] dark:border-[#3c4043] rounded-xl">
          <div className="text-[11px] font-medium text-slate-500 dark:text-neutral-400">{t.archiveView.filterPayments}</div>
          <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
            {attachments.filter((a) => a.entity_type === "payment").length}
          </div>
        </div>
        <div className="p-3.5 bg-white dark:bg-[#1a1a1a] border border-[#dadce0] dark:border-[#3c4043] rounded-xl">
          <div className="text-[11px] font-medium text-slate-500 dark:text-neutral-400">{t.archiveView.filterLegal}</div>
          <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">
            {attachments.filter((a) => a.entity_type === "company_setting").length}
          </div>
        </div>
        <div className="p-3.5 bg-white dark:bg-[#1a1a1a] border border-[#dadce0] dark:border-[#3c4043] rounded-xl">
          <div className="text-[11px] font-medium text-slate-500 dark:text-neutral-400">{t.archiveView.invoicePdfs}</div>
          <div className="text-lg font-bold text-slate-900 dark:text-white font-mono mt-0.5">
            {attachments.filter((a) => a.entity_type === "invoice").length}
          </div>
        </div>
        <div className="p-3.5 bg-white dark:bg-[#1a1a1a] border border-[#dadce0] dark:border-[#3c4043] rounded-xl">
          <div className="text-[11px] font-medium text-slate-500 dark:text-neutral-400">{t.archiveView.clientVaults}</div>
          <div className="text-lg font-bold text-[#014842] dark:text-[#7de0d1] font-mono mt-0.5">
            {attachments.filter((a) => a.entity_type === "contact" || a.entity_type === "customer_vault").length}
          </div>
        </div>
      </div>

      {/* Filter Chips & Search Bar */}
      <div className="bg-white dark:bg-[#1a1a1a] border border-[#dadce0] dark:border-[#3c4043] rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 text-slate-400 absolute start-3 top-2.5" />
          <input
            type="text"
            placeholder={t.archiveView.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full ps-9 pe-4 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 dark:bg-neutral-800 dark:border-neutral-700 dark:text-white focus:outline-none focus:border-[#09937F]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 sm:pb-0">
          {[
            { id: "all", label: t.archiveView.filterAll },
            { id: "payment", label: t.archiveView.filterPayments },
            { id: "vat", label: t.archiveView.filterLegal },
            { id: "invoice", label: t.archiveView.filterInvoices },
            { id: "contact", label: t.archiveView.filterClients },
            { id: "deal", label: t.archiveView.filterDeals },
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
                <th className="p-3.5 text-start font-semibold">{t.archiveView.tableDocName}</th>
                <th className="p-3.5 text-start font-semibold">{t.archiveView.tableLinkedEntity}</th>
                <th className="p-3.5 text-start font-semibold">{t.archiveView.tableCategory}</th>
                <th className="p-3.5 text-end font-semibold">{t.archiveView.tableFileSize}</th>
                <th className="p-3.5 text-start font-semibold">{t.archiveView.tableUploadDate}</th>
                <th className="p-3.5 text-end font-semibold">{t.archiveView.tableActions}</th>
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
                        {getFileIcon(att.file_name, att.mime_type, att.entity_type)}
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
                        {att.entity_type === "payment" ? (
                          <Landmark className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : att.entity_type === "company_setting" ? (
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        ) : att.entity_type === "contact" || att.entity_type === "customer_vault" ? (
                          <Building2 className="w-3.5 h-3.5 text-[#09937F] shrink-0" />
                        ) : att.entity_type === "deal" ? (
                          <Briefcase className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        ) : (
                          <Receipt className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                        )}
                        <span className="truncate max-w-[200px]">{att.entity_label || att.entity_id}</span>
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
                    {att.entity_type === "payment" ? (
                      att.file_name.toLowerCase().includes("cheque") ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                          Cheque Copy
                        </span>
                      ) : att.file_name.toLowerCase().includes("bank") || att.file_name.toLowerCase().includes("transfer") ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
                          Bank Transfer Slip
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                          Payment Proof
                        </span>
                      )
                    ) : att.entity_type === "company_setting" ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800">
                        VAT & Legal
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-mono font-medium capitalize bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-neutral-300">
                        {att.entity_type.replace("_", " ")}
                      </span>
                    )}
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
                    {t.archiveView.noDocsFound}
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
          <div className="relative w-full max-w-lg bg-white dark:bg-[#1a1a1a] border border-[#dadce0] dark:border-[#3c4043] rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[#dadce0] dark:border-[#3c4043]">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-[#014842] dark:text-[#7de0d1]" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {t.archiveView.uploadModalTitle}
                </h2>
              </div>
              <button
                onClick={() => setIsUploadOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-5 space-y-4 text-xs overflow-y-auto">
              {uploadError && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Mode Toggle */}
              <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-neutral-800 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setUploadMode("file")}
                  className={`flex-1 py-1.5 rounded-md font-medium text-center transition-all ${
                    uploadMode === "file"
                      ? "bg-white dark:bg-[#1a1a1a] text-slate-900 dark:text-white shadow-xs font-semibold"
                      : "text-slate-500 hover:text-slate-900 dark:text-neutral-400"
                  }`}
                >
                  {t.archiveView.tabUploadFile}
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode("url")}
                  className={`flex-1 py-1.5 rounded-md font-medium text-center transition-all ${
                    uploadMode === "url"
                      ? "bg-white dark:bg-[#1a1a1a] text-slate-900 dark:text-white shadow-xs font-semibold"
                      : "text-slate-500 hover:text-slate-900 dark:text-neutral-400"
                  }`}
                >
                  {t.archiveView.tabExternalUrl}
                </button>
              </div>

              {/* Drag and Drop Zone for File Upload */}
              {uploadMode === "file" ? (
                <div className="space-y-2">
                  <div
                    onDragEnter={(e) => {
                      e.preventDefault();
                      setDragActive(true);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragActive(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setDragActive(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragActive(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleFileSelect(e.dataTransfer.files[0]);
                      }
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                      dragActive
                        ? "border-[#014842] bg-[#014842]/5 dark:border-[#7de0d1] dark:bg-[#7de0d1]/5"
                        : selectedFile
                          ? "border-emerald-400 bg-emerald-50/40 dark:border-emerald-800 dark:bg-emerald-950/20"
                          : "border-slate-300 dark:border-neutral-700 hover:border-slate-400 dark:hover:border-neutral-600 bg-slate-50/50 dark:bg-neutral-800/40"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileSelect(e.target.files[0]);
                        }
                      }}
                    />

                    {selectedFile ? (
                      <div className="flex items-center justify-between gap-3 text-start">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 shrink-0">
                            <FileCheck className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 dark:text-white truncate">
                              {selectedFile.name}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || "Document"}
                            </div>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFile(null);
                            setFileName("");
                          }}
                          className="text-slate-400 hover:text-rose-600 p-1 h-auto"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <UploadCloud className="w-8 h-8 mx-auto text-slate-400 dark:text-neutral-500" />
                        <div className="font-semibold text-slate-700 dark:text-neutral-300">
                          {t.archiveView.dragDropText}
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {t.archiveView.dragDropHint}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-slate-700 dark:text-neutral-300 font-semibold mb-1">
                    {t.archiveView.fieldFileUrl}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={t.archiveView.fieldFileUrlPlaceholder}
                    value={fileUrl}
                    onChange={(e) => setFileUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 dark:bg-neutral-800 dark:border-neutral-700 dark:text-white focus:outline-none focus:border-[#09937F]"
                  />
                </div>
              )}

              {/* Document Name */}
              <div>
                <label className="block text-slate-700 dark:text-neutral-300 font-semibold mb-1">
                  {t.archiveView.fieldDocName}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t.archiveView.fieldDocNamePlaceholder}
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 dark:bg-neutral-800 dark:border-neutral-700 dark:text-white focus:outline-none focus:border-[#09937F]"
                />
              </div>

              {/* Category Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-neutral-300 font-semibold mb-1">
                    {t.archiveView.entityCategory}
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
                    <option value="payment">{t.archiveView.catPayment}</option>
                    <option value="company_setting">{t.archiveView.catCompany}</option>
                    <option value="invoice">{t.archiveView.catInvoice}</option>
                    <option value="contact">{t.archiveView.catContact}</option>
                    <option value="deal">{t.archiveView.catDeal}</option>
                    <option value="general">{t.archiveView.catGeneral}</option>
                  </select>
                </div>

                {entityType === "payment" ? (
                  <div>
                    <label className="block text-slate-700 dark:text-neutral-300 font-semibold mb-1">
                      {t.archiveView.proofSubtype}
                    </label>
                    <select
                      value={documentSubtype}
                      onChange={(e) => setDocumentSubtype(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 dark:bg-neutral-800 dark:border-neutral-700 dark:text-white focus:outline-none focus:border-[#09937F]"
                    >
                      <option value="cheque_copy">{t.archiveView.proofCheque}</option>
                      <option value="bank_slip">{t.archiveView.proofBankSlip}</option>
                      <option value="receipt">{t.archiveView.proofReceipt}</option>
                      <option value="general">{t.archiveView.proofGeneral}</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-slate-700 dark:text-neutral-300 font-semibold mb-1">
                      {t.archiveView.mimeType}
                    </label>
                    <select
                      value={mimeType}
                      onChange={(e) => setMimeType(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 dark:bg-neutral-800 dark:border-neutral-700 dark:text-white focus:outline-none focus:border-[#09937F]"
                    >
                      <option value="application/pdf">{t.archiveView.mimePdf}</option>
                      <option value="image/png">{t.archiveView.mimePng}</option>
                      <option value="image/jpeg">{t.archiveView.mimeJpg}</option>
                      <option value="application/octet-stream">{t.archiveView.mimeOther}</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Linked Record Selector */}
              {entityType === "payment" && (
                <div>
                  <label className="block text-slate-700 dark:text-neutral-300 font-semibold mb-1">
                    {t.archiveView.selectPayment}
                  </label>
                  <select
                    value={entityId}
                    onChange={(e) => setEntityId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 dark:bg-neutral-800 dark:border-neutral-700 dark:text-white focus:outline-none focus:border-[#09937F]"
                  >
                    <option value="">{t.archiveView.selectPaymentPlaceholder}</option>
                    {payments.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.receipt_number} — {p.amount} BHD ({p.payment_method})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {entityType === "company_setting" && (
                <div className="p-3 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900 text-indigo-800 dark:text-indigo-300 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="text-[11px] leading-relaxed">
                    {t.archiveView.vatCertNotice}
                  </div>
                </div>
              )}

              {entityType === "contact" && (
                <div>
                  <label className="block text-slate-700 dark:text-neutral-300 font-semibold mb-1">
                    {t.archiveView.selectClient}
                  </label>
                  <select
                    value={entityId}
                    onChange={(e) => setEntityId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 dark:bg-neutral-800 dark:border-neutral-700 dark:text-white focus:outline-none focus:border-[#09937F]"
                  >
                    <option value="">{t.archiveView.selectClientPlaceholder}</option>
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
                    {t.archiveView.selectDeal}
                  </label>
                  <select
                    value={entityId}
                    onChange={(e) => setEntityId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 dark:bg-neutral-800 dark:border-neutral-700 dark:text-white focus:outline-none focus:border-[#09937F]"
                  >
                    <option value="">{t.archiveView.selectDealPlaceholder}</option>
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
                    {t.archiveView.selectInvoice}
                  </label>
                  <select
                    value={entityId}
                    onChange={(e) => setEntityId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 dark:bg-neutral-800 dark:border-neutral-700 dark:text-white focus:outline-none focus:border-[#09937F]"
                  >
                    <option value="">{t.archiveView.selectInvoicePlaceholder}</option>
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
                  {t.actions.cancel}
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#014842] hover:bg-[#014842]/90 text-white rounded-full px-5 text-xs font-semibold gap-2"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{submitting ? t.archiveView.uploading : t.archiveView.saveVault}</span>
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
        title={t.archiveView.deleteConfirmTitle}
        description={t.archiveView.deleteConfirmDesc}
        confirmLabel={t.archiveView.delete}
        cancelLabel={t.actions.cancel}
      />
    </div>
  );
}
