"use client";

import { Input, PhoneInput, Select, Textarea } from "@platform/ui";
import {
  WEBSITE_CAPABILITIES,
  type WebsiteCommerce,
  type PublicBranch,
} from "@platform/database/constants/website-commerce";
import { useAdminLocale } from "../../hooks/useAdminLocale";

export function WebsiteCommerceFields({
  commerce,
  onChange,
  categories = [],
}: {
  categories?: { slug: string; name_en: string; name_ar: string }[];
  commerce: WebsiteCommerce;
  onChange: (commerce: WebsiteCommerce) => void;
}) {
  const { t, locale } = useAdminLocale();
  const copy = t.setupWizard.website.commerce;
  const set = (patch: Partial<WebsiteCommerce>) =>
    onChange({ ...commerce, ...patch });
  const labels = copy.capabilities;
  const updateBranch = (id: string, patch: Partial<PublicBranch>) =>
    set({
      branches: commerce.branches.map((branch) =>
        branch.id === id ? { ...branch, ...patch } : branch,
      ),
    });
  return (
    <section
      className="rounded-xl border border-outline-variant p-4 sm:p-5 space-y-5"
      data-testid="website-commerce-fields"
    >
      <div>
        <h3 className="font-bold">
          {copy.title}
        </h3>
        <p className="mt-1 text-sm text-ink-muted">
          {copy.hint}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {WEBSITE_CAPABILITIES.map((key) => (
          <label key={key} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={commerce.capabilities[key]}
              onChange={(e) =>
                set({
                  capabilities: {
                    ...commerce.capabilities,
                    [key]: e.target.checked,
                  },
                })
              }
            />
            {labels[key]}
          </label>
        ))}
      </div>
      <h4 className="font-medium">
        {copy.discoveryTitle}
      </h4>
      <div className="flex flex-wrap gap-4">
        {(["search", "categories", "sorting"] as const).map((key) => (
          <label key={key} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={commerce[key]}
              onChange={(e) => set({ [key]: e.target.checked })}
            />
            {
              {
                search: copy.search,
                categories: copy.categoryFilters,
                sorting: copy.sorting,
              }[key]
            }
          </label>
        ))}
      </div>
      <p className="text-xs text-ink-muted">
        {copy.mapFallbackNotice}
      </p>
      <label className="block text-sm space-y-1">
        <span>
          {copy.facetLabels}
        </span>
        <Textarea
          value={(commerce.facetLabels ?? []).join("\n")}
          onChange={(e) => set({ facetLabels: e.target.value.split("\n") })}
          rows={3}
        />
        <span className="block text-xs text-ink-muted">
          {copy.facetHelp}
        </span>
      </label>
      <label className="block text-sm space-y-1 max-w-xs">
        <span>{copy.orderLayout}</span>
        <Select
          value={commerce.orderLayout ?? "split"}
          onChange={(e) =>
            set({ orderLayout: e.target.value as "split" | "stacked" })
          }
        >
          <option value="split">
            {copy.twoColumns}
          </option>
          <option value="stacked">{copy.singleColumn}</option>
        </Select>
      </label>
      {!!categories.length && (
        <details className="rounded-lg border border-outline-variant p-4 space-y-3">
          <summary className="cursor-pointer font-medium">
            {copy.categoryTree}
          </summary>
          {categories.map((category) => (
            <label key={category.slug} className="block text-sm space-y-1">
              <span>{locale === "ar" ? category.name_ar : category.name_en}</span>
              <Select
                value={commerce.categoryParents?.[category.slug] ?? ""}
                onChange={(e) => {
                  const parents = { ...commerce.categoryParents };
                  if (e.target.value) parents[category.slug] = e.target.value;
                  else delete parents[category.slug];
                  set({ categoryParents: parents });
                }}
              >
                <option value="">
                  {copy.topLevelCategory}
                </option>
                {categories
                  .filter((candidate) => candidate.slug !== category.slug)
                  .map((candidate) => (
                    <option key={candidate.slug} value={candidate.slug}>
                      {locale === "ar" ? candidate.name_ar : candidate.name_en}
                    </option>
                  ))}
              </Select>
            </label>
          ))}
        </details>
      )}
      <label className="block text-sm space-y-1 max-w-xs">
        <span>{copy.itemsPerPage}</span>
        <Select
          value={String(commerce.pageSize)}
          onChange={(e) =>
            set({
              pageSize: Number(e.target.value) as WebsiteCommerce["pageSize"],
            })
          }
        >
          {[12, 24, 48].map((size) => (
            <option key={size}>{size}</option>
          ))}
        </Select>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={commerce.collectCoordinates === true}
          onChange={(e) => set({ collectCoordinates: e.target.checked })}
        />
        {copy.collectCoordinates}
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={commerce.inquiryAttachments !== false}
          onChange={(e) => set({ inquiryAttachments: e.target.checked })}
        />
        {copy.inquiryAttachments}
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={commerce.relatedItems !== false}
          onChange={(e) => set({ relatedItems: e.target.checked })}
        />
        {copy.relatedItems}
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={commerce.orderAttachments !== false}
          onChange={(e) => set({ orderAttachments: e.target.checked })}
        />
        {copy.orderAttachments}
      </label>
      <div className="space-y-3">
        <h4 className="font-medium">{copy.branchesTitle}</h4>
        <p className="text-xs text-ink-muted">
          {copy.branchesHint}
        </p>
        {commerce.branchSelectionRequired &&
          !commerce.branches.some(
            (branch) => branch.active && branch.pickup,
          ) && (
            <p role="status" className="text-sm text-ink-muted">
              {copy.pickupUnavailableWarning}
            </p>
          )}
        {commerce.branches.map((branch) => (
          <details
            key={branch.id}
            className="rounded-lg border border-outline-variant p-3"
          >
            <summary className="cursor-pointer font-medium text-sm">
              {(locale === "ar" ? branch.nameAr : branch.nameEn) || branch.id}
            </summary>
            <div className="grid gap-3 sm:grid-cols-2 mt-4">
              {(
                [
                  "nameEn",
                  "nameAr",
                  "addressEn",
                  "addressAr",
                  "city",
                  "country",
                  "phone",
                  "hoursEn",
                  "hoursAr",
                  "directionsUrl",
                ] as const
              ).map((key) => (
                <label key={key} className="space-y-1 text-sm">
                  <span>
                    {
                      {
                        nameEn: copy.nameEn,
                        nameAr: copy.nameAr,
                        addressEn: copy.addressEn,
                        addressAr: copy.addressAr,
                        city: copy.city,
                        country: copy.country,
                        phone: copy.phone,
                        hoursEn: copy.hoursEn,
                        hoursAr: copy.hoursAr,
                        directionsUrl: copy.directionsUrl,
                      }[key]
                    }
                  </span>
                  {key === "phone" ? (
                    <PhoneInput
                      value={branch.phone}
                      onChange={(phone) => updateBranch(branch.id, { phone })}
                    />
                  ) : (
                    <Input
                      value={branch[key]}
                      maxLength={
                        key === "directionsUrl"
                          ? 2000
                          : key.startsWith("address") || key.startsWith("hours")
                            ? 500
                            : 120
                      }
                      dir={key.endsWith("Ar") ? "rtl" : "ltr"}
                      onChange={(e) =>
                        updateBranch(branch.id, { [key]: e.target.value })
                      }
                    />
                  )}
                </label>
              ))}
              {(["latitude", "longitude"] as const).map((key) => (
                <label key={key} className="space-y-1 text-sm">
                  <span>
                    {key === "latitude"
                      ? copy.latitude
                      : copy.longitude}
                  </span>
                  <Input
                    type="number"
                    step="any"
                    min={key === "latitude" ? -90 : -180}
                    max={key === "latitude" ? 90 : 180}
                    value={branch[key] ?? ""}
                    onChange={(e) =>
                      updateBranch(branch.id, {
                        [key]:
                          e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </label>
              ))}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={branch.active}
                  onChange={(e) =>
                    updateBranch(branch.id, { active: e.target.checked })
                  }
                />
                {copy.active}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={branch.pickup}
                  onChange={(e) =>
                    updateBranch(branch.id, { pickup: e.target.checked })
                  }
                />
                {copy.pickup}
              </label>
              <button
                type="button"
                className="text-sm text-m3-error text-start py-2"
                onClick={() =>
                  set({
                    branches: commerce.branches.filter(
                      (b) => b.id !== branch.id,
                    ),
                  })
                }
              >
                {copy.removeBranch}
              </button>
            </div>
          </details>
        ))}
        <button
          type="button"
          className="rounded-lg border border-outline-variant px-4 py-2 text-sm"
          disabled={commerce.branches.length >= 50}
          onClick={() =>
            set({
              branchSelectionRequired: true,
              branches: [
                ...commerce.branches,
                {
                  id: `branch-${crypto.randomUUID()}`,
                  nameEn: "",
                  nameAr: "",
                  addressEn: "",
                  addressAr: "",
                  city: "",
                  country: "",
                  phone: "",
                  hoursEn: "",
                  hoursAr: "",
                  directionsUrl: "",
                  latitude: null,
                  longitude: null,
                  active: true,
                  pickup: true,
                },
              ],
            })
          }
        >
          {copy.addBranch}
        </button>
      </div>
    </section>
  );
}
