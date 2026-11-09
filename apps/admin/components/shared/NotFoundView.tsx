"use client";

import { AdminErrorPage } from "./AdminErrorPage";

export function NotFoundView({ message }: { message?: string } = {}) {
  return <AdminErrorPage statusCode={404} message={message} showQuickLinks={true} />;
}
