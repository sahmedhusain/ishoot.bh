import { formatMessage } from "@platform/locales";
import type { ClientAddress } from "@platform/database/types";
import { countryName } from "@platform/database/constants/clients";

export interface AddressLabels {
  building: string;
  unit: string;
  road: string;
  block: string;
  poBox: string;
  separator: string;
}

/**
 * One-line address in the document or interface language. Bahrain addresses follow the
 * building, road, block, area order; other countries use the street line and postal code.
 */
export function formatClientAddress(
  address: ClientAddress | undefined,
  labels: AddressLabels,
  countries: Record<string, string>,
): string {
  if (!address) return "";
  const label = (template: string, value?: string) =>
    value ? formatMessage(template, { v: value }) : "";
  const parts =
    (address.country || "BH") === "BH"
      ? [
          label(labels.building, address.building),
          label(labels.unit, address.unit),
          label(labels.road, address.road),
          label(labels.block, address.block),
          address.area,
          address.city,
        ]
      : [address.line, address.city, address.state, address.postal_code];
  parts.push(
    label(labels.poBox, address.po_box),
    countryName(address.country, countries),
  );
  return parts.filter(Boolean).join(labels.separator);
}
