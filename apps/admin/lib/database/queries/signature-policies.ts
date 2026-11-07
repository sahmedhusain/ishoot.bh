import { serverMessages } from "@platform/locales";
import { db } from "../atomic";
import {
  DEFAULT_SIGNATURE_MODES,
  SIGNATURE_DOCUMENTS,
  SIGNATURE_MODES,
  type SignatureMode,
} from "../constants/signatures";
import { validateSignatureImage } from "../services/signature-image";

/** How a document type is signed; documents without a policy are signed with the stored signature. */
export async function getSignatureMode(
  documentType: string,
): Promise<SignatureMode> {
  const row = await db.signaturePolicy.findUnique({
    where: { documentType },
    select: { mode: true },
  });
  if (row) return row.mode === "live" ? "live" : "stored";
  return (
    (DEFAULT_SIGNATURE_MODES as Record<string, SignatureMode>)[documentType] ??
    "stored"
  );
}

export async function listSignaturePolicies(): Promise<
  Array<{ documentType: string; mode: SignatureMode }>
> {
  const rows = await db.signaturePolicy.findMany();
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
  return db.signaturePolicy.upsert({
    where: { documentType },
    update: { mode, updatedById: actorId },
    create: { documentType, mode, updatedById: actorId },
  });
}

/**
 * The signature to put on a document: one drawn now (required when the policy is "live"), otherwise the
 * signer's approved saved signature. Returned as an address the PDF can print (stored file or PNG data URL).
 */
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
  const signer = await db.user.findUniqueOrThrow({
    where: { id: signerId },
    select: { signatureUrl: true },
  });
  if (!signer.signatureUrl)
    throw new Error(serverMessages.addYourSignatureOnYourProfileIt);
  return signer.signatureUrl;
}
