"use client";
import { useTranslation } from "../hooks/useTranslation";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();
  return (
    <main role="alert" className="mx-auto max-w-xl space-y-4 p-8">
      <h1 className="text-xl font-semibold">
        {t("common.errorTitle")}
      </h1>
      <p>{t("common.errorDescription")}</p>
      <button
        type="button"
        onClick={reset}
        className="min-h-11 rounded-lg bg-m3-primary px-4 py-2 text-m3-on-primary"
      >
        {t("common.retry")}
      </button>
    </main>
  );
}
