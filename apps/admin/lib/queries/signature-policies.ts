import { serverMessages } from "@platform/locales";
import { listTableRows, upsertTableRow } from "../api/tables";
import {
  DEFAULT_SIGNATURE_MODES,
  SIGNATURE_DOCUMENTS,
  SIGNATURE_MODES,
  type SignatureMode,
} from "../constants/signatures";
import { validateSignatureImage } from "../services/signature-image";

export async function getSignatureMode(
  documentType: string,
): Promise<SignatureMode> {
  const rows = await listTableRows<any>("system", "signature_policy").catch(() => []);
  const row = rows.find((r) => r.documentType === documentType);
  if (row) return row.mode === "live" ? "live" : "stored";
  return (
    (DEFAULT_SIGNATURE_MODES as Record<string, SignatureMode>)[documentType] ??
    "stored"
  );
}

export async function listSignaturePolicies(): Promise<
  Array<{ documentType: string; mode: SignatureMode }>
> {
  const rows = await listTableRows<any>("system", "signature_policy").catch(() => []);
  return SIGNATURE_DOCUMENTS.map((documentType) => ({
    documentType,
    mode:
      (rows.find((r) => r.documentType === documentType)
        ?.mode as SignatureMode) ?? DEFAULT_SIGNATURE_MODES[documentType],
  }));
}

export async function setSignaturePolicy(
  documentType: string,
  mode: string,
  actorId: string,
) {
  if (!(SIGNATURE_DOCUMENTS as readonly string[]).includes(documentType))
    throw new Error(serverMessages.unknownDocumentType);
  if (!(SIGNATURE_MODES as readonly string[]).includes(mode))
    throw new Error(serverMessages.chooseHowTheDocumentIsSigned);
  const rows = await listTableRows<any>("system", "signature_policy").catch(() => []);
  const existing = rows.find((r) => r.documentType === documentType);
  return upsertTableRow("system", "signature_policy", {
    ...(existing || {}),
    id: existing?.id ?? crypto.randomUUID(),
    documentType,
    mode,
    updatedById: actorId,
  });
}

export async function resolveSigningSignature(
  documentType: string,
  signerId: string,
  drawn?: string | null,
): Promise<string> {
  const mode = await getSignatureMode(documentType);
  if (drawn) {
    validateSignatureImage(drawn);
    return drawn;
  }
  if (mode === "live")
    throw new Error(serverMessages.thisDocumentMustBeSignedNowDraw);
  const users = await listTableRows<any>("identity", "user");
  const signer = users.find((u) => u.id === signerId);
  if (!signer?.signatureUrl)
    throw new Error(serverMessages.addYourSignatureOnYourProfileIt);
  return signer.signatureUrl;
}
