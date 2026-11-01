"use client";

import * as React from "react";
import { COUNTRY_DIAL_CODES, countryFlag, countryIso, formatPhoneE164, isValidPhone, splitPhoneNumber } from "@platform/config/phone";
import { cn } from "./utils";
import { Select } from "./select";
import { useCurrencyLocale } from "./currency-display";
import { useUiCopy } from "./copy/use-ui-copy";

export { COUNTRY_DIAL_CODES, countryFlag, type CountryDialCode } from "@platform/config/phone";
const PhoneCountryContext = React.createContext<string | undefined>(undefined);
export function PhoneCountryProvider({ country, children }: { country?: string; children: React.ReactNode }) {
  return <PhoneCountryContext.Provider value={country}>{children}</PhoneCountryContext.Provider>;
}

export function useCompanyCountry() { const raw = React.useContext(PhoneCountryContext); return raw && /^[a-z]{2}$/i.test(raw) ? raw.toUpperCase() : countryIso(raw); }

export interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "defaultValue" | "type"> {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  defaultCountryCode?: string;
  "data-testid"?: string;
}

export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(function PhoneInput(
  { value, defaultValue = "", onChange, defaultCountryCode, name, id, required, disabled, placeholder, className, "data-testid": testId, ...props }, ref,
) {
  const companyCountry = React.useContext(PhoneCountryContext);
  const fallback = defaultCountryCode ?? companyCountry ?? "";
  const copy = useUiCopy();
  const locale = useCurrencyLocale();
  const countries = React.useMemo(() => {
    const names = new Intl.DisplayNames([locale], { type: "region" });
    return COUNTRY_DIAL_CODES.map((country) => ({
      ...country,
      flag: country.flag || countryFlag(country.iso),
      label: names.of(country.iso.startsWith("001-") ? "001" : country.iso) ?? country.iso,
    })).sort((a, b) => a.label.localeCompare(b.label, locale));
  }, [locale]);
  const options = React.useMemo(
    () => [
      <option key="" value="" data-trigger-label={copy.countryCode}>
        {copy.countryCode}
      </option>,
      ...countries.map((country) => (
        <option
          key={country.iso}
          value={country.iso}
          data-trigger-label={`${country.flag} ${country.dialCode}`}
        >
          {`${country.flag} ${country.label} (${country.dialCode})`}
        </option>
      )),
    ],
    [countries, copy.countryCode],
  );
  const parts = (phone: string) => {
    const parsed = splitPhoneNumber(phone, fallback);
    return { iso: parsed.country ?? countries.find((country) => country.iso === countryIso(fallback) && country.dialCode === parsed.countryCode)?.iso ?? countries.find((country) => country.dialCode === parsed.countryCode)?.iso ?? "", national: parsed.nationalNumber };
  };
  const [entry, setEntry] = React.useState(() => parts(value ?? defaultValue));
  const lastEmitted = React.useRef<string | undefined>(undefined);
  const input = React.useRef<HTMLInputElement>(null);
  React.useImperativeHandle(ref, () => input.current!, []);
  React.useEffect(() => {
    if (value !== undefined && value === lastEmitted.current) return;
    setEntry(parts(value ?? defaultValue));
    // Only external updates reset the selected country, including countries sharing a calling code.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, defaultValue, fallback]);
  const code = COUNTRY_DIAL_CODES.find((country) => country.iso === entry.iso)?.dialCode ?? "";
  const rawCombined = entry.national ? `${code || "+"}${entry.national}` : "";
  const combined = formatPhoneE164(rawCombined) || rawCombined;
  React.useEffect(() => {
    input.current?.setCustomValidity(entry.national && (!entry.iso || !isValidPhone(combined)) ? copy.invalidPhone : "");
  }, [combined, entry.national, entry.iso, copy.invalidPhone]);
  const update = (next: typeof entry) => {
    setEntry(next);
    const dial = COUNTRY_DIAL_CODES.find((country) => country.iso === next.iso)?.dialCode ?? "";
    const raw = next.national ? `${dial || "+"}${next.national}` : "";
    lastEmitted.current = formatPhoneE164(raw) || raw;
    onChange?.(lastEmitted.current);
  };
  const isInvalid = Boolean(entry.national && (!entry.iso || !isValidPhone(combined)));
  return (
    <div
      dir="ltr"
      className={cn("flex min-w-0 items-stretch gap-2", disabled && "opacity-[0.38]", className)}
      data-ui="phone-input"
      data-testid={testId}
    >
      <Select
        aria-label={copy.countryCode}
        value={entry.iso}
        required={required || !!entry.national}
        disabled={disabled}
        aria-invalid={isInvalid || undefined}
        onChange={(event) => update({ ...entry, iso: event.target.value })}
        className="w-[7.25rem] sm:w-[7.5rem] shrink-0 font-medium"
        autoComplete="tel-country-code"
        dir="ltr"
        popupDir={locale?.startsWith("ar") ? "rtl" : "ltr"}
      >
        {options}
      </Select>
      <input
        {...props}
        ref={input}
        id={id}
        data-ui="text-field"
        type="tel"
        inputMode="tel"
        dir="ltr"
        required={required}
        disabled={disabled}
        aria-invalid={isInvalid || props["aria-invalid"] || undefined}
        placeholder={placeholder ?? copy.phoneNational}
        autoComplete={props.autoComplete ?? "tel-national"}
        maxLength={20}
        value={entry.national}
        className="min-w-0 flex-1 rounded-[var(--admin-field-radius,var(--md-sys-shape-corner-extra-small,8px))] border border-m3-outline bg-[var(--md-sys-color-surface-container-lowest,transparent)] px-3.5 py-2 text-base text-m3-on-surface placeholder:text-m3-on-surface-variant focus:border-m3-primary focus:outline-none focus:ring-1 focus:ring-m3-primary aria-[invalid=true]:border-m3-error aria-[invalid=true]:ring-m3-error sm:text-sm"
        onChange={(event) => {
          const raw = event.target.value;
          if (/^(\+|00)/.test(raw)) update(parts(raw));
          else update({ ...entry, national: raw.replace(/[\u0660-\u0669]/g, (digit) => String(digit.charCodeAt(0) - 1632)).replace(/[\u06F0-\u06F9]/g, (digit) => String(digit.charCodeAt(0) - 1776)).replace(/\D/g, "") });
        }}
      />
      {name && <input type="hidden" name={name} value={combined} disabled={disabled} />}
    </div>
  );
});
