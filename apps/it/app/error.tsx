"use client";

import { ItUnifiedErrorPage } from "../components/ItUnifiedErrorPage";

export default function ItErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string; status?: number; statusCode?: number };
  reset: () => void;
}) {
  return <ItUnifiedErrorPage error={error} reset={reset} />;
}
