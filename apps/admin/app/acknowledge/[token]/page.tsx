import type { Metadata } from "next";
import {
  getCompanySettings,
  getSignatureRequestSession,
} from "@platform/database";
import { getTranslations } from "@platform/locales";
import { HandoverSigningView } from "../../../components/signing/HandoverSigningView";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

/** Public page an employee opens from their signing link to read and sign an asset handover on their own device. */
export default async function HandoverSigningPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const [{ token }, { lang }] = await Promise.all([params, searchParams]);
  const language = lang === "en" ? "en" : "ar";
  const [session, company] = await Promise.all([
    getSignatureRequestSession(token),
    getCompanySettings(),
  ]);
  const handover = "handover" in session ? session.handover : null;
  const record = "record" in session ? session.record : null;
  return (
    <HandoverSigningView
      token={token}
      language={language}
      labels={getTranslations(language).admin.handoverSigning}
      assetLabels={getTranslations(language).admin.assets}
      state={session.state}
      company={{
        name:
          language === "ar" ? company.company_name_ar : company.company_name_en,
        email: company.email,
        phone: company.phone,
        logoUrl: company.logo_url || null,
        iconUrl: company.icon_url || null,
      }}
      handover={
        handover
          ? {
              reference: handover.reference,
              kind: handover.kind,
              date: handover.handover_date,
              condition: handover.condition,
              employeeName:
                language === "ar"
                  ? handover.employee.name_ar
                  : handover.employee.name_en,
              assetName: `${handover.asset.asset_tag} · ${handover.asset.name}`,
              category:
                language === "ar"
                  ? handover.asset.category.name_ar
                  : handover.asset.category.name_en,
              serial: handover.asset.serial_number ?? null,
              checklist: handover.checklist.map((c) => ({
                label: language === "ar" ? c.labelAr : c.labelEn,
                ok: c.ok,
                note: c.note,
              })),
              accessories: handover.accessories ?? null,
              damage: handover.damage_notes ?? null,
              issuedBy: handover.created_by,
            }
          : null
      }
      signedAt={record?.signedAt ? record.signedAt.toISOString() : null}
    />
  );
}
