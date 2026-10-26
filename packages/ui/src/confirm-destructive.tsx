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
  description: React.ReactNode;
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
    <Modal isOpen={isOpen} onClose={onClose} title={title} busy={isSubmitting || loading} description={description} className="max-w-lg" footer={
      <div className="flex flex-wrap items-center justify-end gap-3">
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
    }>
      <div data-confirm-dialog className="space-y-4 text-sm text-ink-muted">
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

      </div>
    </Modal>
  );
}

interface ConfirmationRequest {
  description: string;
  onConfirm: () => Promise<unknown> | unknown;
  title?: string;
  confirmMatchText?: string;
  variant?: "danger" | "warning";
}

const ConfirmationContext = React.createContext<((request: ConfirmationRequest) => void) | null>(null);

/** Shared confirmation host for actions in lists and menus. */
export function ConfirmationProvider({ children }: { children: React.ReactNode }) {
  const copy = useUiCopy();
  const [request, setRequest] = React.useState<ConfirmationRequest | null>(null);
  const confirm = React.useCallback((next: ConfirmationRequest) => setRequest(current => current ?? next), []);
  return (
    <ConfirmationContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        isOpen={request !== null}
        title={request?.title ?? copy.confirm}
        description={request?.description ?? ""}
        confirmMatchText={request?.confirmMatchText}
        variant={request?.variant}
        onClose={() => setRequest(null)}
        onConfirm={async () => { await request?.onConfirm(); }}
      />
    </ConfirmationContext.Provider>
  );
}

export function useConfirmation() {
  const confirm = React.useContext(ConfirmationContext);
  if (!confirm) throw new Error();
  return confirm;
}
