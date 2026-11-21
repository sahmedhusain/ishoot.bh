"use client";

import * as React from "react";
import { Card, PhoneInput, Button } from "@platform/ui";
import {
  Phone,
  Mail,
  HeartPulse,
  ShieldAlert,
  Building2,
  Plus,
  Trash2,
  Star,
  CheckCircle2,
} from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import type {
  EmployeeContactEntry,
  EmployeeContactType,
  EmployeeEmailEntry,
  EmployeeEmailType,
  EmployeeEmergencyContact,
  EmployeeExtendedProfile,
  EmployeeHealthRecord,
} from "../../lib/api/hr";

const CONTACT_TYPES: EmployeeContactType[] = ["mobile", "work", "home", "whatsapp", "other"];
const EMAIL_TYPES: EmployeeEmailType[] = ["work", "personal", "other"];
const BLOOD_TYPES = ["", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const RELATIONSHIPS = ["spouse", "parent", "sibling", "child", "relative", "friend", "other"];
const MARITAL_STATUSES = ["", "single", "married", "divorced", "widowed"];

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function emptyExtendedProfile(initial?: {
  phone?: string | null;
  email?: string | null;
}): EmployeeExtendedProfile {
  return {
    contacts: initial?.phone
      ? [{ id: uid("ct"), type: "mobile", value: initial.phone, isPrimary: true }]
      : [],
    emails: initial?.email
      ? [{ id: uid("em"), type: "work", value: initial.email, isPrimary: true, syncToAccount: true }]
      : [],
    emergencyContacts: [],
    healthRecord: {},
    workLocation: "",
    probationEndDate: "",
    maritalStatus: "",
    bankName: "",
    iban: "",
    hrNotes: "",
  };
}

interface EmployeeExtendedProfileFieldsProps {
  value: EmployeeExtendedProfile;
  onChange: (next: EmployeeExtendedProfile) => void;
  disabled?: boolean;
}

export function EmployeeExtendedProfileFields({
  value,
  onChange,
  disabled = false,
}: EmployeeExtendedProfileFieldsProps) {
  const { t } = useAdminLocale();
  const ext = t.employeeExtendedProfile;

  const update = (patch: Partial<EmployeeExtendedProfile>) => onChange({ ...value, ...patch });

  // Contacts handlers
  const addContact = () => {
    const next: EmployeeContactEntry = {
      id: uid("ct"),
      type: value.contacts.length === 0 ? "mobile" : "work",
      label: "",
      value: "",
      isPrimary: value.contacts.length === 0,
    };
    update({ contacts: [...value.contacts, next] });
  };
  const patchContact = (id: string, patch: Partial<EmployeeContactEntry>) => {
    update({
      contacts: value.contacts.map((c) => {
        if (patch.isPrimary) {
          return c.id === id ? { ...c, ...patch, isPrimary: true } : { ...c, isPrimary: false };
        }
        return c.id === id ? { ...c, ...patch } : c;
      }),
    });
  };
  const removeContact = (id: string) => {
    const remaining = value.contacts.filter((c) => c.id !== id);
    if (remaining.length > 0 && !remaining.some((c) => c.isPrimary)) {
      remaining[0] = { ...remaining[0], isPrimary: true };
    }
    update({ contacts: remaining });
  };

  // Emails handlers
  const addEmail = (defaultType?: EmployeeEmailType) => {
    const hasWork = value.emails.some((e) => e.type === "work");
    const type: EmployeeEmailType = defaultType ?? (hasWork ? "personal" : "work");
    const next: EmployeeEmailEntry = {
      id: uid("em"),
      type,
      label: "",
      value: "",
      isPrimary: value.emails.length === 0,
      syncToAccount: type === "work" && !value.emails.some((e) => e.syncToAccount),
    };
    update({ emails: [...value.emails, next] });
  };
  const patchEmail = (id: string, patch: Partial<EmployeeEmailEntry>) => {
    update({
      emails: value.emails.map((e) => {
        let next = e.id === id ? { ...e, ...patch } : e;
        if (patch.isPrimary) {
          next = e.id === id ? { ...next, isPrimary: true } : { ...next, isPrimary: false };
        }
        if (patch.syncToAccount) {
          next = e.id === id ? { ...next, syncToAccount: true } : { ...next, syncToAccount: false };
        }
        return next;
      }),
    });
  };
  const removeEmail = (id: string) => {
    const remaining = value.emails.filter((e) => e.id !== id);
    if (remaining.length > 0 && !remaining.some((e) => e.isPrimary)) {
      remaining[0] = { ...remaining[0], isPrimary: true };
    }
    update({ emails: remaining });
  };

  // Emergency contacts handlers
  const addEmergency = () => {
    const next: EmployeeEmergencyContact = {
      id: uid("ec"),
      name: "",
      relationship: "spouse",
      phone: "",
      email: "",
      isPrimary: value.emergencyContacts.length === 0,
    };
    update({ emergencyContacts: [...value.emergencyContacts, next] });
  };
  const patchEmergency = (id: string, patch: Partial<EmployeeEmergencyContact>) => {
    update({
      emergencyContacts: value.emergencyContacts.map((ec) => {
        if (patch.isPrimary) {
          return ec.id === id ? { ...ec, ...patch, isPrimary: true } : { ...ec, isPrimary: false };
        }
        return ec.id === id ? { ...ec, ...patch } : ec;
      }),
    });
  };
  const removeEmergency = (id: string) => {
    const remaining = value.emergencyContacts.filter((ec) => ec.id !== id);
    if (remaining.length > 0 && !remaining.some((ec) => ec.isPrimary)) {
      remaining[0] = { ...remaining[0], isPrimary: true };
    }
    update({ emergencyContacts: remaining });
  };

  const patchHealth = (patch: Partial<EmployeeHealthRecord>) => {
    update({ healthRecord: { ...(value.healthRecord || {}), ...patch } });
  };

  const health = value.healthRecord || {};

  return (
    <div className="space-y-6">
      {/* 1. Unlimited Contacts */}
      <Card className="p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-outline-variant">
          <div className="flex items-center gap-2 text-primary dark:text-mint font-semibold">
            <Phone className="w-5 h-5" />
            <div>
              <h2>{ext.contactsTitle}</h2>
              <p className="text-[11px] font-normal text-ink-muted">{ext.contactsDesc}</p>
            </div>
          </div>
          {!disabled && (
            <Button type="button" size="sm" variant="outline" onClick={addContact} className="gap-1.5 text-xs">
              <Plus className="w-3.5 h-3.5" />
              {ext.addContact}
            </Button>
          )}
        </div>

        {value.contacts.length === 0 ? (
          <p className="text-xs text-ink-muted">{ext.noContactsYet}</p>
        ) : (
          <div className="space-y-3">
            {value.contacts.map((ct) => (
              <div
                key={ct.id}
                className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center rounded-xl border border-outline-variant bg-surface-muted/40 p-3"
              >
                <div className="md:col-span-3">
                  <select
                    disabled={disabled}
                    value={ct.type}
                    onChange={(e) => patchContact(ct.id, { type: e.target.value as EmployeeContactType })}
                    className="w-full text-xs rounded-md border border-outline-variant bg-surface p-2 text-ink"
                  >
                    {CONTACT_TYPES.map((ctType) => (
                      <option key={ctType} value={ctType}>
                        {ext.contactTypes[ctType]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-4">
                  <PhoneInput
                    value={ct.value}
                    onChange={(v) => patchContact(ct.id, { value: v })}
                    disabled={disabled}
                    className="w-full text-xs"
                  />
                </div>
                <div className="md:col-span-2">
                  <input
                    type="text"
                    disabled={disabled}
                    value={ct.label || ""}
                    onChange={(e) => patchContact(ct.id, { label: e.target.value })}
                    placeholder={ext.contactLabelPlaceholder}
                    className="w-full text-xs rounded-md border border-outline-variant bg-surface p-2 text-ink"
                  />
                </div>
                <div className="md:col-span-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => patchContact(ct.id, { isPrimary: true })}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-medium border transition-colors ${
                      ct.isPrimary
                        ? "border-primary bg-primary/10 text-primary dark:text-mint"
                        : "border-outline-variant bg-surface text-ink-muted hover:text-ink"
                    }`}
                  >
                    <Star className={`w-3 h-3 ${ct.isPrimary ? "fill-current" : ""}`} />
                    {ct.isPrimary ? ext.defaultBadge : ext.setDefault}
                  </button>
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => removeContact(ct.id)}
                      className="p-1.5 rounded-md text-rose-500 hover:bg-rose-500/10"
                      aria-label={t.actions.delete}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 2. Unlimited Emails (Work / Personal / Account Sync) */}
      <Card className="p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-outline-variant">
          <div className="flex items-center gap-2 text-primary dark:text-mint font-semibold">
            <Mail className="w-5 h-5" />
            <div>
              <h2>{ext.emailsTitle}</h2>
              <p className="text-[11px] font-normal text-ink-muted">{ext.emailsDesc}</p>
            </div>
          </div>
          {!disabled && (
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => addEmail("work")} className="gap-1 text-xs">
                <Plus className="w-3.5 h-3.5" />
                {ext.addWorkEmail}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => addEmail("personal")} className="gap-1 text-xs">
                <Plus className="w-3.5 h-3.5" />
                {ext.addPersonalEmail}
              </Button>
            </div>
          )}
        </div>

        {value.emails.length === 0 ? (
          <p className="text-xs text-ink-muted">{ext.noEmailsYet}</p>
        ) : (
          <div className="space-y-3">
            {value.emails.map((em) => (
              <div
                key={em.id}
                className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center rounded-xl border border-outline-variant bg-surface-muted/40 p-3"
              >
                <div className="md:col-span-2">
                  <select
                    disabled={disabled}
                    value={em.type}
                    onChange={(e) => patchEmail(em.id, { type: e.target.value as EmployeeEmailType })}
                    className="w-full text-xs rounded-md border border-outline-variant bg-surface p-2 text-ink"
                  >
                    {EMAIL_TYPES.map((emType) => (
                      <option key={emType} value={emType}>
                        {ext.emailTypes[emType]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-4">
                  <input
                    type="email"
                    dir="ltr"
                    disabled={disabled}
                    value={em.value}
                    onChange={(e) => patchEmail(em.id, { value: e.target.value })}
                    placeholder={em.type === "work" ? "name@company.bh" : "personal@gmail.com"}
                    className="w-full text-xs rounded-md border border-outline-variant bg-surface p-2 text-ink"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="inline-flex items-center gap-1.5 text-[11px] text-ink cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={disabled}
                      checked={Boolean(em.syncToAccount)}
                      onChange={(e) => patchEmail(em.id, { syncToAccount: e.target.checked })}
                      className="rounded border-outline-variant text-primary"
                    />
                    <span className="inline-flex items-center gap-1">
                      {em.syncToAccount && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                      {ext.useForPortalAccount}
                    </span>
                  </label>
                </div>
                <div className="md:col-span-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => patchEmail(em.id, { isPrimary: true })}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-medium border transition-colors ${
                      em.isPrimary
                        ? "border-primary bg-primary/10 text-primary dark:text-mint"
                        : "border-outline-variant bg-surface text-ink-muted hover:text-ink"
                    }`}
                  >
                    <Star className={`w-3 h-3 ${em.isPrimary ? "fill-current" : ""}`} />
                    {em.isPrimary ? ext.defaultBadge : ext.setDefault}
                  </button>
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => removeEmail(em.id)}
                      className="p-1.5 rounded-md text-rose-500 hover:bg-rose-500/10"
                      aria-label={t.actions.delete}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 3. Emergency Contacts (Unlimited) */}
      <Card className="p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-outline-variant">
          <div className="flex items-center gap-2 text-primary dark:text-mint font-semibold">
            <ShieldAlert className="w-5 h-5" />
            <div>
              <h2>{ext.emergencyTitle}</h2>
              <p className="text-[11px] font-normal text-ink-muted">{ext.emergencyDesc}</p>
            </div>
          </div>
          {!disabled && (
            <Button type="button" size="sm" variant="outline" onClick={addEmergency} className="gap-1.5 text-xs">
              <Plus className="w-3.5 h-3.5" />
              {ext.addEmergencyContact}
            </Button>
          )}
        </div>

        {value.emergencyContacts.length === 0 ? (
          <p className="text-xs text-ink-muted">{ext.noEmergencyYet}</p>
        ) : (
          <div className="space-y-3">
            {value.emergencyContacts.map((ec) => (
              <div
                key={ec.id}
                className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center rounded-xl border border-outline-variant bg-surface-muted/40 p-3"
              >
                <div className="md:col-span-3">
                  <input
                    type="text"
                    disabled={disabled}
                    value={ec.name}
                    onChange={(e) => patchEmergency(ec.id, { name: e.target.value })}
                    placeholder={ext.emergencyNamePlaceholder}
                    className="w-full text-xs rounded-md border border-outline-variant bg-surface p-2 text-ink"
                  />
                </div>
                <div className="md:col-span-2">
                  <select
                    disabled={disabled}
                    value={ec.relationship}
                    onChange={(e) => patchEmergency(ec.id, { relationship: e.target.value })}
                    className="w-full text-xs rounded-md border border-outline-variant bg-surface p-2 text-ink"
                  >
                    {RELATIONSHIPS.map((rel) => (
                      <option key={rel} value={rel}>
                        {ext.relationships[rel as keyof typeof ext.relationships]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-3">
                  <PhoneInput
                    value={ec.phone}
                    onChange={(v) => patchEmergency(ec.id, { phone: v })}
                    disabled={disabled}
                    className="w-full text-xs"
                  />
                </div>
                <div className="md:col-span-2">
                  <input
                    type="email"
                    dir="ltr"
                    disabled={disabled}
                    value={ec.email || ""}
                    onChange={(e) => patchEmergency(ec.id, { email: e.target.value })}
                    placeholder={ext.emergencyEmailPlaceholder}
                    className="w-full text-xs rounded-md border border-outline-variant bg-surface p-2 text-ink"
                  />
                </div>
                <div className="md:col-span-2 flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => patchEmergency(ec.id, { isPrimary: true })}
                    className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-medium border ${
                      ec.isPrimary
                        ? "border-primary bg-primary/10 text-primary dark:text-mint"
                        : "border-outline-variant bg-surface text-ink-muted"
                    }`}
                  >
                    <Star className={`w-3 h-3 ${ec.isPrimary ? "fill-current" : ""}`} />
                  </button>
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => removeEmergency(ec.id)}
                      className="p-1.5 rounded-md text-rose-500 hover:bg-rose-500/10"
                      aria-label={t.actions.delete}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 4. Health & Medical Record */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 text-primary dark:text-mint font-semibold pb-2 border-b border-outline-variant">
          <HeartPulse className="w-5 h-5" />
          <div>
            <h2>{ext.healthTitle}</h2>
            <p className="text-[11px] font-normal text-ink-muted">{ext.healthDesc}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-ink">{ext.bloodType}</span>
            <select
              disabled={disabled}
              value={health.bloodType || ""}
              onChange={(e) => patchHealth({ bloodType: e.target.value })}
              className="w-full text-xs rounded-md border border-outline-variant bg-surface p-2 text-ink"
            >
              <option value="">—</option>
              {BLOOD_TYPES.filter(Boolean).map((bt) => (
                <option key={bt} value={bt}>{bt}</option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-ink">{ext.fitnessStatus}</span>
            <select
              disabled={disabled}
              value={health.fitnessStatus || ""}
              onChange={(e) => patchHealth({ fitnessStatus: e.target.value as EmployeeHealthRecord["fitnessStatus"] })}
              className="w-full text-xs rounded-md border border-outline-variant bg-surface p-2 text-ink"
            >
              <option value="">—</option>
              <option value="fit">{ext.fitnessStatuses.fit}</option>
              <option value="fit_with_restrictions">{ext.fitnessStatuses.fit_with_restrictions}</option>
              <option value="pending">{ext.fitnessStatuses.pending}</option>
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-ink">{ext.lastMedicalCheckup}</span>
            <input
              type="date"
              disabled={disabled}
              value={health.lastMedicalCheckupDate || ""}
              onChange={(e) => patchHealth({ lastMedicalCheckupDate: e.target.value })}
              className="w-full text-xs rounded-md border border-outline-variant bg-surface p-2 text-ink"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-ink">{ext.insuranceProvider}</span>
            <input
              type="text"
              disabled={disabled}
              value={health.insuranceProvider || ""}
              onChange={(e) => patchHealth({ insuranceProvider: e.target.value })}
              placeholder="e.g. Solidarity / Bupa / Giga"
              className="w-full text-xs rounded-md border border-outline-variant bg-surface p-2 text-ink"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-ink">{ext.insurancePolicyNumber}</span>
            <input
              type="text"
              dir="ltr"
              disabled={disabled}
              value={health.insurancePolicyNumber || ""}
              onChange={(e) => patchHealth({ insurancePolicyNumber: e.target.value })}
              className="w-full text-xs font-mono rounded-md border border-outline-variant bg-surface p-2 text-ink"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-ink">{ext.insuranceExpiry}</span>
            <input
              type="date"
              disabled={disabled}
              value={health.insuranceExpiryDate || ""}
              onChange={(e) => patchHealth({ insuranceExpiryDate: e.target.value })}
              className="w-full text-xs rounded-md border border-outline-variant bg-surface p-2 text-ink"
            />
          </label>
          <label className="block space-y-1 sm:col-span-3 md:col-span-1">
            <span className="text-xs font-medium text-ink">{ext.allergies}</span>
            <input
              type="text"
              disabled={disabled}
              value={health.allergies || ""}
              onChange={(e) => patchHealth({ allergies: e.target.value })}
              placeholder={ext.allergiesPlaceholder}
              className="w-full text-xs rounded-md border border-outline-variant bg-surface p-2 text-ink"
            />
          </label>
          <label className="block space-y-1 sm:col-span-3 md:col-span-2">
            <span className="text-xs font-medium text-ink">{ext.medicalNotes}</span>
            <input
              type="text"
              disabled={disabled}
              value={health.medicalNotes || ""}
              onChange={(e) => patchHealth({ medicalNotes: e.target.value })}
              placeholder={ext.medicalNotesPlaceholder}
              className="w-full text-xs rounded-md border border-outline-variant bg-surface p-2 text-ink"
            />
          </label>
        </div>
      </Card>

      {/* 5. Additional HR & Payroll Bank Details */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 text-primary dark:text-mint font-semibold pb-2 border-b border-outline-variant">
          <Building2 className="w-5 h-5" />
          <div>
            <h2>{ext.hrDetailsTitle}</h2>
            <p className="text-[11px] font-normal text-ink-muted">{ext.hrDetailsDesc}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-ink">{ext.workLocation}</span>
            <input
              type="text"
              disabled={disabled}
              value={value.workLocation || ""}
              onChange={(e) => update({ workLocation: e.target.value })}
              placeholder={ext.workLocationPlaceholder}
              className="w-full text-xs rounded-md border border-outline-variant bg-surface p-2 text-ink"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-ink">{ext.probationEndDate}</span>
            <input
              type="date"
              disabled={disabled}
              value={value.probationEndDate || ""}
              onChange={(e) => update({ probationEndDate: e.target.value })}
              className="w-full text-xs rounded-md border border-outline-variant bg-surface p-2 text-ink"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-ink">{ext.maritalStatus}</span>
            <select
              disabled={disabled}
              value={value.maritalStatus || ""}
              onChange={(e) => update({ maritalStatus: e.target.value })}
              className="w-full text-xs rounded-md border border-outline-variant bg-surface p-2 text-ink"
            >
              <option value="">—</option>
              {MARITAL_STATUSES.filter(Boolean).map((ms) => (
                <option key={ms} value={ms}>
                  {ext.maritalStatuses[ms as keyof typeof ext.maritalStatuses]}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-ink">{ext.bankName}</span>
            <input
              type="text"
              disabled={disabled}
              value={value.bankName || ""}
              onChange={(e) => update({ bankName: e.target.value })}
              placeholder="e.g. NBB / BBK / Benefit / Al Salam Bank"
              className="w-full text-xs rounded-md border border-outline-variant bg-surface p-2 text-ink"
            />
          </label>
          <label className="block space-y-1 sm:col-span-2">
            <span className="text-xs font-medium text-ink">{ext.iban}</span>
            <input
              type="text"
              dir="ltr"
              disabled={disabled}
              value={value.iban || ""}
              onChange={(e) => update({ iban: e.target.value.toUpperCase() })}
              placeholder="BH67 BMAG 0000 1299 1234 56"
              className="w-full text-xs font-mono rounded-md border border-outline-variant bg-surface p-2 text-ink"
            />
          </label>
          <label className="block space-y-1 sm:col-span-3">
            <span className="text-xs font-medium text-ink">{ext.hrNotes}</span>
            <textarea
              rows={2}
              disabled={disabled}
              value={value.hrNotes || ""}
              onChange={(e) => update({ hrNotes: e.target.value })}
              placeholder={ext.hrNotesPlaceholder}
              className="w-full text-xs rounded-md border border-outline-variant bg-surface p-2 text-ink"
            />
          </label>
        </div>
      </Card>
    </div>
  );
}
