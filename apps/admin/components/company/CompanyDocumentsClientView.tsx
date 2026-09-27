"use client";

import * as React from "react";
import Link from "next/link";
import {
  Card,
  Button,
  Badge,
  DateDisplay,
  ConfirmDestructiveModal,
} from "@ishoot/ui";
import {
  Building2,
  Plus,
  Download,
  FileText,
  Trash2,
  ShieldCheck,
  Calendar,
} from "lucide-react";
import type { CompanyDocument } from "@ishoot/database";
import { deleteCompanyDocumentAction } from "../../app/actions/documents";
import { useAdminLocale } from "../../hooks/useAdminLocale";

interface CompanyDocumentsClientViewProps {
  initialDocuments: CompanyDocument[];
}

export function CompanyDocumentsClientView({
  initialDocuments,
}: CompanyDocumentsClientViewProps) {
  const { t, locale } = useAdminLocale();
  const [documents, setDocuments] =
    React.useState<CompanyDocument[]>(initialDocuments);
  const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(
    null,
  );

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await deleteCompanyDocumentAction(deleteTargetId);
      setDocuments((prev) => prev.filter((d) => d.id !== deleteTargetId));
    } catch (err) {
      console.error("Failed to delete document:", err);
    } finally {
      setDeleteTargetId(null);
    }
  };

  const categories = [
    { id: "all", label: "All Documents" },
    { id: "cr_license", label: "Commercial Registration (CR)" },
    { id: "vat_certificate", label: "VAT / Tax Certificates" },
    { id: "company_profile", label: "Company Profile & Decks" },
    { id: "bylaws", label: "Corporate Bylaws" },
    { id: "standard_contract", label: "Standard Agreements & Guarantees" },
  ];

  const [selectedCat, setSelectedCat] = React.useState("all");

  const filtered =
    selectedCat === "all"
      ? documents
      : documents.filter((d) => d.category === selectedCat);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white font-display flex items-center gap-2">
            <Building2 className="w-7 h-7 text-[#09937F]" />
            <span>Company Legal Repository & Document Vault</span>
          </h1>
          <p className="text-xs text-[#9EADA9] mt-1">
            Central repository for Commercial Registration (CR), VAT
            certificates, bylaws, and standard agreements
          </p>
        </div>

        <Link href="/dashboard/company/documents/new">
          <Button
            variant="primary"
            size="sm"
            className="gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Legal Asset</span>
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCat(cat.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCat === cat.id
                ? "bg-[#014842] text-white border border-[#09937F]"
                : "bg-[#0B1210] text-[#9EADA9] hover:text-white border border-white/10"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center bg-[#0B1210] border border-white/10 rounded-3xl space-y-3">
          <FileText className="w-12 h-12 text-[#9EADA9]/40 mx-auto" />
          <p className="text-sm font-semibold text-white">
            No Legal Assets Found
          </p>
          <p className="text-xs text-[#9EADA9]">
            Upload corporate legal documents to make them accessible across
            company workflows.
          </p>
          <Link href="/dashboard/company/documents/new">
            <Button variant="outline" size="sm" className="mt-2">
              Upload First Asset
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((doc) => (
            <Card
              key={doc.id}
              className="p-5 bg-[#0B1210] border border-white/10 rounded-3xl flex flex-col justify-between hover:border-[#09937F]/50 transition-all space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="w-10 h-10 rounded-2xl bg-[#09937F]/10 border border-[#09937F]/30 flex items-center justify-center text-[#09937F] shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] uppercase font-mono border-white/20"
                  >
                    {doc.category.replace("_", " ")}
                  </Badge>
                </div>

                <div>
                  <h3 className="font-bold text-white text-sm line-clamp-1">
                    {doc.title_en}
                  </h3>
                  {doc.document_number && (
                    <p className="text-[11px] font-mono text-[#09937F] mt-0.5">
                      Doc #: {doc.document_number}
                    </p>
                  )}
                </div>

                {doc.notes && (
                  <p className="text-xs text-[#9EADA9] line-clamp-2 bg-[#050807] p-2.5 rounded-xl border border-white/5">
                    {doc.notes}
                  </p>
                )}

                <div className="text-[11px] text-[#9EADA9] space-y-1 font-mono pt-2 border-t border-white/5">
                  {doc.valid_until && (
                    <div className="flex items-center gap-1.5 text-amber-400">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Valid Until: {doc.valid_until}</span>
                    </div>
                  )}
                  <div>
                    Uploaded:{" "}
                    <DateDisplay date={doc.created_at} locale={locale} />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm" className="gap-1 text-xs">
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </Button>
                </a>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteTargetId(doc.id)}
                  className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDestructiveModal
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDelete}
        title="Delete Legal Document Asset"
        description="Are you sure you want to delete this company legal document? This action will remove the asset from the legal vault."
      />
    </div>
  );
}
