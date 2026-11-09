"use client";

import { WebUnifiedErrorPage } from "../components/shared/WebUnifiedErrorPage";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <WebUnifiedErrorPage error={error} reset={reset} />;
}
