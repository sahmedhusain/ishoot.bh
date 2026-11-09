import { MapPin, ArrowUpRight } from "lucide-react";
import { getTranslations } from "@platform/locales";
import type { PublicBranch } from "@platform/database/constants/website-commerce";

export function branchDirections(branch: PublicBranch) {
  return (
    branch.directionsUrl ||
    (branch.latitude !== null && branch.longitude !== null
      ? `https://www.google.com/maps/dir/?api=1&destination=${branch.latitude},${branch.longitude}`
      : "")
  );
}
export function BranchLocations({
  branches,
  locale,
  title,
}: {
  title?: string;
  branches: PublicBranch[];
  locale: string;
}) {
  const ar = locale === "ar";
  const t = getTranslations(locale as "en" | "ar");
  const visible = branches.filter((branch) => branch.active);
  if (!visible.length) return null;
  return (
    <section
      className="shell pb-16 space-y-6"
      aria-labelledby="branch-locations"
    >
      <h2
        id="branch-locations"
        className="font-display text-2xl sm:text-3xl font-bold"
      >
        {title || t.contact.ourLocations}
      </h2>
      <div className="grid gap-5 md:grid-cols-2">
        {visible.map((branch) => (
          <article
            key={branch.id}
            className="rounded-brand bg-m3-surface-container-low p-6 space-y-3"
          >
            <h3 className="flex gap-2 items-center text-xl font-semibold">
              <MapPin aria-hidden="true" className="h-5 w-5 text-m3-primary" />
              <bdi>{ar ? branch.nameAr : branch.nameEn}</bdi>
            </h3>
            <address className="not-italic text-ink-muted whitespace-pre-line">
              {ar ? branch.addressAr : branch.addressEn}
              <br />
              {branch.city}, {branch.country}
            </address>
            {(ar ? branch.hoursAr : branch.hoursEn) && (
              <p className="text-sm text-ink-muted whitespace-pre-line">
                {ar ? branch.hoursAr : branch.hoursEn}
              </p>
            )}
            {branch.phone && (
              <a
                className="block text-start text-m3-primary min-h-11 py-2"
                href={`tel:${branch.phone.replace(/[^+\d]/g, "")}`}
              >
                <bdi dir="ltr">{branch.phone}</bdi>
              </a>
            )}
            {branchDirections(branch) && (
              <a
                href={branchDirections(branch)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 min-h-11 font-semibold text-m3-primary"
              >
                {t.contact.directions}
                <ArrowUpRight
                  className="h-4 w-4 rtl:-scale-x-100"
                  aria-hidden="true"
                />
              </a>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
