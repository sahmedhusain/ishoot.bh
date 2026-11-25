import { notFound } from "next/navigation";
import { Check, Package, Truck } from "lucide-react";
import { formatMessage } from "@platform/locales";
import { TRACKING_STEPS, shipmentForTracking } from "@platform/database";
import { requireSiteLanguage, siteTranslations } from "../../../../lib/site";
import { storeEnabled } from "../../../../lib/customer";

export const dynamic = "force-dynamic";

const when = (iso: string, locale: string) => new Date(iso).toLocaleString(locale === "ar" ? "ar-u-nu-latn" : "en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const day = (date: string, locale: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString(locale === "ar" ? "ar-u-nu-latn" : "en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

export default async function TrackPage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { locale, token } = await params;
  await requireSiteLanguage(locale);
  if (!(await storeEnabled())) notFound();
  const [t, shipment] = await Promise.all([siteTranslations(locale), shipmentForTracking(token)]);
  const shell = (children: React.ReactNode) => (
    <div className="bg-m3-surface text-m3-on-surface pb-20">
      <div className="shell page-heading space-y-8">{children}</div>
    </div>
  );
  if (!shipment) return shell(<p className="text-m3-on-surface-variant" role="alert">{t.store.trackNotFound}</p>);
  const reached = shipment.status === "delivered" ? 3 : shipment.status === "out_for_delivery" || shipment.status === "failed" ? 2 : ["packing", "shipped"].includes(shipment.order_status) ? 1 : 0;
  const stopped = ["returned", "cancelled"].includes(shipment.status);
  return shell(
    <>
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-m3-on-surface font-display flex items-center gap-3">
          <Truck className="w-8 h-8 text-m3-primary" aria-hidden="true" />
          {formatMessage(t.store.trackTitle, { number: shipment.number })}
        </h1>
        <p className="text-sm text-m3-on-surface-variant">{formatMessage(t.store.trackOrder, { number: shipment.order_number })}{shipment.area ? ` · ${formatMessage(t.store.trackArea, { area: shipment.area })}` : ""}</p>
      </div>

      {!stopped && (
        <ol className="grid grid-cols-4 gap-2" data-testid="track-steps">
          {TRACKING_STEPS.map((step, index) => (
            <li key={step} aria-current={index === reached ? "step" : undefined} className="space-y-2 text-center">
              <span className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full border ${index <= reached ? "border-m3-primary bg-m3-primary text-m3-on-primary" : "border-m3-outline-variant bg-m3-surface-container-low text-m3-on-surface-variant"}`}>
                {index < reached || (index === reached && step === "delivered") ? <Check className="w-5 h-5" aria-hidden="true" /> : <Package className="w-4 h-4" aria-hidden="true" />}
              </span>
              <span className={`block text-xs ${index <= reached ? "text-m3-on-surface font-semibold" : "text-m3-on-surface-variant"}`}>{t.store.trackSteps[step]}</span>
            </li>
          ))}
        </ol>
      )}

      <div className="rounded-2xl border border-m3-outline-variant bg-m3-surface-container-low p-5 space-y-2 text-sm" data-testid="track-state">
        {shipment.status === "delivered" && shipment.delivered_at ? (
          <p className="text-m3-on-surface font-semibold">{formatMessage(t.store.trackDelivered, { time: when(shipment.delivered_at, locale) })}</p>
        ) : shipment.status === "returned" ? (
          <p className="text-m3-on-surface">{t.store.trackReturned}</p>
        ) : shipment.status === "cancelled" ? (
          <p className="text-m3-on-surface">{t.store.trackCancelled}</p>
        ) : (
          <>
            {shipment.status === "failed" && <p className="text-m3-error font-medium">{formatMessage(t.store.trackFailed, { reason: (t.store.trackReasons as Record<string, string>)[shipment.failure_reason] ?? t.store.trackReasons.other })}</p>}
            <p className="text-m3-on-surface">{shipment.slot ? formatMessage(t.store.trackSlot, { date: day(shipment.slot.date, locale), start: shipment.slot.start, end: shipment.slot.end }) : formatMessage(t.store.trackPromise, { time: when(shipment.promised_by, locale) })}</p>
          </>
        )}
      </div>

      {shipment.agency && (
        <p className="text-sm text-m3-on-surface-variant" data-testid="track-agency">
          {formatMessage(t.store.trackAgency, { agency: shipment.agency.name, number: shipment.agency.tracking_number })}
          {shipment.agency.tracking_link && (
            <>
              {" · "}
              <a href={shipment.agency.tracking_link} target="_blank" rel="noreferrer" className="font-semibold text-m3-primary hover:underline">{formatMessage(t.store.trackAtAgency, { agency: shipment.agency.name })}</a>
            </>
          )}
        </p>
      )}

      <ul className="space-y-1 text-sm text-m3-on-surface-variant">
        {shipment.lines.map((l, index) => <li key={index}>{l.description} × {l.quantity}</li>)}
      </ul>
    </>,
  );
}
