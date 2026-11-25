"use client";
import type { AdminTranslations } from "../../lib/translations";

import { ConfirmDialog } from "@platform/ui";
import { ArrowRight, AlertCircle } from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";

export interface FieldChange {
  field: string;
  label: string;
  oldValue: unknown;
  newValue: unknown;
}

interface EditConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  description?: string;
  changes: FieldChange[];
  isSaving?: boolean;
  errorLabel?: string;
}

function formatValue(val: unknown, t: AdminTranslations): string {
  if (val === null || val === undefined || val === "") return "—";
  if (typeof val === "boolean") return val ? t.editConfirmModal.yes : t.editConfirmModal.no;
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

export function EditConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  changes,
  isSaving = false,
  errorLabel,
}: EditConfirmModalProps) {
  const { t } = useAdminLocale();

  const filteredChanges = changes.filter(
    (c) => formatValue(c.oldValue, t) !== formatValue(c.newValue, t)
  );

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={title || t.editConfirmModal.confirmChangesAndUpdate}
      variant="warning"
      confirmLabel={t.editConfirmModal.confirmAndSaveChanges}
      cancelLabel={t.editConfirmModal.cancel}
      loadingLabel={t.editConfirmModal.saving}
      loading={isSaving}
      errorLabel={errorLabel}
      description={
        <div className="space-y-5">
          <p className="text-xs text-on-surface-variant">
            {description ||
              (t.editConfirmModal.pleaseReviewTheModifiedFields)}
          </p>

          {filteredChanges.length > 0 ? (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pe-1">
              {filteredChanges.map((change, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant space-y-1.5"
                >
                  <div className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                    {change.label}
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex-1 p-2 rounded-xl bg-m3-error-container/60 border border-m3-error/30 text-m3-on-error-container font-mono text-[11px] min-w-0 break-words line-through opacity-90">
                      {formatValue(change.oldValue, t)}
                    </div>

                    <ArrowRight className="w-3.5 h-3.5 text-on-surface-variant shrink-0 rtl:rotate-180" />

                    <div className="flex-1 p-2 rounded-xl bg-m3-primary-container/60 border border-m3-primary/30 text-m3-on-primary-container font-mono text-[11px] font-bold min-w-0 break-words">
                      {formatValue(change.newValue, t)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-m3-tertiary-container/60 border border-m3-tertiary/30 flex items-center gap-2.5 text-m3-on-tertiary-container text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                {t.editConfirmModal.noFieldsHaveBeenModified}
              </span>
            </div>
          )}

        </div>
      }
    />
  );
}
