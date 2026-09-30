"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  Button,
  Input,
  Select,
  ProofUploader,
  ProofFile,
} from "@ishoot/ui";
import { ArrowLeft, CheckCircle2, Building2 } from "lucide-react";
import { createCompanyDocumentAction } from "../../app/actions/documents";
import { useAdminLocale } from "../../hooks/useAdminLocale";

export function NewCompanyDocumentFormView() {
  const router = useRouter();
  const { t } = useAdminLocale();

  const [titleEn, setTitleEn] = React.useState("");
  const [titleAr, setTitleAr] = React.useState("");
  const [category, setCategory] = React.useState<any>("cr_license");
  const [documentNumber, setDocumentNumber] = React.useState("");
  const [validFrom, setValidFrom] = React.useState("");
  const [validUntil, setValidUntil] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [files, setFiles] = React.useState<ProofFile[]>([]);
  const [saving, setSaving] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleEn) return;
    setSaving(true);

    try {
      const fileUrl = files[0]?.url || "/documents/sample-legal-doc.pdf";

      await createCompanyDocumentAction({
        title_en: titleEn,
        title_ar: titleAr || undefined,
        category,
        document_number: documentNumber || undefined,
        file_url: fileUrl,
        valid_from: validFrom || undefined,
        valid_until: validUntil || undefined,
        notes: notes || undefined,
      });

      router.push("/dashboard/company/documents");
    } catch (err) {
      console.error("Failed to upload legal document:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/company/documents">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-[#9EADA9]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t.actions.back}</span>
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white font-display flex items-center gap-2">
            <Building2 className="w-6 h-6 text-[#09937F]" />
            <span>{t.companyDocumentsNew.title}</span>
          </h1>
          <p className="text-xs text-[#9EADA9] mt-1">
            {t.companyDocumentsNew.subtitle}
          </p>
        </div>
      </div>

      <Card className="p-8 bg-[#0B1210] border border-white/10 rounded-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-semibold text-white mb-1.5 block">
                {t.companyDocumentsNew.titleEnLabel}
              </label>
              <Input
                required
                placeholder={t.companyDocumentsNew.titleEnPlaceholder}
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-white mb-1.5 block">
                {t.companyDocumentsNew.titleArLabel}
              </label>
              <Input
                placeholder={t.companyDocumentsNew.titleArLabel}
                value={titleAr}
                onChange={(e) => setTitleAr(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-semibold text-white mb-1.5 block">
                {t.companyDocumentsNew.categoryLabel}
              </label>
              <Select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
              >
                <option value="cr_license" className="bg-[#0B1210] text-white">
                  {t.companyDocumentsView.categoryCrLicense}
                </option>
                <option
                  value="vat_certificate"
                  className="bg-[#0B1210] text-white"
                >
                  {t.companyDocumentsView.categoryVatCertificate}
                </option>
                <option
                  value="company_profile"
                  className="bg-[#0B1210] text-white"
                >
                  {t.companyDocumentsView.categoryCompanyProfile}
                </option>
                <option value="bylaws" className="bg-[#0B1210] text-white">
                  {t.companyDocumentsView.categoryBylaws}
                </option>
                <option
                  value="standard_contract"
                  className="bg-[#0B1210] text-white"
                >
                  {t.companyDocumentsView.categoryStandardContract}
                </option>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-white mb-1.5 block">
                {t.companyDocumentsNew.docNumberLabel}
              </label>
              <Input
                placeholder={t.companyDocumentsNew.docNumberPlaceholder}
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-semibold text-white mb-1.5 block">
                {t.companyDocumentsNew.validFromLabel}
              </label>
              <Input
                type="date"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                className="font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-white mb-1.5 block">
                {t.companyDocumentsNew.validUntilLabel}
              </label>
              <Input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>

          <ProofUploader
            label={t.companyDocumentsNew.assetFileLabel}
            hint={t.companyDocumentsNew.assetFileHint}
            value={files}
            onChange={setFiles}
            maxFiles={1}
          />

          <div>
            <label className="text-xs font-semibold text-white mb-1.5 block">
              {t.companyDocumentsNew.notesLabel}
            </label>
            <Input
              placeholder={t.companyDocumentsNew.notesPlaceholder}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="pt-6 border-t border-white/10 flex items-center justify-end gap-4">
            <Link href="/dashboard/company/documents">
              <Button type="button" variant="outline" size="sm">
                {t.actions.cancel}
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={saving}
              className="gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {saving
                  ? t.companyDocumentsNew.saving
                  : t.companyDocumentsNew.submit}
              </span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
