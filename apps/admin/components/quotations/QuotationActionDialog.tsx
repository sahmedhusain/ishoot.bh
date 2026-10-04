"use client";

import * as React from "react";
import { Button, Modal } from "@ishoot/ui";
import { useAdminLocale } from "../../hooks/useAdminLocale";

/** Confirmation dialog shared by every quotation lifecycle step (submit, issue, approve, reject, accept). */
export function QuotationActionDialog({
  open,
  title,
  description,
  confirmLabel,
  confirmClassName,
  confirmDisabled,
  onConfirm,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel: string;
  confirmClassName: string;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  children?: React.ReactNode;
}) {
  const { t } = useAdminLocale();
  return (
    <Modal closeLabel={t.actions.close} isOpen={open} onClose={onClose} title={title} className="max-w-md">
      <div className="space-y-4">
        {description && <div className="text-xs text-slate-500 dark:text-neutral-400 leading-relaxed">{description}</div>}
        {children}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-slate-600 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-md"
          >
            {t.actions.cancel}
          </button>
          <Button
            onClick={onConfirm}
            disabled={confirmDisabled}
            className={`text-white px-4 py-1.5 text-xs rounded-md ${confirmClassName}`}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
