import { MapPin, Phone, Clock } from "lucide-react";
import { pickText } from "@platform/database/constants/languages";
import { getSite, siteTranslations } from "../../../lib/site";

export default async function BranchesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [{ config }, t] = await Promise.all([
    getSite(),
    siteTranslations(locale),
  ]);

  const branches = config.commerce.branches.filter((branch) => branch.active);

  return (
    <section className="shell page-heading space-y-10 pb-20">
      <header className="space-y-2 border-b border-m3-outline-variant pb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">
          {t.store.pickupBranch}
        </p>
        <h1 className="text-4xl font-display font-bold text-ink">
          {t.store.branchesTitle}
        </h1>
        <p className="max-w-2xl text-base text-ink-muted">
          {t.store.branchesSubtitle}
        </p>
      </header>

      {branches.length === 0 ? (
        <div className="rounded-2xl border border-m3-outline-variant bg-m3-surface-container-low p-10 text-center text-ink-muted">
          {t.store.noPickupBranch}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 stagger-children">
          {branches.map((branch) => (
            <article
              key={branch.id}
              className="flex flex-col justify-between gap-4 rounded-2xl border border-m3-outline-variant bg-m3-surface-container p-6 shadow-elevation-1"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-bold text-ink">
                    {pickText(branch.nameEn, branch.nameAr, locale)}
                  </h2>
                  {branch.pickup && (
                    <span className="rounded-full bg-m3-primary-container px-2.5 py-1 text-xs font-semibold text-m3-on-primary-container">
                      {t.store.pickupBranch}
                    </span>
                  )}
                </div>
                <p className="flex items-start gap-2 text-sm text-ink-muted">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <span>
                    {pickText(branch.addressEn, branch.addressAr, locale)}
                    {branch.city ? `, ${branch.city}` : ""}
                  </span>
                </p>
                {(branch.hoursEn || branch.hoursAr) && (
                  <p className="flex items-center gap-2 text-xs text-ink-muted">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    <span>{pickText(branch.hoursEn, branch.hoursAr, locale)}</span>
                  </p>
                )}
                {branch.phone && (
                  <p className="flex items-center gap-2 text-xs text-ink-muted">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <bdi>{branch.phone}</bdi>
                  </p>
                )}
              </div>
              {branch.directionsUrl && (
                <a
                  href={branch.directionsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{t.store.directions}</span>
                </a>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
