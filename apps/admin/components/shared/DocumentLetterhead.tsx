"use client";
import { formatMessage } from "@platform/locales";
import { ROUTES } from "../../constants/routes";
import { ContentImage } from "./ContentImage";

import * as React from "react";
import Link from "next/link";
import type { CompanySettings } from "@platform/database/types";
import { formatDocumentPhone, countryDisplayName } from "@platform/database/constants/phone";
import { ExternalLink } from "lucide-react";
import { adminTranslations } from "../../lib/translations-bilingual";

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
  documentType: "invoice" | "receipt" | "quote" | "proposal" | "mom";
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
  // Status codes (e.g. "partially paid", "APPROVED") read in the document's language.
  const statusLabels = adminTranslations[isAr ? "ar" : "en"].statusLabels as Record<string, string>;
  const statusText = statusLabels[statusValue.trim().toLowerCase().replace(/\s+/g, "_")] ?? statusValue;

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes("paid") || s.includes("completed")) {
      return "text-emerald-300 bg-emerald-950/40 border-emerald-500/30";
    }
    if (s.includes("overdue") || s.includes("void")) {
      return "text-rose-300 bg-rose-950/40 border-rose-500/30";
    }
    if (s.includes("sent") || s.includes("issued") || s.includes("pending")) {
      return "text-mint bg-accent/15 border-accent/40";
    }
    return "text-amber-300 bg-amber-950/40 border-amber-500/30";
  };

  return (
    <div className="w-full">
      {/* Official Header Banner */}
      <div className="bg-primary text-white p-6 sm:p-8 border-b-4 border-accent flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative overflow-hidden">
        {/* Subtle background geometry inspired by camera aperture */}
        <div className="absolute end-0 top-0 w-96 h-96 bg-white/[0.02] rounded-full pointer-events-none -me-20 -mt-20 blur-2xl" />

        <div className="relative z-10 space-y-2">
          {/* Brand Logo: Icon + Wordmark beside each other */}
          <div className="flex items-center gap-3">
            <ContentImage
              src={
                company.dark_icon_url ||
                company.icon_url
              }
              alt={isAr ? company.company_name_ar : company.company_name_en}
              className="h-10 w-auto object-contain shrink-0"
              width={40} height={40} />
            <ContentImage
              src={
                company.dark_logo_url ||
                company.logo_url
              }
              alt={isAr ? company.company_name_ar : company.company_name_en}
              className="h-7 w-auto object-contain"
              fallbackText={(isAr ? company.company_name_ar : company.company_name_en)} width={240} height={60} />
          </div>

          <div className="text-xs text-white/80 font-medium">
            {isAr ? company.company_name_ar : company.company_name_en}
            {company.company_name_ar && !isAr && (
              <span className="text-white/60 mx-1.5">
                • {company.company_name_ar}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/70 ">
            <span>
              {t.crLabel} {company.cr_number}
            </span>
            {company.country && <><span className="text-white/40">•</span><span>{countryDisplayName(company.country, language)}</span></>}
          </div>
        </div>

        <div className="relative z-10 text-start sm:text-end space-y-1.5">
          <div className="text-2xl sm:text-3xl font-extrabold tracking-wider uppercase font-display text-white">
            {isAr ? titleAr : titleEn}
          </div>
          <div className="text-sm text-mint font-bold tracking-wide">
            {documentNumber}
          </div>
          <div className="inline-block">
            <span
              className={`text-[10px] uppercase  font-bold tracking-wider px-2.5 py-0.5 rounded-full border ${getStatusColor(
                statusValue,
              )}`}
            >
              {statusText}
            </span>
          </div>
        </div>
      </div>

      {/* Client & Metadata Section */}
      <div className="p-6 sm:p-8 border-b border-gray-200 bg-white grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs text-gray-800">
        {/* Client Details */}
        <div className="space-y-1.5">
          <span className="text-slate-500 font-bold uppercase tracking-wider block text-[10px]">
            {clientSectionTitle}
          </span>

          <div className="text-base font-bold text-gray-900 flex items-center gap-1.5">
            {client.id ? (
              <Link
                href={ROUTES.crm.customer(client.id)}
                className="hover:text-primary hover:underline inline-flex items-center gap-1 print:no-underline print:text-black group"
                title={adminTranslations[isAr ? "ar" : "en"].executiveDashboard.viewCustomerDossier}
              >
                <span>{client.company || client.name}</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-primary print:hidden" />
              </Link>
            ) : (
              <span>{client.company || client.name}</span>
            )}
          </div>

          {client.company && client.name && client.company !== client.name && (
            <div className="text-gray-600 font-medium">{t.attention} {client.name}</div>
          )}

          {client.vatNumber && (
            <div className="text-gray-500  text-[11px]">
              {t.clientVat} <bdi dir="ltr">{client.vatNumber}</bdi>
            </div>
          )}

          {client.email && <div className="text-gray-500 ">{client.email}</div>}

          {client.phone && (
            <div className="text-gray-500 " dir="ltr">
              <bdi dir="ltr">{formatDocumentPhone(client.phone, company.country)}</bdi>
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
            <span className="text-slate-500 font-bold uppercase text-[10px]">
              {issueDateLabel}
            </span>
            <span className=" font-medium text-gray-900">{issueDate}</span>
          </div>

          {secondaryDateLabel && secondaryDate && (
            <div className="flex justify-between sm:justify-end gap-6 w-full">
              <span className="text-slate-500 font-bold uppercase text-[10px]">
                {secondaryDateLabel}
              </span>
              <span className=" font-bold text-primary">{secondaryDate}</span>
            </div>
          )}

          {extraMeta && <div className="w-full pt-1">{extraMeta}</div>}
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
  signatureUrl,
  stampUrl,
  signerName,
}: {
  company: CompanySettings;
  language?: "en" | "ar";
  thankYouMessage?: string;
  showSignature?: boolean;
  signatureTitle?: string;
  signatureTitleAr?: string;
  signatureUrl?: string | null;
  stampUrl?: string | null;
  signerName?: string | null;
}) {
  const isAr = language === "ar";
  const t = adminTranslations[isAr ? "ar" : "en"].documentLetterhead;
  const companyName = isAr
    ? company.company_name_ar
      ? company.company_name_ar
      : company.company_name_en
    : company.company_name_en
      ? company.company_name_en
      : company.company_name_ar;

  const defaultSig = signatureTitle ? signatureTitle : t.authorizedSignatory;
  const defaultSigAr = signatureTitleAr
    ? signatureTitleAr
    : adminTranslations.ar.documentLetterhead.authorizedSignatory;

  const effectiveStamp = stampUrl !== undefined ? stampUrl : company.stamp_url;
  const effectiveSignature =
    signatureUrl !== undefined ? signatureUrl : company.signature_url;

  return (
    <div className="border-t border-gray-200 bg-white">
      {showSignature && (
        <div className="p-6 sm:p-8 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-end gap-6 text-xs text-gray-700">
          <div className="space-y-1">
            <span className="text-slate-500 uppercase tracking-wider text-[10px] block font-bold">
              {t.issuedBy}
            </span>
            <div className="font-semibold text-gray-900">{companyName}</div>
            {signerName && (
              <div className="text-[11px] font-medium text-slate-700">
                {formatMessage(t.signedBy, { name: signerName })}
              </div>
            )}
            {isAr && company.company_name_en && (
              <div className="text-[11px] text-gray-500 ">
                {company.company_name_en}
              </div>
            )}
          </div>

          <div className="flex items-center gap-6">
            {effectiveStamp && (
              <div className="relative w-20 h-20 shrink-0 opacity-90 print:opacity-85">
                <ContentImage
                  src={effectiveStamp}
                  alt={t.sealAlt}
                  className="w-full h-full object-contain select-none"
                  width={40} height={40} />
              </div>
            )}
            <div className="text-center sm:text-end space-y-1.5 min-w-[180px]">
              <div className="relative h-14 flex items-end justify-center sm:justify-end pb-1">
                {effectiveSignature ? (
                  <ContentImage
                    src={effectiveSignature}
                    alt={t.signatureAlt}
                    className="max-h-12 w-auto object-contain select-none"
                    width={40} height={40} />
                ) : (
                  <div className="h-10 w-full border-b border-gray-300 border-dashed" />
                )}
              </div>
              <div className="border-t border-gray-300 pt-1 text-[11px] font-semibold text-gray-800">
                {isAr ? defaultSigAr : defaultSig}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="p-6 sm:p-8 bg-gray-50/80 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-500 print:bg-white print:border-gray-200">
        <div className="font-medium text-gray-700">
          {thankYouMessage
            ? thankYouMessage
            : formatMessage(t.thankYou, { companyName: companyName })}
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
              className="hover:text-primary"
            >
              {company.website}
            </a>
          )}
          {company.email && (
            <>
              <span>•</span>
              <a
                href={`mailto:${company.email}`}
                className="hover:text-primary"
              >
                {company.email}
              </a>
            </>
          )}
          {company.phone && (
            <>
              <span>•</span>
              <span dir="ltr">{formatDocumentPhone(company.phone, company.country)}</span>
            </>
          )}
          {company.country && <><span>•</span><span>{countryDisplayName(company.country, language)}</span></>}
        </div>
      </div>
    </div>
  );
}
