"use client";

import * as React from "react";
import { Button, Modal } from "@platform/ui";
import { useAdminLocale } from "../../hooks/useAdminLocale";

export function QuotationActionDialog({
  open,
  title,
  description,
  confirmLabel,
  confirmVariant = "primary",
  busy = false,
  confirmDisabled,
  onConfirm,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel: string;
  confirmVariant?: "primary" | "danger";
  busy?: boolean;
  confirmDisabled?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
  children?: React.ReactNode;
}) {
  const { t } = useAdminLocale();
  return (
    <Modal closeLabel={t.actions.close} isOpen={open} onClose={onClose} title={title} description={description} busy={busy} className="max-w-md" footer={
      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>{t.actions.cancel}</Button>
        <Button type="button" onClick={onConfirm} disabled={busy || confirmDisabled} variant={confirmVariant}>{busy ? t.actions.saving : confirmLabel}</Button>
      </div>
    }>
      <div className="space-y-4">{children}</div>
    </Modal>
  );
}
