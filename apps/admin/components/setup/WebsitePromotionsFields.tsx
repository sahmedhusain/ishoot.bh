"use client";
import { Input, Select, Textarea } from "@platform/ui";
import type { WebsitePromotion } from "@platform/database/constants/website-promotions";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { AssetUrlInput } from "../shared/AssetUrlInput";

export function WebsitePromotionsFields({
  promotions,
  onChange,
}: {
  promotions: WebsitePromotion[];
  onChange: (promotions: WebsitePromotion[]) => void;
}) {
  const { t, locale } = useAdminLocale();
  const copy = t.setupWizard.website.promotions;
  const patch = (index: number, values: Partial<WebsitePromotion>) =>
    onChange(
      promotions.map((promo, i) =>
        i === index ? { ...promo, ...values } : promo,
      ),
    );
  const names = {
    titleEn: copy.titleEn,
    titleAr: copy.titleAr,
    textEn: copy.textEn,
    textAr: copy.textAr,
    labelEn: copy.labelEn,
    labelAr: copy.labelAr,
    url: copy.url,
    category: copy.category,
    couponCode: copy.couponCode,
  };
  return (
    <section className="rounded-xl border border-outline-variant p-4 sm:p-5 space-y-4">
      <h3 className="font-bold">
        {copy.title}
      </h3>
      <p className="text-sm text-ink-muted">
        {copy.hint}
      </p>
      {promotions.map((promo, index) => (
        <details
          key={index}
          className="rounded-lg border border-outline-variant p-4"
        >
          <summary className="font-medium cursor-pointer">
            {(locale === "ar" ? promo.titleAr : promo.titleEn) || `${index + 1}`}
          </summary>
          <div className="grid gap-3 sm:grid-cols-2 mt-4">
            {(Object.keys(names) as (keyof typeof names)[]).map((key) => (
              <label key={key} className="space-y-1 text-sm">
                <span>{names[key]}</span>
                {key.startsWith("text") ? (
                  <Textarea
                    maxLength={1000}
                    value={promo[key]}
                    onChange={(e) => patch(index, { [key]: e.target.value })}
                  />
                ) : (
                  <Input
                    value={promo[key]}
                    maxLength={key === "url" ? 2000 : 200}
                    onChange={(e) => patch(index, { [key]: e.target.value })}
                  />
                )}
              </label>
            ))}
            <div className="space-y-1 text-sm">
              <span>{copy.image}</span>
              <AssetUrlInput
                resource="banners"
                value={promo.imageUrl}
                onChange={(imageUrl) => patch(index, { imageUrl })}
              />
            </div>
            <label className="space-y-1 text-sm">
              <span>{copy.placement}</span>
              <Select
                value={promo.placement}
                onChange={(e) =>
                  patch(index, {
                    placement: e.target.value as WebsitePromotion["placement"],
                  })
                }
              >
                <option value="home">{copy.placementHome}</option>
                <option value="catalogue">{copy.placementCatalogue}</option>
                <option value="both">{copy.placementBoth}</option>
              </Select>
            </label>
            {(["startsAt", "endsAt"] as const).map((key) => (
              <label key={key} className="space-y-1 text-sm">
                <span>
                  {key === "startsAt"
                    ? copy.startsAt
                    : copy.endsAt}
                </span>
                <Input
                  type="datetime-local"
                  value={promo[key].slice(0, 16)}
                  onChange={(e) =>
                    patch(index, {
                      [key]: e.target.value ? `${e.target.value}:00.000Z` : "",
                    })
                  }
                />
              </label>
            ))}
            <button
              type="button"
              className="text-sm text-m3-error text-start py-2"
              onClick={() => onChange(promotions.filter((_, i) => i !== index))}
            >
              {copy.remove}
            </button>
          </div>
        </details>
      ))}
      <button
        type="button"
        className="rounded-lg border border-outline-variant px-4 py-2 text-sm"
        disabled={promotions.length >= 30}
        onClick={() =>
          onChange([
            ...promotions,
            {
              titleEn: "",
              titleAr: "",
              textEn: "",
              textAr: "",
              labelEn: "",
              labelAr: "",
              url: "",
              imageUrl: "",
              placement: "both",
              category: "",
              couponCode: "",
              startsAt: "",
              endsAt: "",
            },
          ])
        }
      >
        {copy.add}
      </button>
    </section>
  );
}
