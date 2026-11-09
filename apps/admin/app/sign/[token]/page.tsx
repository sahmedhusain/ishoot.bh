import type { Metadata } from "next";
import { getSigningSession, getCompanySettings } from "@platform/database";
import { getTranslations } from "@platform/locales";
import { signingConsent } from "../../../lib/client-signing";
import { ClientSigningView } from "../../../components/signing/ClientSigningView";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function ClientSigningPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [session, company] = await Promise.all([getSigningSession(token, signingConsent), getCompanySettings()]);
  const doc = "doc" in session ? session.doc ?? null : null;
  const record = "record" in session ? session.record ?? null : null;
  const language = doc?.language ?? "ar";
  const s = getTranslations(language).admin.clientSigning;
  return (
    <ClientSigningView
      token={token}
      language={language}
      labels={s}
      state={session.state}
      company={{
        name: language === "ar" ? company.company_name_ar : company.company_name_en,
        email: company.email,
        phone: company.phone,
        logoUrl: company.logo_url || null,
        iconUrl: company.icon_url || null,
      }}
      doc={doc}
      terms={session.state === "open" ? session.terms : null}
      signedAt={record?.signedAt ? record.signedAt.toISOString() : null}
    />
  );
}
