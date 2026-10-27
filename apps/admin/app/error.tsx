"use client";
import { useAdminLocale } from "../hooks/useAdminLocale";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useAdminLocale();
  return (
    <main
      role="alert"
      className="mx-auto max-w-xl space-y-4 p-8 text-ink dark:text-ink"
    >
      <h1 className="text-xl font-semibold">
        {t.copy.errorTitle}
      </h1>
      <p>
        {t.copy.errorDescription}
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg bg-emerald-900 px-4 py-2 text-white"
      >
        {t.copy.retry}
      </button>
    </main>
  );
}
