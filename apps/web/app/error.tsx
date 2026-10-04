"use client";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main role="alert" className="mx-auto max-w-xl space-y-4 p-8">
      <h1 className="text-xl font-semibold">
        Content is temporarily unavailable / المحتوى غير متاح مؤقتًا
      </h1>
      <p>Please try loading this page again. / يرجى إعادة تحميل هذه الصفحة.</p>
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
