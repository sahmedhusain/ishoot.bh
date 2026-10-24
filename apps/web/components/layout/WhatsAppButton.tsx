"use client";

import { MessageCircle } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";

/** A floating chat button, shown when the website settings ask for it and the company has a WhatsApp number. */
export function WhatsAppButton({ phone }: { phone: string }) {
  const { t } = useTranslation();
  const number = phone.replace(/\D/g, "");
  if (!number) return null;
  return (
    <a
      href={`https://wa.me/${number}`}
      target="_blank"
      rel="noreferrer"
      aria-label={t("contact.chatWhatsapp")}
      title={t("contact.chatWhatsapp")}
      className="fixed bottom-5 end-5 z-[90] flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/30 transition-transform duration-150 hover:scale-105 focus-visible:outline-offset-4"
      data-testid="whatsapp-button"
    >
      <MessageCircle className="h-6 w-6" />
    </a>
  );
}
