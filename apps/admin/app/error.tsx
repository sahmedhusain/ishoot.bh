"use client";

import { AdminErrorPage } from "../components/shared/AdminErrorPage";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string; status?: number; statusCode?: number };
  reset: () => void;
}) {
  return <AdminErrorPage error={error} reset={reset} />;
}
