"use client";
import { useUiCopy } from "./copy/use-ui-copy";
import * as React from "react";
import { Modal } from "./modal";
import { Button } from "./button";
import { Input } from "./input";

export interface ConfirmDialogProps {
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
  errorLabel?: string;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmMatchText,
  typePromptLabel,
  confirmLabel,
  cancelLabel,
  loadingLabel,
  loading = false,
  variant = "danger",
  errorLabel,
}: ConfirmDialogProps) {
  const copy = useUiCopy();
  confirmLabel ??= copy.confirm; cancelLabel ??= copy.cancel; loadingLabel ??= copy.loading;
  const inputId = React.useId();
  const [error, setError] = React.useState(false);
  const submitting = React.useRef(false);
  const [typedInput, setTypedInput] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setTypedInput("");
      setError(false);
      submitting.current = false;
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const canConfirm =
    !confirmMatchText || typedInput.trim() === confirmMatchText.trim();

  const handleConfirm = async () => {
    if (!canConfirm || submitting.current || loading) return;
    submitting.current = true;
    setError(false);
    setIsSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      setError(true);
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  };

  const isDanger = variant === "danger";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} closeLabel={cancelLabel} busy={isSubmitting || loading} description={description} className="max-w-lg">
      <div className="space-y-4 text-sm text-ink-muted">
        {confirmMatchText && (
          <div className="space-y-2">
            <label htmlFor={inputId} className="block text-xs text-ink-muted">
              {typePromptLabel || `${copy.typeToConfirm}: ${confirmMatchText}`}
            </label>
            <Input
              id={inputId}
              type="text"
              autoComplete="off"
              disabled={isSubmitting || loading}
              value={typedInput}
              onChange={(e) => setTypedInput(e.target.value)}
              placeholder={confirmMatchText}
              className="font-mono text-xs border-rose-500/40 focus:border-rose-400"
            />
          </div>
        )}

        {error && <p role="alert" className="text-rose-700 dark:text-rose-300">{errorLabel ?? copy.actionFailed}</p>}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-ink/10">
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
            aria-busy={isSubmitting || loading}
            disabled={!canConfirm || isSubmitting || loading}
          >
            {isSubmitting || loading ? loadingLabel : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
