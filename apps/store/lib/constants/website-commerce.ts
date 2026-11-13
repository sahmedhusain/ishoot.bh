import { formatPhoneE164 } from "./phone";
import {
  formatMessage,
  serverTemplates,
  serverMessages,
} from "@platform/locales";

export const WEBSITE_CAPABILITIES = [
  "shop",
  "ordering",
  "accounts",
  "wishlist",
  "delivery",
  "pickup",
  "inquiries",
  "downloads",
] as const;
export interface PublicBranch {
  id: string;
  nameEn: string;
  nameAr: string;
  addressEn: string;
  addressAr: string;
  city: string;
  country: string;
  phone: string;
  hoursEn: string;
  hoursAr: string;
  directionsUrl: string;
  latitude: number | null;
  longitude: number | null;
  active: boolean;
  pickup: boolean;
}
export interface WebsiteCommerce {
  version: 1;
  capabilities: Record<(typeof WEBSITE_CAPABILITIES)[number], boolean>;
  search: boolean;
  categories: boolean;
  sorting: boolean;
  pageSize: 12 | 24 | 48;
  branches: PublicBranch[];
  branchSelectionRequired?: boolean;
  orderAttachments?: boolean;
  relatedItems?: boolean;
  inquiryAttachments?: boolean;
  collectCoordinates?: boolean;
  facetLabels?: string[];
  categoryParents?: Record<string, string>;
  orderLayout?: "split" | "stacked";
}
export function defaultWebsiteCommerce(): WebsiteCommerce {
  return {
    version: 1,
    capabilities: Object.fromEntries(
      WEBSITE_CAPABILITIES.map((key) => [key, true]),
    ) as WebsiteCommerce["capabilities"],
    search: true,
    categories: true,
    sorting: true,
    pageSize: 12,
    branches: [],
    branchSelectionRequired: false,
    orderAttachments: true,
    relatedItems: true,
    inquiryAttachments: true,
    collectCoordinates: false,
    facetLabels: [],
    categoryParents: {},
    orderLayout: "split",
  };
}
export function validateWebsiteCommerce(value: unknown): WebsiteCommerce {
  const fail = (): never => {
    throw new Error(formatMessage(serverTemplates.invalid0, { 0: "commerce" }));
  };
  if (!value || typeof value !== "object" || Array.isArray(value))
    return fail();
  const raw = value as WebsiteCommerce;
  if (
    raw.version !== 1 ||
    !raw.capabilities ||
    WEBSITE_CAPABILITIES.some(
      (key) => typeof raw.capabilities[key] !== "boolean",
    ) ||
    [raw.search, raw.categories, raw.sorting].some(
      (v) => typeof v !== "boolean",
    ) ||
    ![12, 24, 48].includes(raw.pageSize) ||
    !Array.isArray(raw.branches) ||
    raw.branches.length > 50
  )
    return fail();
  if (
    raw.branchSelectionRequired !== undefined &&
    typeof raw.branchSelectionRequired !== "boolean"
  )
    return fail();
  if (
    raw.orderLayout !== undefined &&
    !["split", "stacked"].includes(raw.orderLayout)
  )
    return fail();
  if (raw.categoryParents !== undefined) {
    if (
      !raw.categoryParents ||
      typeof raw.categoryParents !== "object" ||
      Array.isArray(raw.categoryParents) ||
      Object.keys(raw.categoryParents).length > 200
    )
      return fail();
    for (const [child, parent] of Object.entries(raw.categoryParents)) {
      if (
        ![child, parent].every(
          (slug) =>
            typeof slug === "string" &&
            /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) &&
            slug.length <= 80 &&
            slug !== "all",
        )
      )
        return fail();
      const path = categoryAncestors(child, raw.categoryParents);
      if (
        path.length > 6 ||
        Object.prototype.hasOwnProperty.call(
          raw.categoryParents,
          path[path.length - 1],
        )
      )
        return fail();
    }
  }
  if (raw.facetLabels !== undefined) {
    if (
      !Array.isArray(raw.facetLabels) ||
      raw.facetLabels.length > 100 ||
      raw.facetLabels.some(
        (label) => typeof label !== "string" || label.length > 200,
      )
    )
      return fail();
    const labels = raw.facetLabels.map((label) => label.trim()).filter(Boolean);
    if (labels.length > 12 || new Set(labels).size !== labels.length)
      return fail();
  }
  if (
    raw.collectCoordinates !== undefined &&
    typeof raw.collectCoordinates !== "boolean"
  )
    return fail();
  if (
    raw.inquiryAttachments !== undefined &&
    typeof raw.inquiryAttachments !== "boolean"
  )
    return fail();
  if (raw.relatedItems !== undefined && typeof raw.relatedItems !== "boolean")
    return fail();
  if (
    raw.orderAttachments !== undefined &&
    typeof raw.orderAttachments !== "boolean"
  )
    return fail();
  const ids = new Set<string>();
  const branches = raw.branches.map((branch) => {
    if (
      !branch ||
      typeof branch !== "object" ||
      !/^[a-z0-9][a-z0-9_-]{0,59}$/.test(branch.id) ||
      ids.has(branch.id) ||
      typeof branch.active !== "boolean" ||
      typeof branch.pickup !== "boolean"
    )
      return fail();
    ids.add(branch.id);
    const text = (key: keyof PublicBranch, max: number, required = false) => {
      const v = branch[key];
      if (typeof v !== "string" || v.length > max || (required && !v.trim()))
        return fail();
      return v.trim();
    };
    const directionsUrl = text("directionsUrl", 2000);
    if (directionsUrl) {
      try {
        if (new URL(directionsUrl).protocol !== "https:") return fail();
      } catch {
        return fail();
      }
    }
    if (
      (branch.latitude === null) !== (branch.longitude === null) ||
      (branch.latitude !== null &&
        (typeof branch.latitude !== "number" ||
          !Number.isFinite(branch.latitude) ||
          Math.abs(branch.latitude) > 90)) ||
      (branch.longitude !== null &&
        (typeof branch.longitude !== "number" ||
          !Number.isFinite(branch.longitude) ||
          Math.abs(branch.longitude) > 180))
    )
      return fail();
    return {
      id: branch.id,
      nameEn: text("nameEn", 120, true),
      nameAr: text("nameAr", 120, true),
      addressEn: text("addressEn", 500, true),
      addressAr: text("addressAr", 500, true),
      city: text("city", 80, true),
      country: text("country", 80, true),
      phone: (() => { const raw = text("phone", 40); const phone = raw ? formatPhoneE164(raw) : ""; if (raw && !phone) throw new Error(serverMessages.invalidPhoneNumber); return phone; })(),
      hoursEn: text("hoursEn", 500),
      hoursAr: text("hoursAr", 500),
      directionsUrl,
      latitude: branch.latitude,
      longitude: branch.longitude,
      active: branch.active,
      pickup: branch.pickup,
    };
  });
  return {
    version: 1,
    capabilities: Object.fromEntries(
      WEBSITE_CAPABILITIES.map((key) => [key, raw.capabilities[key]]),
    ) as WebsiteCommerce["capabilities"],
    search: raw.search,
    categories: raw.categories,
    sorting: raw.sorting,
    pageSize: raw.pageSize,
    branches,
    branchSelectionRequired:
      raw.branchSelectionRequired === true || branches.length > 0,
    ...(raw.orderAttachments !== undefined
      ? { orderAttachments: raw.orderAttachments }
      : {}),
    ...(raw.relatedItems !== undefined
      ? { relatedItems: raw.relatedItems }
      : {}),
    ...(raw.inquiryAttachments !== undefined
      ? { inquiryAttachments: raw.inquiryAttachments }
      : {}),
    ...(raw.collectCoordinates !== undefined
      ? { collectCoordinates: raw.collectCoordinates }
      : {}),
    ...(raw.categoryParents !== undefined
      ? { categoryParents: { ...raw.categoryParents } }
      : {}),
    ...(raw.orderLayout !== undefined ? { orderLayout: raw.orderLayout } : {}),
    ...(raw.facetLabels !== undefined
      ? {
          facetLabels: raw.facetLabels
            .map((label) => label.trim())
            .filter(Boolean),
        }
      : {}),
  };
}

export function selectedPickupBranch(
  commerce: WebsiteCommerce,
  id?: string | null,
): PublicBranch | null {
  if (!commerce.branches.length && !commerce.branchSelectionRequired && !id)
    return null;
  const branch = commerce.branches.find(
    (branch) => branch.id === id && branch.active && branch.pickup,
  );
  if (!branch) throw new Error(serverMessages.pickupBranchUnavailable);
  return { ...branch };
}

export function categoryAncestors(
  slug: string,
  parents: Record<string, string> = {},
) {
  const path: string[] = [];
  while (slug && path.length <= 200 && !path.includes(slug)) {
    path.push(slug);
    slug = Object.prototype.hasOwnProperty.call(parents, slug)
      ? parents[slug]
      : "";
  }
  return path;
}

export function pickupAvailable(commerce: WebsiteCommerce) {
  return (
    commerce.capabilities.pickup &&
    ((!commerce.branches.length && !commerce.branchSelectionRequired) ||
      commerce.branches.some((branch) => branch.active && branch.pickup))
  );
}
