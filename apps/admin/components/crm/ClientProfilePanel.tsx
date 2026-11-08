"use client";

import { formatMessage } from "@platform/locales";
import { AlertTriangle, Building2, FileBadge, Landmark, Mail, MapPin, Phone, Star, Trophy, User } from "lucide-react";
import { Card, formatCurrencyValue, formatDate } from "@platform/ui";
import type { CRMContact } from "@platform/database/types";
import { countryName } from "@platform/database/constants/clients";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { formatClientAddress } from "../../lib/client-address";

export interface ClientStanding {
  rank: number | null;
  rankedClients: number;
  tier: "A" | "B" | "C" | "none";
  billed: number;
  outstanding: number;
  overdue: boolean;
  currency: string;
}

const TIER_STYLE: Record<ClientStanding["tier"], string> = {
  A: "bg-amber-400/15 text-amber-700 border-amber-400/40 dark:text-amber-300",
  B: "bg-sky-500/10 text-sky-700 border-sky-500/30 dark:text-sky-300",
  C: "bg-surface-sunken/10 text-ink-muted border-outline-variant/25 dark:text-ink",
  none: "bg-transparent text-ink-muted border-outline-variant",
};

export function ClientTierBadge({ standing }: { standing: ClientStanding }) {
  const { t } = useAdminLocale();
  const c = t.clients;
  const label =
    standing.rank && standing.tier !== "none"
      ? formatMessage(c.profile.rankLine, { rank: String(standing.rank), total: String(standing.rankedClients) })
      : c.profile.notRanked;
  const tierHint =
    standing.tier in c.tierHints
      ? formatMessage(c.tierHints[standing.tier as keyof typeof c.tierHints], {
          pct: standing.tier === "A" ? 80 : standing.tier === "B" ? 15 : 5,
        })
      : "";
  return (
    <span title={tierHint ? `${tierHint} · ${label}` : label} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${TIER_STYLE[standing.tier]}`}>
      <Trophy className="h-3.5 w-3.5" />
      {standing.tier === "none" ? c.tierNames.none : formatMessage(c.profile.tierLabel, { tier: standing.tier })}
      {standing.rank ? <span className="font-medium opacity-80">· #{standing.rank}</span> : null}
    </span>
  );
}

function Item({ label, value, ltr }: { label: string; value?: string | null; ltr?: boolean }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-[11px] text-ink-muted mb-0.5">{label}</dt>
      <dd className="text-sm font-medium text-ink" dir={ltr ? "ltr" : undefined}>{value}</dd>
    </div>
  );
}

/** The client's identity, registration, address and points of contact on the client page. */
export function ClientProfilePanel({ contact, standing, className = "" }: { contact: CRMContact; standing: ClientStanding | null; className?: string }) {
  const { t, locale } = useAdminLocale();
  const c = t.clients;
  const f = c.form;
  const kind = contact.client_kind ?? "individual";
  const Icon = kind === "company" ? Building2 : kind === "government" ? Landmark : User;
  const address = formatClientAddress(contact.address_details, c.addressParts, t.countries);
  const crExpiry = contact.cr_expiry_date ? new Date(`${contact.cr_expiry_date}T00:00:00Z`) : null;
  const daysToExpiry = crExpiry ? Math.floor((crExpiry.getTime() - Date.now()) / 86400000) : null;
  const persons = contact.contact_persons ?? [];

  return (
    <div className={`space-y-6 ${className}`}>
      <Card className="p-6 space-y-4">
        <h3 className="text-base font-bold text-ink flex items-center gap-2">
          <Icon className="w-4 h-4 text-accent" />
          <span>{kind === "company" ? c.profile.companyProfile : kind === "government" ? c.profile.entityProfile : c.profile.personalProfile}</span>
        </h3>
        {daysToExpiry !== null && daysToExpiry <= 30 ? (
          <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-800 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {daysToExpiry < 0 ? c.profile.crExpired : formatMessage(c.profile.crExpiresSoon, { days: String(daysToExpiry) })}
          </div>
        ) : null}
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {kind === "individual" ? (
            <>
              <Item label={f.fullName} value={contact.full_name} />
              <Item label={f.nationality} value={countryName(contact.nationality, t.countries)} />
              <Item label={f.jobTitle} value={contact.job_title} />
            </>
          ) : (
            <>
              <Item label={kind === "company" ? f.companyNameEn : f.entityNameEn} value={contact.company} ltr />
              <Item label={kind === "company" ? f.companyNameAr : f.entityNameAr} value={contact.company_name_ar} />
              {kind === "company" ? (
                <>
                  <Item label={c.filters.origin} value={contact.company_origin ? c.origins[contact.company_origin] : null} />
                  <Item label={f.legalForm} value={contact.legal_form ? c.legalForms[contact.legal_form as keyof typeof c.legalForms] : null} />
                  <Item label={f.crNumber} value={contact.cr_number} ltr />
                  <Item label={f.crExpiry} value={contact.cr_expiry_date ? formatDate(contact.cr_expiry_date, locale) : null} />
                  <Item label={f.registrationCountry} value={contact.company_origin === "foreign" ? countryName(contact.registration_country, t.countries) : null} />
                  <Item label={f.registrationNumber} value={contact.registration_number} ltr />
                </>
              ) : (
                <>
                  <Item label={f.governmentType} value={contact.government_type ? c.governmentTypes[contact.government_type as keyof typeof c.governmentTypes] : null} />
                  <Item label={f.entityCountry} value={countryName(contact.registration_country, t.countries)} />
                  <Item label={f.supplierNumber} value={contact.supplier_number} ltr />
                </>
              )}
              <Item label={f.industry} value={contact.industry ? c.industries[contact.industry as keyof typeof c.industries] : null} />
            </>
          )}
          <Item label={contact.registration_country && contact.registration_country !== "BH" ? f.taxNumber : f.vatNumber} value={contact.vat_number} ltr />
          <Item label={f.classification} value={t.crm.contactTypes[contact.contact_type ?? "client"]} />
          <Item label={f.preferredLanguage} value={contact.preferred_language === "ar" ? f.languageAr : contact.preferred_language === "en" ? f.languageEn : null} />
          <Item label={f.paymentTerms} value={contact.payment_terms_days !== undefined ? formatMessage(c.profile.days, { n: String(contact.payment_terms_days) }) : null} />
          {contact.website ? (
            <div>
              <dt className="text-[11px] text-ink-muted mb-0.5">{f.website}</dt>
              <dd className="text-sm"><a href={contact.website} target="_blank" rel="noreferrer noopener" dir="ltr" className="text-accent hover:underline break-all">{contact.website.replace(/^https?:\/\//, "")}</a></dd>
            </div>
          ) : null}
        </dl>
        {contact.requires_purchase_order ? (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 px-3 py-1 text-[11px] font-semibold text-sky-700 dark:text-sky-300">
            <FileBadge className="h-3.5 w-3.5" />
            {c.profile.poRequired}
          </div>
        ) : null}
        {standing && standing.billed > 0 ? (
          <p className="text-xs text-ink-muted border-t border-outline-variant pt-3">
            {standing.rank ? formatMessage(c.profile.rankLine, { rank: String(standing.rank), total: String(standing.rankedClients) }) : c.profile.notRanked}
            {" · "}
            {c.columns.billed}: {formatCurrencyValue(standing.billed, standing.currency, locale === "ar")}
          </p>
        ) : null}
        {contact.notes ? (
          <div className="border-t border-outline-variant pt-3">
            <div className="text-[11px] text-ink-muted mb-1">{f.notes}</div>
            <p className="text-xs text-ink bg-ink/[0.03] p-3 rounded-xl whitespace-pre-wrap">{contact.notes}</p>
          </div>
        ) : null}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 space-y-3">
          <h3 className="text-sm font-bold text-ink flex items-center gap-2">
            <User className="w-4 h-4 text-accent" />
            {kind === "individual" ? c.profile.contactDetails : c.profile.contacts}
          </h3>
          {kind === "individual" ? (
            <ul className="space-y-1.5 text-xs">
              {contact.email ? <li className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-ink-muted" /><a href={`mailto:${contact.email}`} dir="ltr" className="text-accent hover:underline"><bdi dir="ltr">{contact.email}</bdi></a></li> : null}
              {contact.phone ? <li className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-ink-muted" /><a href={`tel:${contact.phone}`} dir="ltr" className="text-accent hover:underline"><bdi dir="ltr">{contact.phone}</bdi></a></li> : null}
              {!contact.email && !contact.phone ? <li className="text-ink-muted">{c.profile.noContactDetails}</li> : null}
            </ul>
          ) : persons.length ? (
            <ul className="divide-y divide-outline-variant">
              {persons.map((p) => (
                <li key={p.id} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-ink">{p.full_name}</span>
                    {p.is_primary ? (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                        <Star className="h-2.5 w-2.5" />{f.poc.primary}
                      </span>
                    ) : null}
                  </div>
                  {p.position || p.department ? (
                    <div className="text-[11px] text-ink-muted">{[p.position, p.department].filter(Boolean).join(" · ")}</div>
                  ) : null}
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    {p.email ? <a href={`mailto:${p.email}`} dir="ltr" className="inline-flex items-center gap-1 text-accent hover:underline"><Mail className="h-3 w-3" />{p.email}</a> : null}
                    {p.phone ? <a href={`tel:${p.phone}`} dir="ltr" className="inline-flex items-center gap-1 text-accent hover:underline"><Phone className="h-3 w-3" />{p.phone}</a> : null}
                  </div>
                  {p.notes ? <div className="mt-1 text-[11px] text-ink-muted">{p.notes}</div> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-ink-muted">{f.poc.empty}</p>
          )}
        </Card>
        <Card className="p-6 space-y-3">
          <h3 className="text-sm font-bold text-ink flex items-center gap-2">
            <MapPin className="w-4 h-4 text-accent" />
            {c.profile.address}
          </h3>
          <p className="text-sm text-ink leading-relaxed">{address || <span className="text-xs text-ink-muted">{c.profile.noAddress}</span>}</p>
        </Card>
      </div>
    </div>
  );
}
