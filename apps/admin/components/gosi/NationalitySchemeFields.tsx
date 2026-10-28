"use client";

import * as React from "react";
import { Button, Select } from "@platform/ui";
import { countryOptions } from "@platform/database/constants/clients";
import { INSURED_CATEGORIES, type InsuredCategory, type GosiRules } from "@platform/database/hr/social-insurance";
import { useAdminLocale } from "../../hooks/useAdminLocale";

export function NationalitySchemeFields({ rules, disabled, onChange }: { rules: GosiRules; disabled: boolean; onChange: (rules: GosiRules) => void }) {
  const { t } = useAdminLocale();
  const copy = t.gosi;
  const [country, setCountry] = React.useState("");
  const [category, setCategory] = React.useState<InsuredCategory>("expat");
  const mappings = rules.nationalityCategories ?? {};
  return <section className="space-y-3 rounded-3xl border border-outline-variant bg-surface-raised p-5">
    <div><h2 className="text-sm font-bold">{copy.nationalityRules}</h2><p className="text-xs text-ink-muted">{copy.nationalityRulesHint}</p></div>
    <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
      <Select aria-label={copy.country} value={country} onChange={(event) => setCountry(event.target.value)} disabled={disabled}><option value="">{copy.country}</option><option value="*">{copy.allOtherCountries}</option>{countryOptions(t.countries).map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</Select>
      <Select aria-label={copy.fields.appliesTo} value={category} onChange={(event) => setCategory(event.target.value as InsuredCategory)} disabled={disabled}>{INSURED_CATEGORIES.map((item) => <option key={item} value={item}>{copy.categories[item]}</option>)}</Select>
      <Button type="button" disabled={disabled || !country} onClick={() => onChange({ ...rules, nationalityCategories: { ...mappings, [country]: category } })}>{copy.saveMapping}</Button>
    </div>
    {Object.entries(mappings).map(([iso, scheme]) => <div key={iso} className="flex items-center justify-between gap-3 rounded-xl border border-outline-variant p-3 text-sm"><span>{iso === "*" ? copy.allOtherCountries : t.countries[iso as keyof typeof t.countries] ?? iso} · {copy.categories[scheme]}</span><Button type="button" variant="ghost" disabled={disabled} onClick={() => { const next = { ...mappings }; delete next[iso]; onChange({ ...rules, nationalityCategories: next }); }}>{copy.removeMapping}</Button></div>)}
  </section>;
}
