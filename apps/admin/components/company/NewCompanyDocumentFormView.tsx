"use client";

import { errorMessage } from "../../lib/error-text";
import { ROUTES } from "../../constants/routes";
import { uploadFileDirectly } from "../../lib/upload-client";
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
import { ArrowLeft,CheckCircle2,Building2 } from "lucide-react";
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
  const [error, setError] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleEn || !files[0]?.file) {setError(t.newCompanyDocumentForm.selectADocumentFileAnd); return;}
    setError("");
    setSaving(true);

    try {
      const uploaded = await uploadFileDirectly(files[0].file, { entityType: "company_document", entityId: "pending" });
      const fileUrl = uploaded.fileUrl;

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

      router.push(ROUTES.company.documents);
    } catch (err) {
      setError(errorMessage(err, t, t.newCompanyDocumentForm.couldNotSaveDocument));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      <div className="flex items-center gap-4">
        <Link href={ROUTES.company.documents}>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-ink-muted"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t.actions.back}</span>
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink font-display flex items-center gap-2">
            <Building2 className="w-6 h-6 text-accent" />
            <span>{t.companyDocumentsNew.title}</span>
          </h1>
          <p className="text-xs text-ink-muted mt-1">
            {t.companyDocumentsNew.subtitle}
          </p>
        </div>
      </div>

      <Card className="p-8 bg-surface border border-ink/10 rounded-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error ? <p role="alert">{error}</p> : null}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-semibold text-ink mb-1.5 block">
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
              <label className="text-xs font-semibold text-ink mb-1.5 block">
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
              <label className="text-xs font-semibold text-ink mb-1.5 block">
                {t.companyDocumentsNew.categoryLabel}
              </label>
              <Select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
              >
                <option value="cr_license" className="bg-surface text-ink">
                  {t.companyDocumentsView.categoryCrLicense}
                </option>
                <option
                  value="vat_certificate"
                  className="bg-surface text-ink"
                >
                  {t.companyDocumentsView.categoryVatCertificate}
                </option>
                <option
                  value="company_profile"
                  className="bg-surface text-ink"
                >
                  {t.companyDocumentsView.categoryCompanyProfile}
                </option>
                <option value="bylaws" className="bg-surface text-ink">
                  {t.companyDocumentsView.categoryBylaws}
                </option>
                <option
                  value="standard_contract"
                  className="bg-surface text-ink"
                >
                  {t.companyDocumentsView.categoryStandardContract}
                </option>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-ink mb-1.5 block">
                {t.companyDocumentsNew.docNumberLabel}
              </label>
              <Input
                placeholder={t.companyDocumentsNew.docNumberPlaceholder}
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                className=""
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-semibold text-ink mb-1.5 block">
                {t.companyDocumentsNew.validFromLabel}
              </label>
              <Input
                type="date"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                className=""
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink mb-1.5 block">
                {t.companyDocumentsNew.validUntilLabel}
              </label>
              <Input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className=""
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
            <label className="text-xs font-semibold text-ink mb-1.5 block">
              {t.companyDocumentsNew.notesLabel}
            </label>
            <Input
              placeholder={t.companyDocumentsNew.notesPlaceholder}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="pt-6 border-t border-ink/10 flex items-center justify-end gap-4">
            <Link href={ROUTES.company.documents}>
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
