"use client";

import { Toaster } from "sonner";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { useAdminTheme } from "../../hooks/useAdminTheme";

/**
 * Material Design 3 Sonner snackbar host synchronized with active appearance
 * (light/dark) and reading direction (top-left in RTL, top-right in LTR).
 */
export function AdminToaster() {
  const { resolvedTheme } = useAdminTheme();
  const { isRTL } = useAdminLocale();

  return (
    <Toaster
      theme={resolvedTheme}
      dir={isRTL ? "rtl" : "ltr"}
      position={isRTL ? "top-left" : "top-right"}
      closeButton
      richColors
      toastOptions={{
        classNames: {
          toast: "m3-toast",
          title: "m3-toast-title",
          description: "m3-toast-description",
          actionButton: "m3-toast-action",
          cancelButton: "m3-toast-cancel",
          closeButton: "m3-toast-close",
        },
      }}
    />
  );
}
