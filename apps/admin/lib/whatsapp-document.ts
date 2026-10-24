import { serverMessages } from "@platform/locales";
// Upload private PDF bytes to Meta; never expose an authenticated document URL publicly.
export async function sendWhatsAppDocument(
  input: {
    phoneId: string;
    token: string;
    recipient: string;
    filename: string;
    pdf: Buffer;
    version?: string;
  },
  transport: typeof fetch = fetch,
) {
  const version = input.version || "v23.0";
  if (
    !/^v\d+\.0$/.test(version) ||
    !/^\d+$/.test(input.phoneId) ||
    !/^[1-9]\d{6,14}$/.test(input.recipient)
  )
    throw new Error(serverMessages.invalidWhatsappConfigurationOrRecipient);
  const endpoint = `https://graph.facebook.com/${version}/${input.phoneId}`;
  const headers = { Authorization: `Bearer ${input.token}` };
  const media = new FormData();
  media.set("messaging_product", "whatsapp");
  media.set("type", "application/pdf");
  media.set(
    "file",
    new Blob([new Uint8Array(input.pdf)], { type: "application/pdf" }),
    input.filename,
  );
  const upload = await transport(`${endpoint}/media`, {
    method: "POST",
    headers,
    body: media,
    signal: AbortSignal.timeout(15000),
  });
  const uploaded = await upload.json();
  if (!upload.ok || typeof uploaded.id !== "string")
    throw new Error(serverMessages.whatsappPdfUploadFailed);
  const response = await transport(`${endpoint}/messages`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: input.recipient,
      type: "document",
      document: { id: uploaded.id, filename: input.filename },
    }),
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json();
  if (!response.ok || typeof result.messages?.[0]?.id !== "string")
    throw new Error(
      "WhatsApp did not accept the document. Check the recipient conversation window or approved template requirements.",
    );
  return { messageId: result.messages[0].id as string };
}
