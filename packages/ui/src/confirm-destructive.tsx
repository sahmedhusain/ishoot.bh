import * as React from "react";
import { Modal } from "./modal";
import { Button } from "./button";
import { Input } from "./input";

export interface ConfirmDestructiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description: string;
  confirmMatchText?: string;
  typePromptLabel?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loadingLabel?: string;
  loading?: boolean;
  variant?: "danger" | "warning";
}

export function ConfirmDestructiveModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmMatchText,
  typePromptLabel,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  loadingLabel = "...",
  loading = false,
  variant = "danger",
}: ConfirmDestructiveModalProps) {
  const [typedInput, setTypedInput] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setTypedInput("");
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const canConfirm =
    !confirmMatchText || typedInput.trim() === confirmMatchText.trim();

  const handleConfirm = async () => {
    if (!canConfirm || isSubmitting || loading) return;
    setIsSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDanger = variant === "danger";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} closeLabel={cancelLabel}>
      <div className="space-y-4 text-sm text-[#9EADA9]">
        <div
          className={`p-3.5 rounded-xl border ${
            isDanger
              ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
              : "bg-amber-500/10 border-amber-500/30 text-amber-300"
          }`}
        >
          {description}
        </div>

        {confirmMatchText && (
          <div className="space-y-2">
            <p className="text-xs text-[#9EADA9]">
              {typePromptLabel || confirmMatchText}
            </p>
            <Input
              type="text"
              value={typedInput}
              onChange={(e) => setTypedInput(e.target.value)}
              placeholder={confirmMatchText}
              className="font-mono text-xs border-rose-500/40 focus:border-rose-400"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting || loading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={isDanger ? "danger" : "primary"}
            size="sm"
            onClick={handleConfirm}
            disabled={!canConfirm || isSubmitting || loading}
          >
            {isSubmitting || loading ? loadingLabel : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
