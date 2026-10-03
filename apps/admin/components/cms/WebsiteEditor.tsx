"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type WebsiteConfig,
  defaultWebsitePages,
} from "@ishoot/database/website-config";
import {
  saveWebsiteDraftAction,
  publishWebsiteAction,
  previewWebsiteAction,
  restoreWebsiteAction,
  updateWebsiteServiceAction,
} from "../../app/actions/website";
import { useAdminLocale } from "../../hooks/useAdminLocale";
export function WebsiteEditor({
  config,
  revision,
  publishedAt,
  canRestore,
  services,
}: {
  config: WebsiteConfig;
  revision: number;
  publishedAt?: string;
  canRestore: boolean;
  services: {
    id: string;
    nameEn: string;
    nameAr: string;
    isPublic: boolean;
    imageUrl: string | null;
  }[];
}) {
  const { locale } = useAdminLocale();
  const ar = locale === "ar";
  const router = useRouter();
  const [draft, setDraft] = React.useState(config);
  const [version, setVersion] = React.useState(revision);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");
  const [preview, setPreview] = React.useState("");
  const [dirty, setDirty] = React.useState(false);
  React.useEffect(() => {
    setVersion(revision);
  }, [revision]);
  const field =
    "w-full rounded-lg border border-slate-300 dark:border-neutral-600 bg-transparent p-3 text-sm";
  const button =
    "rounded-lg border border-slate-300 dark:border-neutral-600 px-4 py-2 text-sm disabled:opacity-50";
  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
      router.refresh();
      setMessage(ar ? "تم الحفظ." : "Saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }
  function change(next: WebsiteConfig) {
    setDraft(next);
    setDirty(true);
    setPreview("");
  }
  async function save() {
    const saved = await saveWebsiteDraftAction(draft, version);
    setVersion(saved.revision);
    setDirty(false);
    return saved.revision;
  }
  function move(index: number, direction: number) {
    const sections = [...draft.sections];
    [sections[index], sections[index + direction]] = [
      sections[index + direction],
      sections[index],
    ];
    change({ ...draft, sections });
  }
  const labels: Record<string, string> = ar
    ? {
        about: "نبذة",
        clients: "العملاء",
        services: "الخدمات",
        portfolio: "الأعمال",
        stats: "الأرقام",
        reviews: "التقييمات",
        faq: "الأسئلة",
        cta: "التواصل",
      }
    : {
        about: "About",
        clients: "Clients",
        services: "Services",
        portfolio: "Selected work",
        stats: "Statistics",
        reviews: "Reviews",
        faq: "FAQ",
        cta: "Contact call to action",
      };
  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      <header>
        <Link className="text-sm underline" href="/dashboard/settings/web">
          {ar ? "إعدادات الموقع" : "Website settings"}
        </Link>
        <h1 className="text-2xl font-bold mt-3">
          {ar ? "تحرير ونشر الموقع" : "Website publishing"}
        </h1>
        <p className="text-sm text-slate-500 mt-2">
          {ar
            ? "رتّب الأقسام، حرّر صفحة التواصل، واختر الخدمات العامة. انشر بعد مراجعة المعاينة."
            : "Arrange sections, edit contact content and choose public services. Preview before publishing."}
        </p>
        <p className="text-xs text-slate-500 mt-2">
          {publishedAt
            ? `${ar ? "آخر نشر:" : "Last published:"} ${new Date(publishedAt).toLocaleString()}`
            : ar
              ? "لم يتم إنشاء نسخة منشورة بعد. المحتوى الحالي ظاهر مباشرة."
              : "No published snapshot yet. Existing content is currently live."}
        </p>
      </header>
      <div className="flex flex-wrap gap-3 sticky top-0 z-10 bg-white dark:bg-neutral-900 py-3 border-b border-slate-200 dark:border-neutral-700">
        <button disabled={busy} className={button} onClick={() => run(save)}>
          {ar ? "حفظ المسودة" : "Save draft"}
          {dirty ? " *" : ""}
        </button>
        <button
          disabled={busy}
          className={button}
          onClick={() =>
            run(async () => {
              if (dirty) await save();
              setPreview(await previewWebsiteAction(locale));
            })
          }
        >
          {ar ? "إنشاء رابط معاينة" : "Create preview link"}
        </button>
        <button
          disabled={busy}
          className={`${button} bg-emerald-900 text-white`}
          onClick={() =>
            run(async () => {
              const current = dirty ? await save() : version;
              const result = await publishWebsiteAction(current);
              setVersion(result.revision);
            })
          }
        >
          {ar ? "نشر الموقع" : "Publish website"}
        </button>
        {canRestore && (
          <button
            disabled={busy}
            className={button}
            onClick={() => run(() => restoreWebsiteAction(version))}
          >
            {ar ? "استعادة النشر السابق" : "Restore previous publication"}
          </button>
        )}
      </div>
      {preview && (
        <a
          href={preview}
          target="_blank"
          rel="noreferrer"
          className="block underline text-emerald-700 dark:text-emerald-400"
        >
          {ar
            ? "فتح المعاينة — صالح لعشر دقائق"
            : "Open preview — valid for ten minutes"}
        </a>
      )}
      {error && (
        <p role="alert" className="text-red-700 bg-red-50 p-3 rounded-lg">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-emerald-700 dark:text-emerald-400">
          {message}
        </p>
      )}
      <section className="space-y-4 rounded-xl border border-slate-200 dark:border-neutral-800 p-5 bg-slate-50/50 dark:bg-neutral-900/30">
        <div>
          <h2 className="font-bold text-lg">
            {ar ? "إدارة ظهور صفحات الموقع" : "Public page visibility"}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {ar
              ? "تحكم في إظهار أو إخفاء الصفحات من شريط التنقل والموقع العام (إخفاء الصفحة يحجب الرابط ويزيله من القوائم)."
              : "Control which pages are active and accessible on the public site (hidden pages are removed from navigation and blocked)."}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(draft.pages || defaultWebsitePages).map((p) => {
            const pageLabels: Record<string, { en: string; ar: string; path: string }> = {
              works: { en: "Selected Works", ar: "صفحة الأعمال", path: "/works" },
              about: { en: "About Studio", ar: "صفحة من نحن", path: "/about" },
              contact: { en: "Contact Page", ar: "صفحة التواصل", path: "/contact" },
            };
            const meta = pageLabels[p.id] || { en: p.id, ar: p.id, path: `/${p.id}` };
            return (
              <div
                key={p.id}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                  p.visible
                    ? "border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-500/10"
                    : "border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 opacity-60"
                }`}
              >
                <div>
                  <div className="font-semibold text-sm">
                    {ar ? meta.ar : meta.en}
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">
                    {meta.path}
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={p.visible}
                    onChange={(e) => {
                      const curPages = draft.pages || defaultWebsitePages;
                      const nextPages = curPages.map((item) =>
                        item.id === p.id ? { ...item, visible: e.target.checked } : item,
                      );
                      change({ ...draft, pages: nextPages });
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 dark:bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold text-lg">
          {ar ? "أقسام الصفحة الرئيسية" : "Homepage sections"}
        </h2>
        {draft.sections.map((section, index) => (
          <div
            key={section.id}
            className="flex items-center gap-3 border-b border-slate-200 dark:border-neutral-700 py-3"
          >
            <label className="flex-1 flex items-center gap-3">
              <input
                type="checkbox"
                checked={section.visible}
                onChange={(e) =>
                  change({
                    ...draft,
                    sections: draft.sections.map((s) =>
                      s.id === section.id
                        ? { ...s, visible: e.target.checked }
                        : s,
                    ),
                  })
                }
              />
              {labels[section.id]}
            </label>
            <button
              aria-label={`${ar ? "أعلى" : "Move up"} ${labels[section.id]}`}
              disabled={index === 0}
              className={button}
              onClick={() => move(index, -1)}
            >
              ↑
            </button>
            <button
              aria-label={`${ar ? "أسفل" : "Move down"} ${labels[section.id]}`}
              disabled={index === draft.sections.length - 1}
              className={button}
              onClick={() => move(index, 1)}
            >
              ↓
            </button>
          </div>
        ))}
      </section>
      <section className="space-y-4">
        <h2 className="font-bold text-lg">
          {ar ? "محتوى صفحة التواصل" : "Contact page content"}
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {(
            [
              ["contactTitle", "Title", "العنوان"],
              ["contactIntro", "Introduction", "المقدمة"],
              [
                "hours",
                "Verified opening hours (optional)",
                "ساعات العمل (اختياري)",
              ],
              ["response", "What happens next", "ماذا يحدث بعد الإرسال"],
            ] as const
          ).flatMap(([key, en, arabic]) =>
            (["En", "Ar"] as const).map((lang) => {
              const name = `${key}${lang}` as Exclude<
                keyof WebsiteConfig,
                "sections" | "pages"
              >;
              return (
                <label key={name} className="text-sm space-y-2">
                  <span>
                    {lang === "Ar" ? arabic : en} ({lang})
                  </span>
                  <textarea
                    dir={lang === "Ar" ? "rtl" : "ltr"}
                    rows={3}
                    maxLength={1500}
                    className={field}
                    value={draft[name] ?? ""}
                    onChange={(e) =>
                      change({ ...draft, [name]: e.target.value })
                    }
                  />
                </label>
              );
            }),
          )}
        </div>
      </section>
      <section className="space-y-4">
        <h2 className="font-bold text-lg">
          {ar ? "الخدمات الظاهرة في الموقع" : "Services shown on the website"}
        </h2>
        <p className="text-sm text-slate-500">
          {ar
            ? "الأسماء والأوصاف تُدار من دليل الخدمات. لا تظهر الأسعار الداخلية في الموقع."
            : "Names and descriptions come from the service catalogue. Internal rates are never shown publicly."}{" "}
          <Link href="/dashboard/services" className="underline">
            {ar ? "دليل الخدمات" : "Service catalogue"}
          </Link>
        </p>
        {services.map((service) => (
          <form
            key={`${service.id}-${service.isPublic}-${service.imageUrl}`}
            className="grid sm:grid-cols-[1fr_2fr_auto] gap-3 items-center border-b border-slate-200 dark:border-neutral-700 pb-4"
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              run(() =>
                updateWebsiteServiceAction(
                  service.id,
                  form.get("isPublic") === "on",
                  String(form.get("imageUrl") || ""),
                ),
              );
            }}
          >
            <label className="flex items-center gap-2 text-sm">
              <input
                name="isPublic"
                type="checkbox"
                defaultChecked={service.isPublic}
              />
              {ar ? service.nameAr : service.nameEn}
            </label>
            <input
              aria-label={`${service.nameEn} image URL`}
              className={field}
              name="imageUrl"
              defaultValue={service.imageUrl || ""}
              placeholder={
                ar ? "رابط الصورة (اختياري)" : "Image URL (optional)"
              }
            />
            <button disabled={busy} className={button}>
              {ar ? "حفظ" : "Save"}
            </button>
          </form>
        ))}
      </section>
      <section className="space-y-3">
        <h2 className="font-bold">
          {ar ? "مجموعات المحتوى" : "Content collections"}
        </h2>
        <p className="text-sm text-slate-500">
          {ar
            ? "بعد النشر الأول، تعديلات البنرات والأعمال والشعارات والأسئلة والأرقام تنتظر النشر من هنا. اعتماد التقييمات وبيانات الشركة يبقى مباشراً."
            : "After the first publication, banner, portfolio, logo, FAQ and statistic edits wait for publication here. Review approval and company profile changes remain immediate."}
        </p>
        <div className="flex flex-wrap gap-4">
          {["banners", "portfolio", "clients", "faqs", "stats", "reviews"].map(
            (path) => (
              <Link
                className="underline text-sm"
                key={path}
                href={`/dashboard/cms/${path}`}
              >
                {path}
              </Link>
            ),
          )}
        </div>
      </section>
    </div>
  );
}
