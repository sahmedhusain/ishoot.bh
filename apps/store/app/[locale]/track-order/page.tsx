import { redirect } from "next/navigation";
import { PackageSearch, ShieldCheck, Truck } from "lucide-react";
import { getSite } from "../../../lib/site";
import { pickText } from "@platform/database/constants/languages";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { company } = await getSite();
  const companyName = pickText(company?.company_name_en, company?.company_name_ar, locale);
  const label = locale === "ar" ? "تتبع الطلب" : "Track Order & Delivery SLA";
  return { title: companyName ? `${label} — ${companyName}` : label };
}

export default async function TrackOrderLookupPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  const ar = locale === "ar";
  const token = query.token?.trim();
  if (token) {
    redirect(`/${locale}/track/${encodeURIComponent(token)}`);
  }

  return (
    <div className="bg-m3-surface text-m3-on-surface min-h-[70vh] pb-20">
      <div className="shell pt-6 space-y-8">
        <div className="rounded-3xl border border-m3-outline-variant bg-m3-surface-container-low p-6 sm:p-10 space-y-5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-m3-secondary-container px-3.5 py-1 text-xs font-semibold text-m3-on-secondary-container">
            <PackageSearch className="w-3.5 h-3.5" aria-hidden="true" />
            {ar ? "تتبع الشحنات المباشر" : "LIVE SHIPMENT TRACKING"}
          </span>
          <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight">
            {ar ? "تتبع حالة طلبك" : "Track Your Order"}
          </h1>
          <p className="text-sm sm:text-base text-m3-on-surface-variant">
            {ar
              ? "أدخل رمز التتبع المرسل في بريدك الإلكتروني أو رسالة الطلب لعرض الحالة المحدثة وتفاصيل التوصيل."
              : "Enter your order tracking token from your confirmation email or account dashboard."}
          </p>

          <form
            action={`/${locale}/track-order`}
            method="get"
            className="flex flex-col sm:flex-row gap-3 pt-2"
          >
            <input
              type="text"
              name="token"
              required
              dir="ltr"
              placeholder={ar ? "مثال: trk-1001" : "e.g. trk-1001"}
              aria-label={ar ? "رمز التتبع" : "Tracking token"}
              className="flex-1 h-12 rounded-full border border-m3-outline-variant bg-m3-surface px-5 text-sm text-m3-on-surface focus:outline-none focus:border-m3-primary"
            />
            <button
              type="submit"
              className="h-12 px-6 rounded-full bg-m3-primary text-sm font-bold text-m3-on-primary hover:brightness-95"
            >
              {ar ? "تتبع الآن" : "Track Shipment"}
            </button>
          </form>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-m3-outline-variant bg-m3-surface-container-low p-5 space-y-2">
            <Truck className="w-5 h-5 text-m3-primary" aria-hidden="true" />
            <h2 className="font-display text-base font-bold">
              {ar ? "شركات التوصيل والشحن" : "Shipping Partners"}
            </h2>
            <p className="text-xs text-m3-on-surface-variant">
              {ar
                ? "نفس اليوم داخل البحرين، و1–4 أيام لدول الخليج والعالم عبر Aramex وDHL وNaqel."
                : "Same/next-day within Bahrain; 1–4 business days across GCC & global via Aramex, DHL, and Naqel."}
            </p>
          </div>
          <div className="rounded-2xl border border-m3-outline-variant bg-m3-surface-container-low p-5 space-y-2">
            <ShieldCheck className="w-5 h-5 text-m3-primary" aria-hidden="true" />
            <h2 className="font-display text-base font-bold">
              {ar ? "طلبات الضيوف والأعضاء" : "Guest & Account Orders"}
            </h2>
            <p className="text-xs text-m3-on-surface-variant">
              {ar
                ? "يمكن للضيوف متابعة شحناتهم مباشرة برمز التتبع دون الحاجة لتسجيل الدخول."
                : "Both guest orders and registered customer orders receive instant tracking links upon confirmation."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
