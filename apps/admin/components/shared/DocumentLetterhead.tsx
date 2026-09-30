"use client";

import * as React from "react";
import Link from "next/link";
import type { CompanySettings } from "@ishoot/database/types";
import { ExternalLink } from "lucide-react";
import { adminTranslations } from "../../lib/translations";

interface DocumentClientInfo {
  id?: string | null;
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  vatNumber?: string | null;
}

export interface DocumentLetterheadProps {
  documentType: "invoice" | "receipt" | "quote" | "proposal";
  documentNumber: string;
  titleEn: string;
  titleAr: string;
  company: CompanySettings;
  language: "en" | "ar";
  issueDateLabel: string;
  issueDate: string;
  secondaryDateLabel?: string;
  secondaryDate?: string;
  statusLabel: string;
  statusValue: string;
  clientSectionTitle: string;
  client: DocumentClientInfo;
  extraMeta?: React.ReactNode;
}

export function DocumentLetterhead({
  documentType,
  documentNumber,
  titleEn,
  titleAr,
  company,
  language,
  issueDateLabel,
  issueDate,
  secondaryDateLabel,
  secondaryDate,
  statusLabel,
  statusValue,
  clientSectionTitle,
  client,
  extraMeta,
}: DocumentLetterheadProps) {
  const isAr = language === "ar";
  const t = adminTranslations[isAr ? "ar" : "en"].documentLetterhead;

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes("paid") || s.includes("completed")) {
      return "text-emerald-300 bg-emerald-950/40 border-emerald-500/30";
    }
    if (s.includes("overdue") || s.includes("void")) {
      return "text-rose-300 bg-rose-950/40 border-rose-500/30";
    }
    if (s.includes("sent") || s.includes("issued") || s.includes("pending")) {
      return "text-[#09937F] bg-[#09937F]/10 border-[#09937F]/30";
    }
    return "text-amber-300 bg-amber-950/40 border-amber-500/30";
  };

  return (
    <div className="w-full">
      {/* Official Header Banner */}
      <div className="bg-[#014842] text-white p-6 sm:p-8 border-b-4 border-[#09937F] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative overflow-hidden">
        {/* Subtle background geometry inspired by camera aperture */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/[0.02] rounded-full pointer-events-none -mr-20 -mt-20 blur-2xl" />

        <div className="relative z-10 space-y-2">
          {/* Brand Logo: Icon + Wordmark beside each other */}
          <div className="flex items-center gap-3">
            <img
              src={company.dark_icon_url || company.icon_url || "/brand/icon-dark.svg"}
              alt="Brand Icon"
              className="h-10 w-auto object-contain shrink-0"
            />
            <img
              src={company.dark_logo_url || company.logo_url || "/brand/logo-text-light.svg"}
              alt={isAr ? company.company_name_ar : company.company_name_en}
              className="h-7 w-auto object-contain"
            />
          </div>

          <div className="text-xs text-white/80 font-medium">
            {isAr ? company.company_name_ar : company.company_name_en}
            {company.company_name_ar && !isAr && (
              <span className="text-white/60 mx-1.5">• {company.company_name_ar}</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/70 ">
            <span>{t.crLabel} {company.cr_number}</span>
            {company.vat_enabled && company.vat_id && (
              <>
                <span className="text-white/40">•</span>
                <span>{t.vatIdLabel} {company.vat_id}</span>
              </>
            )}
            <span className="text-white/40">•</span>
            <span>{t.countryBahrain}</span>
          </div>
        </div>

        <div className="relative z-10 text-start sm:text-end space-y-1.5">
          <div className="text-2xl sm:text-3xl font-extrabold tracking-wider uppercase font-display text-white">
            {isAr ? titleAr : titleEn}
          </div>
          <div className="text-sm  text-[#09937F] font-bold tracking-wide">
            {documentNumber}
          </div>
          <div className="inline-block">
            <span
              className={`text-[10px] uppercase  font-bold tracking-wider px-2.5 py-0.5 rounded-full border ${getStatusColor(
                statusValue,
              )}`}
            >
              {statusValue}
            </span>
          </div>
        </div>
      </div>

      {/* Client & Metadata Section */}
      <div className="p-6 sm:p-8 border-b border-gray-200 bg-white grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs text-gray-800">
        {/* Client Details */}
        <div className="space-y-1.5">
          <span className="text-gray-400 font-bold uppercase tracking-wider block text-[10px]">
            {clientSectionTitle}
          </span>

          <div className="text-base font-bold text-gray-900 flex items-center gap-1.5">
            {client.id ? (
              <Link
                href={`/dashboard/crm/customers/${client.id}`}
                className="hover:text-[#014842] hover:underline inline-flex items-center gap-1 print:no-underline print:text-black group"
                title="View Client Dossier in CRM"
              >
                <span>{client.company || client.name}</span>
                <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#014842] print:hidden" />
              </Link>
            ) : (
              <span>{client.company || client.name}</span>
            )}
          </div>

          {client.company && client.name && client.company !== client.name && (
            <div className="text-gray-600 font-medium">
              Attn: {client.name}
            </div>
          )}

          {client.vatNumber && (
            <div className="text-gray-500  text-[11px]">
              Client VAT: {client.vatNumber}
            </div>
          )}

          {client.email && (
            <div className="text-gray-500 ">
              {client.email}
            </div>
          )}

          {client.phone && (
            <div className="text-gray-500 " dir="ltr">
              {client.phone}
            </div>
          )}

          {client.address && (
            <div className="text-gray-500 text-[11px] max-w-sm">
              {client.address}
            </div>
          )}
        </div>

        {/* Dates & Reference Block */}
        <div className="space-y-2 sm:text-end flex flex-col justify-start sm:items-end">
          <div className="flex justify-between sm:justify-end gap-6 w-full">
            <span className="text-gray-400 font-bold uppercase text-[10px]">
              {issueDateLabel}
            </span>
            <span className=" font-medium text-gray-900">
              {issueDate}
            </span>
          </div>

          {secondaryDateLabel && secondaryDate && (
            <div className="flex justify-between sm:justify-end gap-6 w-full">
              <span className="text-gray-400 font-bold uppercase text-[10px]">
                {secondaryDateLabel}
              </span>
              <span className=" font-bold text-[#014842]">
                {secondaryDate}
              </span>
            </div>
          )}

          <div className="flex justify-between sm:justify-end gap-6 w-full">
            <span className="text-gray-400 font-bold uppercase text-[10px]">
              {statusLabel}
            </span>
            <span className="font-bold uppercase text-[11px] text-[#09937F]">
              {statusValue}
            </span>
          </div>

          {extraMeta && (
            <div className="w-full pt-1">
              {extraMeta}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function DocumentFooter({
  company,
  language = "en",
  thankYouMessage,
  showSignature = false,
  signatureTitle,
  signatureTitleAr,
}: {
  company: CompanySettings;
  language?: "en" | "ar";
  thankYouMessage?: string;
  showSignature?: boolean;
  signatureTitle?: string;
  signatureTitleAr?: string;
}) {
  const isAr = language === "ar";
  const t = adminTranslations[isAr ? "ar" : "en"].documentLetterhead;
  const companyName = isAr
    ? (company.company_name_ar ? company.company_name_ar : company.company_name_en)
    : (company.company_name_en ? company.company_name_en : company.company_name_ar);

  const defaultSig = signatureTitle ? signatureTitle : t.authorizedSignatory;
  const defaultSigAr = signatureTitleAr ? signatureTitleAr : adminTranslations.ar.documentLetterhead.authorizedSignatory;

  return (
    <div className="border-t border-gray-200 bg-white">
      {showSignature && (
        <div className="p-6 sm:p-8 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-end gap-6 text-xs text-gray-700">
          <div className="space-y-1">
            <span className="text-gray-400 uppercase tracking-wider text-[10px] block font-bold">
              {t.issuedBy}
            </span>
            <div className="font-semibold text-gray-900">
              {companyName}
            </div>
            {isAr && company.company_name_en && (
              <div className="text-[11px] text-gray-500 ">
                {company.company_name_en}
              </div>
            )}
          </div>

          <div className="text-center sm:text-end space-y-2 min-w-[220px]">
            <div className="h-10 border-b border-gray-300 border-dashed" />
            <div className="text-[11px] font-semibold text-gray-800">
              {isAr ? defaultSigAr : defaultSig}
            </div>
          </div>
        </div>
      )}

      <div className="p-6 sm:p-8 bg-gray-50/80 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-500 print:bg-white print:border-gray-200">
        <div className="font-medium text-gray-700">
          {thankYouMessage ? thankYouMessage : t.thankYou.replace("{companyName}", companyName)}
        </div>
        <div className="flex flex-wrap items-center gap-3  text-[11px] text-gray-500">
          {company.website && (
            <a
              href={
                company.website.startsWith("http")
                  ? company.website
                  : `https://${company.website}`
              }
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#014842]"
            >
              {company.website}
            </a>
          )}
          {company.email && (
            <>
              <span>•</span>
              <a
                href={`mailto:${company.email}`}
                className="hover:text-[#014842]"
              >
                {company.email}
              </a>
            </>
          )}
          {company.phone && (
            <>
              <span>•</span>
              <span dir="ltr">{company.phone}</span>
            </>
          )}
          <span>•</span>
          <span>{t.countryBahrain}</span>
        </div>
      </div>
    </div>
  );
}
