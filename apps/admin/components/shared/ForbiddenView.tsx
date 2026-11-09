"use client";

import { AdminErrorPage } from "./AdminErrorPage";

export function ForbiddenView({ message }: { message?: string } = {}) {
  return <AdminErrorPage statusCode={403} message={message} />;
}
