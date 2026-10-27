"use client";

import { formatMessage } from "@platform/locales";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Building2, CheckCircle2, Landmark, Plus, Star, Trash2, User, UserCog, UserPlus } from "lucide-react";
import { Button, Card, Input, Select } from "@platform/ui";
import type { ClientContactPersonInput, ClientProfileInput, CRMContact } from "@platform/database/types";
import { CONTACT_TYPES } from "@platform/config/constants";
import {
  CLIENT_KINDS,
  GOVERNMENT_TYPES,
  INDUSTRIES,
  LEGAL_FORMS,
  countryOptions,
  type ClientKind,
} from "@platform/database/constants/clients";
import { ROUTES } from "../../constants/routes";
import { createContactAction, updateContactAction } from "../../app/actions/crm";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { useCompanyVat } from "../../hooks/useCompanyVat";
import { errorMessage } from "../../lib/error-text";

type Person = ClientContactPersonInput & { key: string; id?: string };
const KIND_ICONS = { individual: User, company: Building2, government: Landmark } as const;
let personKey = 0;
const newPerson = (primary = false): Person => ({ key: `p${++personKey}`, full_name: "", is_primary: primary });

function Field({ label, hint, required, children, wide }: { label: string; hint?: string; required?: boolean; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`block ${wide ? "sm:col-span-2" : ""}`}>
      <span className="text-xs font-semibold text-ink mb-1.5 block">
        {label}
        {required ? <span className="text-rose-500 ms-0.5">*</span> : null}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] text-ink-muted">{hint}</span> : null}
    </label>
  );
}

