"use client";

import * as React from "react";
import { Button } from "@ishoot/ui";
import { Mail, MessageCircle, Printer, Download, Check } from "lucide-react";
import { usePermissions } from "../../hooks/usePermissions";
import { useAdminLocale } from "../../hooks/useAdminLocale";

interface DeliveryToolbarProps {
  documentType: "invoice" | "receipt";
  documentNumber: string;
  companyName: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  amountFormatted: string;
  onSendEmail?: () => Promise<{ status: "sent" | "queued" | "failed" }>;
  className?: string;
}

export function DeliveryToolbar({
  documentType,
  documentNumber,
  companyName,
  clientName,
  clientEmail,
  clientPhone,
  amountFormatted,
  onSendEmail,
  className = "",
}: DeliveryToolbarProps) {
  const { t, locale } = useAdminLocale();
  const { can } = usePermissions();
  const canExport = can(
    documentType === "invoice" ? "invoices" : "payments",
    "export",
  );
  const [emailSending, setEmailSending] = React.useState(false);
  const [emailSent, setEmailSent] = React.useState(false);

  const handleEmail = async () => {
    if (!canExport) return;
    if (onSendEmail) {
      setEmailSending(true);
      try {
        const result = await onSendEmail();
        setEmailSent(result.status === "sent");
        setTimeout(() => setEmailSent(false), 3000);
      } catch (err) {
        console.error(err);
      } finally {
        setEmailSending(false);
      }
    } else {
      const docLabel =
        documentType === "invoice"
          ? t.deliveryToolbar.invoice
          : t.deliveryToolbar.receipt;
      const subject = encodeURIComponent(
        `${docLabel} ${documentNumber} - ${companyName}`,
      );
      const body = encodeURIComponent(
        (t.deliveryToolbar.emailBody ?? "")
          .replace("{clientName}", clientName)
          .replace("{docLabel}", docLabel)
          .replace("{documentNumber}", documentNumber)
          .replace("{amountFormatted}", amountFormatted),
      );
      window.open(
        `mailto:${encodeURIComponent(clientEmail ?? "")}?subject=${subject}&body=${body}`,
      );
    }
  };

  const handleWhatsApp = () => {
    if (!canExport) return;
    const cleanPhone = (clientPhone ?? "").replace(/[^0-9]/g, "");
    const docLabel =
      documentType === "invoice"
        ? t.deliveryToolbar.invoice
        : t.deliveryToolbar.receipt;

    const message = encodeURIComponent(
      (t.deliveryToolbar.whatsappBody ?? "")
        .replace("{clientName}", clientName)
        .replace("{docLabel}", docLabel)
        .replace("{documentNumber}", documentNumber)
        .replace("{amountFormatted}", amountFormatted),
    );
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${message}`
      : `https://wa.me/?text=${message}`;

    window.open(waUrl, "_blank");
  };

  const handlePrint = () => {
    if (canExport) window.print();
  };

  const handleDownloadPdf = () => {
    if (!canExport) return;
    const downloadUrl = `/api/documents/${encodeURIComponent(documentNumber)}/pdf?type=${documentType}&download=true&locale=${locale}`;
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `${documentType}-${documentNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      data-delivery-toolbar
      className={`flex flex-wrap items-center gap-3 p-4 bg-[#0B1210] border border-white/10 rounded-2xl shadow-xl ${className}`}
    >
      <Button
        variant={emailSent ? "secondary" : "primary"}
        size="sm"
        disabled={emailSending || !canExport || (!clientEmail && !onSendEmail)}
        onClick={handleEmail}
        className="gap-2"
      >
        {emailSent ? (
          <Check className="w-4 h-4 text-emerald-400" />
        ) : (
          <Mail className="w-4 h-4" />
        )}
        <span>
          {emailSending
            ? t.deliveryToolbar.dispatching
            : emailSent
              ? t.deliveryToolbar.dispatched
              : onSendEmail
                ? t.deliveryToolbar.sendEmail
                : t.deliveryToolbar.composeEmail}
        </span>
      </Button>

      <Button
        variant="secondary"
        size="sm"
        disabled={!canExport || !clientPhone}
        onClick={handleWhatsApp}
        className="gap-2 hover:border-[#25D366]/40 hover:text-[#25D366]"
      >
        <MessageCircle className="w-4 h-4 text-[#25D366]" />
        <span>{t.deliveryToolbar.sendWhatsApp}</span>
      </Button>

      <Button
        variant="secondary"
        size="sm"
        disabled={!canExport}
        onClick={handlePrint}
        className="gap-2"
      >
        <Printer className="w-4 h-4 text-[#9EADA9]" />
        <span>{t.deliveryToolbar.printDocument}</span>
      </Button>

      <Button
        variant="secondary"
        size="sm"
        disabled={!canExport}
        onClick={handleDownloadPdf}
        className="gap-2"
      >
        <Download className="w-4 h-4 text-[#9EADA9]" />
        <span>{t.deliveryToolbar.savePdf}</span>
      </Button>
    </div>
  );
}
