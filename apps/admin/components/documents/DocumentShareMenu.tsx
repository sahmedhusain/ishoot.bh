"use client";

import { formatMessage } from "@platform/locales";
import * as React from "react";
import { Button, FloatingSurface } from "@platform/ui";
import { ChevronDown, Mail, MessageCircle, Send } from "lucide-react";
import { usePermissions } from "../../hooks/usePermissions";
import { useAdminLocale } from "../../hooks/useAdminLocale";

interface DocumentShareMenuProps {
  documentType: "invoice" | "receipt";
  documentNumber: string;
  companyName: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  amountFormatted: string;
  /** Sending to the client is allowed only once the document is approved, signed and stamped. */
  signed: boolean;
}

/** Email and WhatsApp hand-off to the client, opened from the detail header. */
export function DocumentShareMenu({
  documentType,
  documentNumber,
  companyName,
  clientName,
  clientEmail,
  clientPhone,
  amountFormatted,
  signed,
}: DocumentShareMenuProps) {
  const { t } = useAdminLocale();
  const { can } = usePermissions();
  const canExport = can(documentType === "invoice" ? "invoices" : "payments", "export");
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  const docLabel = documentType === "invoice" ? t.deliveryToolbar.invoice : t.deliveryToolbar.receipt;
  const values = { clientName, docLabel, documentNumber, amountFormatted, companyName };

  const handleEmail = () => {
    setOpen(false);
    const subject = encodeURIComponent(
      formatMessage(t.copy.documentSubject, { documentLabel: docLabel, number: documentNumber, companyName }),
    );
    const body = encodeURIComponent(formatMessage(t.deliveryToolbar.emailBody ?? "", values));
    window.open(`mailto:${encodeURIComponent(clientEmail ?? "")}?subject=${subject}&body=${body}`);
  };

  const handleWhatsApp = () => {
    setOpen(false);
    const cleanPhone = (clientPhone ?? "").replace(/[^0-9]/g, "");
    const message = encodeURIComponent(formatMessage(t.deliveryToolbar.whatsappBody ?? "", values));
    window.open(cleanPhone ? `https://wa.me/${cleanPhone}?text=${message}` : `https://wa.me/?text=${message}`, "_blank");
  };

  const item =
    "w-full inline-flex items-center gap-2 rounded-lg px-3 py-2 text-start text-sm text-ink hover:bg-ink/5 disabled:opacity-50 disabled:hover:bg-transparent";
  const blocked = !canExport || !signed;

  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        size="sm"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={!canExport}
        onClick={() => setOpen((value) => !value)}
        className="gap-2"
      >
        <Send className="w-4 h-4" />
        <span>{t.documentDetail.sendToClient}</span>
        <ChevronDown className="w-3.5 h-3.5" aria-hidden />
      </Button>
      {open && (
        <FloatingSurface anchor={triggerRef.current} onClose={() => setOpen(false)} role="menu" className="admin-popover">
          <div className="admin-popover-body space-y-1">
            {!signed && (
              <p className="px-3 py-2 text-xs text-ink-muted max-w-64">{t.signing.signBeforeSending}</p>
            )}
            <button
              role="menuitem"
              type="button"
              className={item}
              disabled={blocked || !clientEmail}
              onClick={handleEmail}
            >
              <Mail className="w-4 h-4 text-ink-muted" aria-hidden />
              {t.deliveryToolbar.composeEmail}
            </button>
            <button
              role="menuitem"
              type="button"
              className={item}
              disabled={blocked || !clientPhone}
              onClick={handleWhatsApp}
            >
              <MessageCircle className="w-4 h-4 text-ink-muted" aria-hidden />
              {t.deliveryToolbar.sendWhatsApp}
            </button>
          </div>
        </FloatingSurface>
      )}
    </>
  );
}