function Section({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="space-y-4" data-page-section>
      <div className="flex items-center justify-between gap-3 border-b border-outline-variant pb-2">
        <h2 className="text-sm font-bold text-ink">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Create or edit a client: individual, company (local with CR, or foreign) or government entity. */
export function ClientProfileForm({ contact, defaultPaymentTermsDays }: { contact?: CRMContact; defaultPaymentTermsDays: number }) {
  const router = useRouter();
  const { t } = useAdminLocale();
  const c = t.clients;
  const f = c.form;
  const vat = useCompanyVat();
  const countries = React.useMemo(() => countryOptions(t.countries), [t.countries]);

  const [kind, setKind] = React.useState<ClientKind>(contact?.client_kind ?? "individual");
  const [values, setValues] = React.useState<ClientProfileInput>(() => ({
    full_name: contact && contact.client_kind === "individual" ? contact.full_name : "",
    email: contact?.email ?? "",
    phone: contact?.phone ?? "",
    job_title: contact?.job_title ?? "",
    company: contact?.company ?? "",
    company_ar: contact?.company_name_ar ?? "",
    company_origin: contact?.company_origin ?? "local",
    legal_form: contact?.legal_form ?? "",
    cr_number: contact?.cr_number ?? "",
    cr_expiry_date: contact?.cr_expiry_date ?? "",
    registration_number: contact?.registration_number ?? "",
    registration_country: contact?.registration_country ?? "",
    government_type: contact?.government_type ?? "",
    supplier_number: contact?.supplier_number ?? "",
    requires_purchase_order: contact?.requires_purchase_order ?? false,
    nationality: contact?.nationality ?? "",
    industry: contact?.industry ?? "",
    website: contact?.website ?? "",
    vat_number: contact?.vat_number ?? "",
    preferred_language: contact?.preferred_language,
    payment_terms_days: contact?.payment_terms_days,
    contact_type: contact?.contact_type ?? "client",
    notes: contact?.notes ?? "",
    address: { country: "BH", ...(contact?.address_details ?? {}) },
  }));
  const [persons, setPersons] = React.useState<Person[]>(() =>
    contact?.contact_persons?.length
      ? contact.contact_persons.map((p) => ({ ...p, key: `p${++personKey}` }))
      : [newPerson(true)],
  );
  const [saving, setSaving] = React.useState(false);

  const set = <K extends keyof ClientProfileInput>(key: K, value: ClientProfileInput[K]) => setValues((v) => ({ ...v, [key]: value }));
  const setAddress = (key: keyof NonNullable<ClientProfileInput["address"]>, value: string) =>
    setValues((v) => ({ ...v, address: { ...v.address, [key]: value } }));
  const setPerson = (key: string, patch: Partial<Person>) => setPersons((list) => list.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  const makePrimary = (key: string) => setPersons((list) => list.map((p) => ({ ...p, is_primary: p.key === key })));
  const removePerson = (key: string) =>
    setPersons((list) => {
      const next = list.filter((p) => p.key !== key);
      if (next.length && !next.some((p) => p.is_primary)) next[0] = { ...next[0], is_primary: true };
      return next;
    });

  const isOrg = kind !== "individual";
  const local = kind === "company" && values.company_origin !== "foreign";
  const bahrainAddress = (values.address?.country || "BH") === "BH";
  const orgCountry = kind === "company" ? (local ? "BH" : values.registration_country) : values.registration_country || "BH";
  const showVat = vat.enabled || isOrg;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    const website = values.website?.trim();
    const payload: ClientProfileInput = {
      ...values,
      // Names are only sent where they apply (the action rejects a blank name).
      full_name: kind === "individual" ? values.full_name : undefined,
      website: website && !/^https?:\/\//i.test(website) ? `https://${website}` : website,
      client_kind: kind,
      payment_terms_days: values.payment_terms_days === undefined || Number.isNaN(values.payment_terms_days) ? undefined : values.payment_terms_days,
      contact_persons: isOrg ? persons.map(({ key: _key, id: _id, ...p }) => p) : [],
    };
    try {
      const result = contact ? await updateContactAction(contact.id, payload) : await createContactAction(payload);
      toast.success(f.saved);
      router.push(ROUTES.crm.customer(result.contact.id));
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error, t, f.failed));
      setSaving(false);
    }
  };

  const countrySelect = (value: string | undefined, onChange: (value: string) => void, allowEmpty = true, exclude?: string) => (
    <Select value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
      {allowEmpty ? <option value="">{f.select}</option> : null}
      {countries.filter((o) => o.code !== exclude).map((o) => (
        <option key={o.code} value={o.code}>{o.name}</option>
      ))}
    </Select>
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <div className="flex items-center gap-4" data-page-header>
        <Link href={contact ? ROUTES.crm.customer(contact.id) : ROUTES.crm.contacts}>
          <Button variant="outline" size="sm" className="gap-1.5 text-ink-muted">
            <ArrowLeft className="w-4 h-4 rtl:-scale-x-100" />
            <span>{t.actions.back}</span>
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink font-display flex items-center gap-2">
            {contact ? <UserCog className="w-6 h-6 text-accent" /> : <UserPlus className="w-6 h-6 text-accent" />}
            <span>{contact ? f.editTitle : f.newTitle}</span>
          </h1>
          <p className="text-xs text-ink-muted mt-1">{contact ? f.editSubtitle : f.newSubtitle}</p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-6">
        <Card className="p-6 sm:p-8 bg-surface border border-outline-variant rounded-3xl space-y-8">
          <Section title={f.sections.type}>
            <div role="radiogroup" aria-label={f.sections.type} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {CLIENT_KINDS.map((k) => {
                const Icon = KIND_ICONS[k];
                const active = kind === k;
                return (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setKind(k)}
                    className={`flex items-start gap-3 rounded-2xl border p-4 text-start transition-colors ${active ? "border-accent bg-accent/5 ring-2 ring-accent/20" : "border-outline-variant hover:border-ink/30"
                      }`}
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${active ? "bg-accent text-accent-foreground" : "bg-ink/5 text-ink-muted"}`}>
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <span>
                      <span className="block text-sm font-bold text-ink">{c.kinds[k]}</span>
                      <span className="block text-[11px] text-ink-muted mt-0.5">{c.kindHints[k]}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label={f.classification}>
                <Select value={values.contact_type} onChange={(e) => set("contact_type", e.target.value as ClientProfileInput["contact_type"])}>
                  {CONTACT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {t.crm.contactTypes[type.value as keyof typeof t.crm.contactTypes] ?? type.value}
                    </option>
                  ))}
                </Select>
              </Field>
              {kind === "company" ? (
                <Field label={c.filters.origin}>
                  <div className="grid grid-cols-2 gap-2">
                    {(["local", "foreign"] as const).map((origin) => (
                      <button
                        key={origin}
                        type="button"
                        aria-pressed={values.company_origin === origin}
                        onClick={() => set("company_origin", origin)}
                        className={`h-11 rounded-xl border text-sm font-semibold transition-colors ${values.company_origin === origin ? "border-accent bg-accent/5 text-accent" : "border-outline-variant text-ink-muted hover:border-ink/40"
                          }`}
                      >
                        {c.origins[origin]}
                      </button>
                    ))}
                  </div>
                </Field>
              ) : null}
            </div>
          </Section>

          {kind === "individual" ? (
            <Section title={f.sections.identity}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label={f.fullName} required>
                  <Input required value={values.full_name ?? ""} onChange={(e) => set("full_name", e.target.value)} placeholder={f.fullNamePlaceholder} />
                </Field>
                <Field label={f.nationality}>{countrySelect(values.nationality, (v) => set("nationality", v))}</Field>
                <Field label={f.email}>
                  <Input type="email" dir="ltr" value={values.email ?? ""} onChange={(e) => set("email", e.target.value)} />
                </Field>
                <Field label={f.phone}>
                  <Input type="tel" dir="ltr" value={values.phone ?? ""} onChange={(e) => set("phone", e.target.value)} placeholder="+973" />
                </Field>
                <Field label={f.jobTitle}>
                  <Input value={values.job_title ?? ""} onChange={(e) => set("job_title", e.target.value)} />
                </Field>
                {showVat ? (
                  <Field label={f.vatNumber}>
                    <Input dir="ltr" value={values.vat_number ?? ""} onChange={(e) => set("vat_number", e.target.value)} />
                  </Field>
                ) : null}
              </div>
            </Section>
          ) : (
            <Section title={kind === "company" ? f.sections.registration : f.sections.identity}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label={kind === "company" ? f.companyNameEn : f.entityNameEn} required>
                  <Input required value={values.company ?? ""} onChange={(e) => set("company", e.target.value)} />
                </Field>
                <Field label={kind === "company" ? f.companyNameAr : f.entityNameAr}>
                  <Input dir="rtl" value={values.company_ar ?? ""} onChange={(e) => set("company_ar", e.target.value)} />
                </Field>
                {kind === "company" ? (
                  <>
                    <Field label={f.legalForm}>
                      <Select value={values.legal_form ?? ""} onChange={(e) => set("legal_form", e.target.value)}>
                        <option value="">{f.select}</option>
                        {LEGAL_FORMS.map((form) => (
                          <option key={form} value={form}>{c.legalForms[form]}</option>
                        ))}
                      </Select>
                    </Field>
                    {local ? (
                      <>
                        <Field label={f.crNumber} hint={f.crNumberHint} required>
                          <Input required dir="ltr" inputMode="numeric" pattern="\d{1,7}-\d{1,3}" value={values.cr_number ?? ""} onChange={(e) => set("cr_number", e.target.value)} placeholder="142859-1" />
                        </Field>
                        <Field label={f.crExpiry}>
                          <Input type="date" value={values.cr_expiry_date ?? ""} onChange={(e) => set("cr_expiry_date", e.target.value)} />
                        </Field>
                      </>
                    ) : (
                      <>
                        <Field label={f.registrationCountry} required>
                          {countrySelect(values.registration_country, (v) => set("registration_country", v), true, "BH")}
                        </Field>
                        <Field label={f.registrationNumber} hint={f.registrationNumberHint} required>
                          <Input required dir="ltr" value={values.registration_number ?? ""} onChange={(e) => set("registration_number", e.target.value)} />
                        </Field>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <Field label={f.governmentType}>
                      <Select value={values.government_type ?? ""} onChange={(e) => set("government_type", e.target.value)}>
                        <option value="">{f.select}</option>
                        {GOVERNMENT_TYPES.map((type) => (
                          <option key={type} value={type}>{c.governmentTypes[type]}</option>
                        ))}
                      </Select>
                    </Field>
                    <Field label={f.entityCountry}>
                      {countrySelect(values.registration_country || "BH", (v) => set("registration_country", v), false)}
                    </Field>
                    <Field label={f.supplierNumber} hint={f.supplierNumberHint}>
                      <Input dir="ltr" value={values.supplier_number ?? ""} onChange={(e) => set("supplier_number", e.target.value)} />
                    </Field>
                    <label className="flex items-center gap-2.5 self-end h-11 text-sm text-ink">
                      <input type="checkbox" className="h-4 w-4 accent-accent" checked={!!values.requires_purchase_order} onChange={(e) => set("requires_purchase_order", e.target.checked)} />
                      {f.requiresPo}
                    </label>
                  </>
                )}
                <Field label={orgCountry === "BH" ? f.vatNumber : f.taxNumber} hint={orgCountry === "BH" ? f.vatNumberHint : undefined}>
                  <Input dir="ltr" inputMode={orgCountry === "BH" ? "numeric" : undefined} value={values.vat_number ?? ""} onChange={(e) => set("vat_number", e.target.value)} />
                </Field>
                <Field label={f.industry}>
                  <Select value={values.industry ?? ""} onChange={(e) => set("industry", e.target.value)}>
                    <option value="">{f.select}</option>
                    {INDUSTRIES.map((industry) => (
                      <option key={industry} value={industry}>{c.industries[industry]}</option>
                    ))}
                  </Select>
                </Field>
                <Field label={f.website}>
                  <Input dir="ltr" type="text" inputMode="url" value={values.website ?? ""} onChange={(e) => set("website", e.target.value)} placeholder={t.copy.websiteExample} />
                </Field>
              </div>
            </Section>
          )}

          {isOrg ? (
            <Section
              title={f.sections.contacts}
              aside={
                <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={persons.length >= 20} onClick={() => setPersons((list) => [...list, newPerson(!list.length)])}>
                  <Plus className="w-3.5 h-3.5" />
                  {f.poc.add}
                </Button>
              }
            >
              <p className="text-[11px] text-ink-muted -mt-2">{f.poc.note}</p>
              <div className="space-y-3">
                {persons.map((p, index) => (
                  <div key={p.key} className={`rounded-2xl border p-4 ${p.is_primary ? "border-accent/50 bg-accent/5" : "border-outline-variant"}`}>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-xs font-bold text-ink">
                        {formatMessage(f.poc.contactNumber, { n: String(index + 1) })}
                        {p.is_primary ? (
                          <span className="ms-2 inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
                            <Star className="h-3 w-3" />
                            {f.poc.primary}
                          </span>
                        ) : null}
                      </span>
                      <span className="flex items-center gap-1">
                        {!p.is_primary ? (
                          <button type="button" onClick={() => makePrimary(p.key)} className="rounded-lg px-2 py-1 text-[11px] font-semibold text-accent hover:bg-accent/10">
                            {f.poc.makePrimary}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => removePerson(p.key)}
                          disabled={persons.length === 1}
                          aria-label={f.poc.remove}
                          title={f.poc.remove}
                          className="rounded-lg p-1.5 text-ink-muted hover:text-rose-500 hover:bg-rose-500/10 disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Field label={f.poc.name} required>
                        <Input required value={p.full_name} onChange={(e) => setPerson(p.key, { full_name: e.target.value })} />
                      </Field>
                      <Field label={f.poc.position}>
                        <Input value={p.position ?? ""} onChange={(e) => setPerson(p.key, { position: e.target.value })} />
                      </Field>
                      <Field label={f.poc.department}>
                        <Input value={p.department ?? ""} onChange={(e) => setPerson(p.key, { department: e.target.value })} />
                      </Field>
                      <Field label={f.poc.email}>
                        <Input type="email" dir="ltr" value={p.email ?? ""} onChange={(e) => setPerson(p.key, { email: e.target.value })} />
                      </Field>
                      <Field label={f.poc.phone}>
                        <Input type="tel" dir="ltr" value={p.phone ?? ""} onChange={(e) => setPerson(p.key, { phone: e.target.value })} placeholder="+973" />
                      </Field>
                      <Field label={f.poc.notes}>
                        <Input value={p.notes ?? ""} onChange={(e) => setPerson(p.key, { notes: e.target.value })} />
                      </Field>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          <Section title={f.sections.address}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <Field label={f.address.country}>{countrySelect(values.address?.country, (v) => setAddress("country", v), false)}</Field>
              {bahrainAddress ? (
                <>
                  <Field label={f.address.building}>
                    <Input dir="ltr" value={values.address?.building ?? ""} onChange={(e) => setAddress("building", e.target.value)} />
                  </Field>
                  <Field label={f.address.unit}>
                    <Input dir="ltr" value={values.address?.unit ?? ""} onChange={(e) => setAddress("unit", e.target.value)} />
                  </Field>
                  <Field label={f.address.road}>
                    <Input dir="ltr" value={values.address?.road ?? ""} onChange={(e) => setAddress("road", e.target.value)} />
                  </Field>
                  <Field label={f.address.block}>
                    <Input dir="ltr" inputMode="numeric" value={values.address?.block ?? ""} onChange={(e) => setAddress("block", e.target.value)} />
                  </Field>
                  <Field label={f.address.area}>
                    <Input value={values.address?.area ?? ""} onChange={(e) => setAddress("area", e.target.value)} />
                  </Field>
                </>
              ) : (
                <>
                  <Field label={f.address.line} wide>
                    <Input value={values.address?.line ?? ""} onChange={(e) => setAddress("line", e.target.value)} />
                  </Field>
                  <Field label={f.address.state}>
                    <Input value={values.address?.state ?? ""} onChange={(e) => setAddress("state", e.target.value)} />
                  </Field>
                  <Field label={f.address.postalCode}>
                    <Input dir="ltr" value={values.address?.postal_code ?? ""} onChange={(e) => setAddress("postal_code", e.target.value)} />
                  </Field>
                </>
              )}
              <Field label={f.address.city}>
                <Input value={values.address?.city ?? ""} onChange={(e) => setAddress("city", e.target.value)} />
              </Field>
              <Field label={f.address.poBox}>
                <Input dir="ltr" value={values.address?.po_box ?? ""} onChange={(e) => setAddress("po_box", e.target.value)} />
              </Field>
            </div>
          </Section>

          <Section title={f.sections.commercial}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label={f.paymentTerms} hint={formatMessage(f.paymentTermsHint, { days: String(defaultPaymentTermsDays) })}>
                <Input
                  type="number"
                  min={0}
                  max={365}
                  value={values.payment_terms_days ?? ""}
                  onChange={(e) => set("payment_terms_days", e.target.value === "" ? undefined : Number(e.target.value))}
                />
              </Field>
              <Field label={f.preferredLanguage}>
                <Select value={values.preferred_language ?? ""} onChange={(e) => set("preferred_language", (e.target.value || undefined) as ClientProfileInput["preferred_language"])}>
                  <option value="">{f.languageDefault}</option>
                  <option value="ar">{f.languageAr}</option>
                  <option value="en">{f.languageEn}</option>
                </Select>
              </Field>
              <Field label={f.notes} wide>
                <textarea
                  rows={4}
                  value={values.notes ?? ""}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder={f.notesPlaceholder}
                  className="w-full bg-surface-raised dark:bg-surface border border-ink/25 rounded-xl p-3 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </Field>
            </div>
          </Section>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Link href={contact ? ROUTES.crm.customer(contact.id) : ROUTES.crm.contacts}>
            <Button type="button" variant="outline" size="sm">{t.actions.cancel}</Button>
          </Link>
          <Button type="submit" variant="primary" size="sm" disabled={saving} className="gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{saving ? f.saving : f.save}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
