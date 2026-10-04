"use client";

import { Modal,Button } from "@ishoot/ui";
import { ArrowRight,CheckCircle2,AlertCircle,Loader2 } from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";

export interface FieldChange {
  field: string;
  label: string;
  oldValue: any;
  newValue: any;
}

interface EditConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  description?: string;
  changes: FieldChange[];
  isSaving?: boolean;
}

function formatValue(val: any): string {
  if (val === null || val === undefined || val === "") return "—";
  if (typeof val === "boolean") return val ? "Yes / نعم" : "No / لا";
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
}: EditConfirmModalProps) {
  const { isRTL } = useAdminLocale();

  const filteredChanges = changes.filter(
    (c) => formatValue(c.oldValue) !== formatValue(c.newValue)
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        title ||
        (isRTL ? "تأكيد التعديلات والتغييرات" : "Confirm Changes & Update")
      }
      className="max-w-xl"
    >
      <div className="space-y-5">
        <p className="text-xs text-slate-500 dark:text-[#9EADA9]">
          {description ||
            (isRTL
              ? "يرجى مراجعة التغييرات التالية قبل حفظ التعديل للتأكد من دقة البيانات:"
              : "Please review the modified fields below before committing the changes:")}
        </p>

        {filteredChanges.length > 0 ? (
          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {filteredChanges.map((change, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0B1210] border border-slate-200 dark:border-white/10 space-y-1.5"
              >
                <div className="text-[11px] font-bold text-slate-700 dark:text-[#9EADA9] uppercase tracking-wider">
                  {change.label}
                </div>

                <div className="flex items-center gap-3 text-xs">
                  {/* Old Value */}
                  <div className="flex-1 p-2 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 font-mono text-[11px] truncate line-through opacity-80">
                    {formatValue(change.oldValue)}
                  </div>

                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0 rtl:rotate-180" />

                  {/* New Value */}
                  <div className="flex-1 p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 font-mono text-[11px] font-bold truncate">
                    {formatValue(change.newValue)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 flex items-center gap-2.5 text-amber-800 dark:text-amber-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              {isRTL
                ? "لم يتم تعديل أي حقل عن حالته الأصلية."
                : "No fields have been modified from their original values."}
            </span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSaving}
            className="text-xs"
          >
            {isRTL ? "إلغاء وتراجع" : "Cancel"}
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={onConfirm}
            disabled={isSaving}
            className="gap-2 bg-[#09937F] text-white text-xs shadow-lg shadow-[#09937F]/20"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>
              {isSaving
                ? isRTL
                  ? "جاري الحفظ..."
                  : "Saving..."
                : isRTL
                  ? "تأكيد وحفظ التعديلات"
                  : "Confirm & Save Changes"}
            </span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
