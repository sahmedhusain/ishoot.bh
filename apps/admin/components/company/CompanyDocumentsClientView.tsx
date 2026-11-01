"use client";

import { ROUTES } from "../../constants/routes";
import * as React from "react";
import Link from "next/link";
import {
  Card,
  Button,
  Badge,
  DateDisplay,
  ConfirmDialog,
} from "@platform/ui";
import {
  Plus,
  Download,
  FileText,
  Trash2, Calendar
} from "lucide-react";
import type { CompanyDocument } from "@platform/database";
import { deleteCompanyDocumentAction } from "../../app/actions/documents";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { PageHeader } from "../layout/PageHeader";

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
    { id: "all", label: t.companyDocumentsView.categoryAll },
    { id: "cr_license", label: t.companyDocumentsView.categoryCrLicense },
    { id: "vat_certificate", label: t.companyDocumentsView.categoryVatCertificate },
    { id: "company_profile", label: t.companyDocumentsView.categoryCompanyProfile },
    { id: "bylaws", label: t.companyDocumentsView.categoryBylaws },
    { id: "standard_contract", label: t.companyDocumentsView.categoryStandardContract },
  ];

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "cr_license":
        return t.companyDocumentsView.categoryCrLicense;
      case "vat_certificate":
        return t.companyDocumentsView.categoryVatCertificate;
      case "company_profile":
        return t.companyDocumentsView.categoryCompanyProfile;
      case "bylaws":
        return t.companyDocumentsView.categoryBylaws;
      case "standard_contract":
        return t.companyDocumentsView.categoryStandardContract;
      default:
        return category.replace("_", " ");
    }
  };

  const [selectedCat, setSelectedCat] = React.useState("all");

  const filtered =
    selectedCat === "all"
      ? documents
      : documents.filter((d) => d.category === selectedCat);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      <PageHeader
        actions={<Link href={ROUTES.company.newDocument}>
          <Button
            variant="primary"
            size="sm"
            className="gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>{t.companyDocumentsView.uploadLegalAsset}</span>
          </Button>
        </Link>}
      />

      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCat(cat.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${selectedCat === cat.id
              ? "bg-primary text-primary-foreground border border-accent"
              : "bg-surface text-ink-muted hover:text-ink border border-outline-variant"
              }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center bg-surface border border-outline-variant rounded-3xl space-y-3">
          <FileText className="w-12 h-12 text-ink-muted mx-auto" />
          <p className="text-sm font-semibold text-ink">
            {t.companyDocumentsView.noAssetsFound}
          </p>
          <p className="text-xs text-ink-muted">
            {t.companyDocumentsView.noAssetsHint}
          </p>
          <Link href={ROUTES.company.newDocument}>
            <Button variant="outline" size="sm" className="mt-2">
              {t.companyDocumentsView.uploadFirstAsset}
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((doc) => (
            <Card
              key={doc.id}
              className="p-5 bg-surface border border-outline-variant rounded-3xl flex flex-col justify-between hover:border-accent/50 transition-all space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="w-10 h-10 rounded-2xl bg-accent/10 border border-accent/30 flex items-center justify-center text-accent shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] uppercase  border-outline-variant"
                  >
                    {getCategoryLabel(doc.category)}
                  </Badge>
                </div>

                <div>
                  <h3 className="font-bold text-ink text-sm line-clamp-1">
                    {locale === "ar" && doc.title_ar ? doc.title_ar : doc.title_en}
                  </h3>
                  {doc.document_number && (
                    <p className="text-[11px]  text-accent mt-0.5">
                      {t.companyDocumentsView.docNumberPrefix}{doc.document_number}
                    </p>
                  )}
                </div>

                {doc.notes && (
                  <p className="text-xs text-ink-muted line-clamp-2 bg-surface-sunken p-2.5 rounded-xl border border-outline-variant">
                    {doc.notes}
                  </p>
                )}

                <div className="text-[11px] text-ink-muted space-y-1  pt-2 border-t border-outline-variant">
                  {doc.valid_until && (
                    <div className="flex items-center gap-1.5 text-amber-400">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{t.companyDocumentsView.validUntilPrefix}{doc.valid_until}</span>
                    </div>
                  )}
                  <div>
                    {t.companyDocumentsView.uploadedPrefix}
                    <DateDisplay date={doc.created_at} locale={locale} />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-outline-variant flex items-center justify-between">
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm" className="gap-1 text-xs">
                    <Download className="w-3.5 h-3.5" />
                    <span>{t.companyDocumentsView.download}</span>
                  </Button>
                </a>

                <Button aria-label={t.actions.delete}
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

      <ConfirmDialog
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDelete}
        title={t.companyDocumentsView.deleteConfirmTitle}
        description={t.companyDocumentsView.deleteConfirmDesc}
      />
    </div>
  );
}
