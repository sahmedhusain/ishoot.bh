"use client";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main
      role="alert"
      className="mx-auto max-w-xl space-y-4 p-8 text-slate-900 dark:text-white"
    >
      <h1 className="text-xl font-semibold">
        Data is temporarily unavailable / البيانات غير متاحة مؤقتًا
      </h1>
      <p>
        The records could not be loaded. Retry to refresh the page. / تعذر تحميل
        السجلات. أعد المحاولة لتحديث الصفحة.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg bg-emerald-900 px-4 py-2 text-white"
      >
        Retry / إعادة المحاولة
      </button>
    </main>
  );
}
